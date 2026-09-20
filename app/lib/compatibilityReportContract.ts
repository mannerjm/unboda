import { z } from "zod";
import {
  COMPATIBILITY_RESULT_DOMAINS,
  type CompatibilityResultDomain,
} from "./compatibilityDomainAggregation";
import type {
  CompatibilityTimingEvidence,
  CompatibilityTimingResult,
} from "./compatibilityTiming";
import { getPairCompatibilityConfigByRelationshipType } from "./pairCompatibilityConfig";
import { getWorkplaceRelation, type WorkplaceRelation } from "./workplaceCompatibilityRelation";
import type { CompatibilityPairRelationshipType } from "./specialAnalysisProducts";

export const COMPATIBILITY_REPORT_CONTRACT_VERSION = "compatibility-report-v1" as const;

export const COMPATIBILITY_REPORT_SECTION_ORDER = [
  "relationshipCore",
  "strengths",
  "conflict",
  "recovery",
  "longTerm",
  "currentTiming",
  "actionGuide",
] as const;

export type CompatibilityReportEvidenceFamily =
  | "natal_domain"
  | "natal_relation"
  | "personal_structure"
  | "timing_load"
  | "timing_domain"
  | "timing_relation";

export type CompatibilityReportEvidenceTone =
  | "support"
  | "tension"
  | "mixed"
  | "context";

export type CompatibilityReportEvidenceFact = {
  id: string;
  family: CompatibilityReportEvidenceFamily;
  tone: CompatibilityReportEvidenceTone;
  domains: readonly CompatibilityResultDomain[];
  confidence: number;
  payload: Readonly<Record<string, string | number | boolean | readonly string[] | null>>;
};

export type CompatibilityReportContext = {
  contractVersion: typeof COMPATIBILITY_REPORT_CONTRACT_VERSION;
  roleSemantics: Readonly<{
    A: "user";
    B: "partner";
  }>;
  evaluationYear: number;
  natalDataQuality: CompatibilityTimingResult["base"]["dataQuality"];
  timingDataQuality: CompatibilityTimingResult["timingDataQuality"];
  pairTimingPattern: CompatibilityTimingResult["pairTimingPattern"];
  evidenceFacts: readonly CompatibilityReportEvidenceFact[];
  allowedEvidenceRefs: readonly string[];
};

const EvidenceRefsSchema = z.array(z.string().trim().min(1)).min(1).max(5);

const CompatibilityNarrativeItemSchema = z.object({
  title: z.string().trim().min(2).max(80),
  body: z.string().trim().min(20).max(700),
  evidenceRefs: EvidenceRefsSchema,
});

const CompatibilitySectionSchema = z.object({
  summary: z.string().trim().min(30).max(900),
  keyPoints: z.array(z.string().trim().min(10).max(300)).min(1).max(3),
  evidenceRefs: EvidenceRefsSchema,
});

const CompatibilityActionItemSchema = z.object({
  action: z.string().trim().min(10).max(240),
  reason: z.string().trim().min(15).max(400),
  evidenceRefs: z.array(z.string().trim().min(1)).min(1).max(3),
});

export const CompatibilityReportOutputSchema = z.object({
  relationshipCore: z.object({
    headline: z.string().trim().min(8).max(100),
    summary: z.string().trim().min(40).max(1000),
    evidenceRefs: EvidenceRefsSchema,
  }),
  // Do not force positive copy when the engine does not contain enough support evidence.
  strengths: z.array(CompatibilityNarrativeItemSchema).max(3),
  conflict: CompatibilitySectionSchema,
  recovery: CompatibilitySectionSchema,
  longTerm: CompatibilitySectionSchema,
  currentTiming: z
    .object({
      headline: z.string().trim().min(8).max(100),
      summary: z.string().trim().min(30).max(900),
      keyPoints: z.array(z.string().trim().min(10).max(300)).min(1).max(3),
      evidenceRefs: EvidenceRefsSchema,
    })
    .nullable(),
  actionGuide: z.object({
    doNext: z.array(CompatibilityActionItemSchema).min(2).max(4),
    avoid: z.array(CompatibilityActionItemSchema).min(1).max(3),
  }),
});

export type CompatibilityReportOutput = z.infer<typeof CompatibilityReportOutputSchema>;

const FAMILY_BY_SECTION: Readonly<
  Record<
    Exclude<(typeof COMPATIBILITY_REPORT_SECTION_ORDER)[number], "actionGuide">,
    readonly CompatibilityReportEvidenceFamily[]
  >
> = {
  relationshipCore: ["natal_domain", "natal_relation", "personal_structure"],
  strengths: ["natal_domain", "natal_relation", "personal_structure"],
  conflict: ["natal_domain", "natal_relation", "personal_structure"],
  recovery: ["natal_domain", "natal_relation", "personal_structure"],
  longTerm: ["natal_domain", "natal_relation", "personal_structure"],
  currentTiming: ["timing_load", "timing_domain", "timing_relation"],
};

const FORBIDDEN_VISIBLE_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /\d{1,3}\s*점/u, label: "numeric score" },
  { pattern: /\d{1,3}\s*%/u, label: "numeric percentage" },
  { pattern: /(?:무조건|반드시|확실히|절대로)/u, label: "deterministic claim" },
  { pattern: /(?:헤어진다|이혼한다|결혼한다|결혼하게 된다|파국이다)/u, label: "fixed relationship outcome" },
  { pattern: /\b(?:A|B)\b/u, label: "internal person role" },
  {
    pattern: /\b(?:supportive|adjustment_needed|insufficient_evidence|mutually_supported|jointly_pressured)\b/u,
    label: "internal engine state",
  },
];

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function levelTone(level: string): CompatibilityReportEvidenceTone {
  if (level === "supportive") return "support";
  if (level === "adjustment_needed" || level === "burdensome") return "tension";
  if (level === "mixed") return "mixed";
  return "context";
}

function addFact(
  facts: Map<string, CompatibilityReportEvidenceFact>,
  fact: CompatibilityReportEvidenceFact,
): void {
  const existing = facts.get(fact.id);
  if (!existing) {
    facts.set(fact.id, fact);
    return;
  }

  const domains = [...new Set([...existing.domains, ...fact.domains])].sort() as CompatibilityResultDomain[];
  facts.set(fact.id, {
    ...existing,
    domains,
    confidence: round(Math.max(existing.confidence, fact.confidence)),
  });
}

function addNatalFacts(
  result: CompatibilityTimingResult,
  facts: Map<string, CompatibilityReportEvidenceFact>,
): void {
  for (const domain of COMPATIBILITY_RESULT_DOMAINS) {
    const item = result.base.domains[domain];
    addFact(facts, {
      id: `report:natal-domain:${domain}`,
      family: "natal_domain",
      tone: levelTone(item.level),
      domains: [domain],
      confidence: item.confidence,
      payload: {
        domain,
        level: item.level,
        supportPressure: item.pressure.support,
        tensionPressure: item.pressure.tension,
        mixedPressure: item.pressure.mixed,
        contextPressure: item.pressure.context,
      },
    });

    const signals = [
      ...item.leadingSupport,
      ...item.leadingTension,
      ...item.leadingMixed,
      ...item.leadingContext,
    ];

    for (const signal of signals) {
      addFact(facts, {
        id: `report:natal-relation:${domain}:${signal.evidenceId}`,
        family: "natal_relation",
        tone: signal.tone,
        domains: [domain],
        confidence: item.confidence,
        payload: {
          domain,
          relation: signal.relation,
          kind: signal.kind,
          strength: signal.strength,
          contribution: signal.contribution,
          rawEvidenceId: signal.evidenceId,
        },
      });
    }
  }
}

function structureDirectionId(direction: "AReceivesFromB" | "BReceivesFromA"): string {
  return direction === "AReceivesFromB" ? "B-to-A" : "A-to-B";
}

function addStructureFacts(
  result: CompatibilityTimingResult,
  facts: Map<string, CompatibilityReportEvidenceFact>,
): void {
  for (const direction of ["AReceivesFromB", "BReceivesFromA"] as const) {
    const item = result.base.directionalInfluence[direction];
    const directionId = structureDirectionId(direction);

    addFact(facts, {
      id: `report:structure:${directionId}`,
      family: "personal_structure",
      tone: levelTone(item.level),
      domains: [],
      confidence: item.confidence,
      payload: {
        from: item.from,
        to: item.to,
        level: item.level,
        supportPressure: item.supportPressure,
        burdenPressure: item.burdenPressure,
        neutralPressure: item.neutralPressure,
      },
    });

    for (const element of item.leadingSupport) {
      addFact(facts, {
        id: `report:structure:${directionId}:support:${element.element}`,
        family: "personal_structure",
        tone: "support",
        domains: [],
        confidence: item.confidence,
        payload: {
          from: item.from,
          to: item.to,
          element: element.element,
          providerShare: element.providerShare,
          receiverOwnShare: element.receiverOwnShare,
          usefulnessScore: element.usefulnessScore,
          contribution: element.supportContribution,
        },
      });
    }

    for (const element of item.leadingBurden) {
      addFact(facts, {
        id: `report:structure:${directionId}:burden:${element.element}`,
        family: "personal_structure",
        tone: "tension",
        domains: [],
        confidence: item.confidence,
        payload: {
          from: item.from,
          to: item.to,
          element: element.element,
          providerShare: element.providerShare,
          receiverOwnShare: element.receiverOwnShare,
          usefulnessScore: element.usefulnessScore,
          contribution: element.burdenContribution,
        },
      });
    }
  }
}

function timingEvidenceDomains(
  evidence: CompatibilityTimingEvidence,
): readonly CompatibilityResultDomain[] {
  return evidence.domains;
}

function addTimingLoadFacts(
  result: CompatibilityTimingResult,
  facts: Map<string, CompatibilityReportEvidenceFact>,
): void {
  for (const role of ["A", "B"] as const) {
    const timing = result.individualTiming[role];
    const cycles = timing.cycles.map((cycle) => cycle.cycle);

    addFact(facts, {
      id: `report:timing-load:${role}`,
      family: "timing_load",
      tone: levelTone(timing.level),
      domains: [],
      confidence: timing.confidence,
      payload: {
        person: role,
        level: timing.level,
        cycles,
        supportPressure: timing.supportPressure,
        burdenPressure: timing.burdenPressure,
        neutralPressure: timing.neutralPressure,
      },
    });

    const rankedSignals = [...timing.signals]
      .map((signal) => ({
        ...signal,
        tone: signal.supportContribution > signal.burdenContribution
          ? "support" as const
          : signal.burdenContribution > signal.supportContribution
            ? "tension" as const
            : "context" as const,
        magnitude: Math.max(signal.supportContribution, signal.burdenContribution),
      }))
      .filter((signal) => signal.magnitude > 0)
      .sort((left, right) => right.magnitude - left.magnitude)
      .slice(0, 4);

    for (const signal of rankedSignals) {
      addFact(facts, {
        id: `report:timing-load:${role}:${signal.cycle}:${signal.component}:${signal.element}:${signal.tone}`,
        family: "timing_load",
        tone: signal.tone,
        domains: [],
        confidence: timing.confidence,
        payload: {
          person: role,
          cycle: signal.cycle,
          component: signal.component,
          element: signal.element,
          usefulnessScore: signal.usefulnessScore,
          preference: signal.preference,
          supportContribution: signal.supportContribution,
          burdenContribution: signal.burdenContribution,
        },
      });
    }
  }
}

function addTimingDomainFacts(
  result: CompatibilityTimingResult,
  facts: Map<string, CompatibilityReportEvidenceFact>,
): void {
  for (const domain of COMPATIBILITY_RESULT_DOMAINS) {
    const item = result.relationshipTimingDomains[domain];
    addFact(facts, {
      id: `report:timing-domain:${domain}`,
      family: "timing_domain",
      tone: levelTone(item.level),
      domains: [domain],
      confidence: item.confidence,
      payload: {
        domain,
        level: item.level,
        supportPressure: item.pressure.support,
        tensionPressure: item.pressure.tension,
        mixedPressure: item.pressure.mixed,
        contextPressure: item.pressure.context,
      },
    });
  }
}

function addTimingRelationFacts(
  result: CompatibilityTimingResult,
  facts: Map<string, CompatibilityReportEvidenceFact>,
): void {
  for (const evidence of result.evidence) {
    addFact(facts, {
      id: `report:timing-relation:${evidence.id}`,
      family: "timing_relation",
      tone: evidence.tone,
      domains: timingEvidenceDomains(evidence),
      confidence: round(
        clamp(result.base.dataQuality.score * result.timingDataQuality.score, 0, 1),
      ),
      payload: {
        kind: evidence.kind,
        relation: evidence.relation,
        sourcePerson: evidence.sourcePerson,
        sourceCycle: evidence.sourceCycle,
        targetPerson: evidence.targetPerson,
        targetCycle: evidence.targetCycle ?? null,
        targetPosition: evidence.targetPosition ?? null,
        strength: evidence.strength,
      },
    });
  }
}

export function buildCompatibilityReportContext(
  result: CompatibilityTimingResult,
): CompatibilityReportContext {
  const facts = new Map<string, CompatibilityReportEvidenceFact>();
  addNatalFacts(result, facts);
  addStructureFacts(result, facts);
  addTimingLoadFacts(result, facts);
  addTimingDomainFacts(result, facts);
  addTimingRelationFacts(result, facts);

  const evidenceFacts = [...facts.values()].sort((left, right) => left.id.localeCompare(right.id));

  return {
    contractVersion: COMPATIBILITY_REPORT_CONTRACT_VERSION,
    roleSemantics: { A: "user", B: "partner" },
    evaluationYear: result.evaluationYear,
    natalDataQuality: result.base.dataQuality,
    timingDataQuality: result.timingDataQuality,
    pairTimingPattern: result.pairTimingPattern,
    evidenceFacts,
    allowedEvidenceRefs: evidenceFacts.map((fact) => fact.id),
  };
}

function collectOutputRefs(output: CompatibilityReportOutput): Array<{
  section: (typeof COMPATIBILITY_REPORT_SECTION_ORDER)[number];
  refs: readonly string[];
}> {
  return [
    { section: "relationshipCore", refs: output.relationshipCore.evidenceRefs },
    ...output.strengths.map((item) => ({ section: "strengths" as const, refs: item.evidenceRefs })),
    { section: "conflict", refs: output.conflict.evidenceRefs },
    { section: "recovery", refs: output.recovery.evidenceRefs },
    { section: "longTerm", refs: output.longTerm.evidenceRefs },
    ...(output.currentTiming
      ? [{ section: "currentTiming" as const, refs: output.currentTiming.evidenceRefs }]
      : []),
    ...output.actionGuide.doNext.map((item) => ({ section: "actionGuide" as const, refs: item.evidenceRefs })),
    ...output.actionGuide.avoid.map((item) => ({ section: "actionGuide" as const, refs: item.evidenceRefs })),
  ];
}

function collectVisibleStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((item) => collectVisibleStrings(item));
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "evidenceRefs")
      .flatMap(([, item]) => collectVisibleStrings(item));
  }
  return [];
}

export function validateCompatibilityReportOutput(
  candidate: unknown,
  context: CompatibilityReportContext,
): CompatibilityReportOutput {
  const output = CompatibilityReportOutputSchema.parse(candidate);
  const factById = new Map(context.evidenceFacts.map((fact) => [fact.id, fact] as const));

  if (context.timingDataQuality.level === "unavailable" && output.currentTiming !== null) {
    throw new Error("Compatibility report cannot describe current timing when timing data is unavailable");
  }
  if (context.timingDataQuality.level !== "unavailable" && output.currentTiming === null) {
    throw new Error("Compatibility report must include current timing when timing data is available");
  }

  for (const group of collectOutputRefs(output)) {
    for (const ref of group.refs) {
      const fact = factById.get(ref);
      if (!fact) {
        throw new Error(`Compatibility report referenced unknown evidence: ${ref}`);
      }

      if (group.section !== "actionGuide") {
        const allowedFamilies = FAMILY_BY_SECTION[group.section];
        if (!allowedFamilies.includes(fact.family)) {
          throw new Error(
            `Compatibility report section ${group.section} used disallowed evidence family ${fact.family}`,
          );
        }
      }
    }
  }

  for (const text of collectVisibleStrings(output)) {
    for (const rule of FORBIDDEN_VISIBLE_PATTERNS) {
      if (rule.pattern.test(text)) {
        throw new Error(`Compatibility report contains forbidden ${rule.label}: ${text}`);
      }
    }
  }

  return output;
}

export function buildCompatibilityReportJsonContract(): string {
  return `{
  "relationshipCore": {
    "headline": "두 사람 관계의 핵심을 쉬운 한국어 한 문장으로",
    "summary": "기본 관계 구조를 2~4문장으로 설명",
    "evidenceRefs": ["제공된 evidenceFacts의 id만 사용"]
  },
  "strengths": [
    {
      "title": "실제 support 근거가 있을 때만 강점 제목",
      "body": "왜 강점으로 작동하는지 생활 언어로 설명",
      "evidenceRefs": ["natal/structure evidence id"]
    }
  ],
  "conflict": {
    "summary": "갈등이 시작되거나 커지기 쉬운 구조를 설명",
    "keyPoints": ["주의해서 볼 패턴"],
    "evidenceRefs": ["natal/structure evidence id"]
  },
  "recovery": {
    "summary": "갈등 후 관계를 회복시키는 조건을 설명",
    "keyPoints": ["회복에 도움이 되는 기준"],
    "evidenceRefs": ["natal/structure evidence id"]
  },
  "longTerm": {
    "summary": "장기 관계에서 유지해야 할 조건을 설명",
    "keyPoints": ["장기적으로 확인할 조건"],
    "evidenceRefs": ["natal/structure evidence id"]
  },
  "currentTiming": {
    "headline": "현재 시기 관계 흐름의 핵심",
    "summary": "evaluationYear의 대운·세운 근거만 사용해 현재 시기를 설명",
    "keyPoints": ["현재 시기에 확인할 신호"],
    "evidenceRefs": ["timing evidence id"]
  },
  "actionGuide": {
    "doNext": [
      {
        "action": "지금 해볼 수 있는 구체적인 행동",
        "reason": "왜 이 행동이 필요한지 설명",
        "evidenceRefs": ["관련 evidence id"]
      }
    ],
    "avoid": [
      {
        "action": "피하거나 줄일 행동",
        "reason": "왜 조정이 필요한지 설명",
        "evidenceRefs": ["관련 evidence id"]
      }
    ]
  }
}`;
}

export function buildCompatibilityReportPrompt(
  context: CompatibilityReportContext,
  relationshipType: CompatibilityPairRelationshipType = "romantic_partner",
  workplaceRelation?: WorkplaceRelation,
): { system: string; user: string } {
  const relationshipConfig = getPairCompatibilityConfigByRelationshipType(relationshipType);
  const role = relationshipType === "workplace_colleague" && workplaceRelation
    ? getWorkplaceRelation(workplaceRelation)
    : null;
  const workplaceRoleContext = role
    ? `[WORKPLACE_RELATION_FROM_BUYER_VIEWPOINT]\n사용자(나)의 역할: ${role.myRole}\n상대방의 역할: ${role.partnerRole}\n선택된 관계: ${role.shortLabel}\n관계별 해석 기준:\n${role.reportFocus.map((item, index) => `${index + 1}. ${item}`).join("\\n")}\n- 이 역할 선택은 실제 업무 관계의 맥락이지 사주 계산 근거가 아닙니다. 동일한 명리 계산에 역할 관점만 적용하세요.\n- 지시·보고·피드백·업무 위임의 주체를 뒤바꾸지 마세요. 실제 성격·실적·마음이나 조직 내 결과를 단정하지 마세요.\n`
    : relationshipType === "workplace_colleague"
      ? "[WORKPLACE_RELATION_FROM_BUYER_VIEWPOINT]\\n구매 당시 상세 직장 역할이 저장되지 않은 리포트입니다. 상사/후배 역할을 추정하지 않고 중립적인 업무 협업 관점으로 해석하세요.\\n"
      : "";
  const system = `당신은 운보다 궁합 엔진의 설명 레이어입니다.

계산하거나 추측하지 말고 제공된 structured evidence만 설명하세요.

필수 규칙:
1. A는 사용자(나), B는 상대방으로 해석하되 A/B 같은 내부 역할명을 사용자 문장에 노출하지 않습니다.
2. 전체 궁합 점수, 백분율, 등급 합산값을 새로 만들지 않습니다.
3. confidence, pressure, usefulnessScore, contribution 같은 내부 수치를 사용자 문장에 그대로 표시하지 않습니다.
4. "무조건", "반드시", "100%", "헤어진다", "결혼한다"처럼 미래나 관계 결과를 확정하지 않습니다.
5. 합·충·형·파·해, 용신, 신강·신약 같은 전문용어를 설명의 중심에 두지 말고 먼저 생활 언어로 의미를 설명합니다.
6. 모든 핵심 주장과 행동 제안에는 evidenceRefs를 넣고, evidenceFacts에 없는 id를 만들지 않습니다.
7. relationshipCore, strengths, conflict, recovery, longTerm은 natal_domain / natal_relation / personal_structure 근거만 사용합니다.
8. strengths는 실제 support 근거가 있을 때만 작성하고, 충분한 근거가 없으면 빈 배열을 사용합니다.
9. currentTiming은 timing_load / timing_domain / timing_relation 근거만 사용하며 evaluationYear 외의 시점을 새로 만들지 않습니다.
10. timingDataQuality가 unavailable이면 currentTiming은 null로 둡니다. 그 외에는 현재 시기 섹션을 작성하되 누락 데이터가 있으면 확신을 낮춰 표현합니다.
11. 출생시간이나 운 데이터가 누락되었다고 해서 임의의 값을 채우지 않습니다.
12. evidenceRefs는 내부 검증용이며 body/summary/headline 문장 안에 id를 그대로 복사하지 않습니다.
13. 결과는 JSON 하나만 출력하고, 아래 계약에 없는 필드를 추가하지 않습니다.`;

  const user = `다음 궁합 엔진 컨텍스트만 사용해 한국어 리포트를 작성하세요.

[RELATIONSHIP_TYPE]
${relationshipConfig.label} 궁합

${workplaceRoleContext}
[RELATIONSHIP_FOCUS]
${relationshipConfig.promptFocus.map((item, index) => `${index + 1}. ${item}`).join("\n")}

[DO_NOT_EXPAND_INTO]
${relationshipConfig.promptAvoid.map((item) => `- ${item}`).join("\n")}

관계 유형에 맞춰 같은 JSON 필드를 다음 의미로 해석하세요.
- relationshipCore: ${relationshipConfig.label} 관계의 핵심 작동 방식
- strengths: 이 관계에서 실제로 살릴 수 있는 보완 지점
- conflict: ${relationshipConfig.reportConflictTitle}
- recovery: ${relationshipConfig.reportRecoveryTitle}
- longTerm: ${relationshipConfig.reportLongTermTitle}
- currentTiming: ${relationshipConfig.reportTimingTitle}
- actionGuide: ${relationshipConfig.reportActionTitle}
연애·가족·직장·친구·사업의 언어를 서로 섞지 말고 현재 관계 유형의 장면과 의사결정만 설명하세요.
사업·동업 분석에서도 사업 성공·수익·투자 결과를 예언하거나 금융·법률 실행 지시를 하지 마세요.

다음 궁합 엔진 컨텍스트만 사용하세요.

[ENGINE_CONTEXT]
${JSON.stringify(context, null, 2)}

[OUTPUT_JSON_CONTRACT]
${buildCompatibilityReportJsonContract()}

currentTiming 규칙: timingDataQuality.level이 unavailable이면 null, 그 외에는 위 object 형식으로 작성하세요.

[SECTION_ORDER]
${COMPATIBILITY_REPORT_SECTION_ORDER.join(" -> ")}
`;

  return { system, user };
}
