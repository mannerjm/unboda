import { z } from "zod";
import {
  FAMILY_PARENT_CHILD_DOMAINS,
  type FamilyParentChildCompatibilityResult,
  type FamilyParentChildDomain,
  type FamilyParentChildRole,
} from "./familyCompatibilityParentChild";

export const FAMILY_PARENT_CHILD_REPORT_CONTRACT_VERSION = "family-parent-child-report-v1" as const;

export const FAMILY_PARENT_CHILD_REPORT_SECTION_ORDER = [
  "relationshipCore",
  "emotionalConnection",
  "communication",
  "expectationAndAutonomy",
  "boundariesAndPressure",
  "recovery",
  "currentTiming",
  "actionGuide",
] as const;

export type FamilyParentChildEvidenceFamily =
  | "family_domain"
  | "directional_structure"
  | "timing_domain"
  | "timing_load";

export type FamilyParentChildEvidenceTone = "support" | "tension" | "mixed" | "context";

export type FamilyParentChildEvidenceFact = Readonly<{
  id: string;
  family: FamilyParentChildEvidenceFamily;
  tone: FamilyParentChildEvidenceTone;
  domain?: FamilyParentChildDomain;
  confidence: number;
  payload: Readonly<Record<string, string | number | boolean | readonly string[] | null>>;
}>;

export type FamilyParentChildReportContext = Readonly<{
  contractVersion: typeof FAMILY_PARENT_CHILD_REPORT_CONTRACT_VERSION;
  relationshipType: "parent_child";
  roleSemantics: Readonly<{ A: FamilyParentChildRole; B: FamilyParentChildRole }>;
  evaluationYear: number;
  natalDataQuality: FamilyParentChildCompatibilityResult["dataQuality"];
  timingDataQuality: FamilyParentChildCompatibilityResult["currentTiming"]["dataQuality"];
  evidenceFacts: readonly FamilyParentChildEvidenceFact[];
  allowedEvidenceRefs: readonly string[];
}>;

const EvidenceRefsSchema = z.array(z.string().trim().min(1)).min(1).max(5);

const SectionSchema = z.object({
  summary: z.string().trim().min(30).max(900),
  keyPoints: z.array(z.string().trim().min(10).max(300)).min(1).max(3),
  evidenceRefs: EvidenceRefsSchema,
});

const ActionItemSchema = z.object({
  action: z.string().trim().min(10).max(240),
  reason: z.string().trim().min(15).max(400),
  evidenceRefs: z.array(z.string().trim().min(1)).min(1).max(3),
});

export const FamilyParentChildReportOutputSchema = z.object({
  relationshipCore: z.object({
    headline: z.string().trim().min(8).max(100),
    summary: z.string().trim().min(40).max(1000),
    evidenceRefs: EvidenceRefsSchema,
  }),
  emotionalConnection: SectionSchema,
  communication: SectionSchema,
  expectationAndAutonomy: SectionSchema,
  boundariesAndPressure: SectionSchema,
  recovery: SectionSchema,
  currentTiming: z.object({
    headline: z.string().trim().min(8).max(100),
    summary: z.string().trim().min(30).max(900),
    keyPoints: z.array(z.string().trim().min(10).max(300)).min(1).max(3),
    evidenceRefs: EvidenceRefsSchema,
  }).nullable(),
  actionGuide: z.object({
    doNext: z.array(ActionItemSchema).min(2).max(4),
    avoid: z.array(ActionItemSchema).min(1).max(3),
  }),
});

export type FamilyParentChildReportOutput = z.infer<typeof FamilyParentChildReportOutputSchema>;

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function levelTone(level: string): FamilyParentChildEvidenceTone {
  if (level === "supportive") return "support";
  if (level === "adjustment_needed" || level === "burdensome") return "tension";
  if (level === "mixed") return "mixed";
  return "context";
}

function addFamilyDomainFacts(
  result: FamilyParentChildCompatibilityResult,
  facts: FamilyParentChildEvidenceFact[],
): void {
  for (const domain of FAMILY_PARENT_CHILD_DOMAINS) {
    const item = result.domains[domain];
    facts.push({
      id: `family:natal-domain:${domain}`,
      family: "family_domain",
      tone: levelTone(item.level),
      domain,
      confidence: item.confidence,
      payload: {
        domain,
        level: item.level,
        supportPressure: item.pressure.support,
        tensionPressure: item.pressure.tension,
        mixedPressure: item.pressure.mixed,
        contextPressure: item.pressure.context,
        sourceDomains: item.sourceDomains,
        sourceEvidenceIds: item.evidenceIds,
      },
    });
  }
}

function addDirectionalFacts(
  result: FamilyParentChildCompatibilityResult,
  facts: FamilyParentChildEvidenceFact[],
): void {
  for (const [id, item] of [
    ["parent-to-child", result.directions.parentToChild],
    ["child-to-parent", result.directions.childToParent],
  ] as const) {
    facts.push({
      id: `family:direction:${id}`,
      family: "directional_structure",
      tone: levelTone(item.level),
      confidence: item.confidence,
      payload: {
        fromRole: item.fromRole,
        toRole: item.toRole,
        level: item.level,
        supportPressure: item.supportPressure,
        burdenPressure: item.burdenPressure,
        neutralPressure: item.neutralPressure,
        leadingSupportElements: item.leadingSupportElements,
        leadingBurdenElements: item.leadingBurdenElements,
      },
    });
  }
}

function addTimingFacts(
  result: FamilyParentChildCompatibilityResult,
  facts: FamilyParentChildEvidenceFact[],
): void {
  for (const domain of FAMILY_PARENT_CHILD_DOMAINS) {
    const item = result.currentTiming.domains[domain];
    facts.push({
      id: `family:timing-domain:${domain}`,
      family: "timing_domain",
      tone: levelTone(item.level),
      domain,
      confidence: item.confidence,
      payload: {
        evaluationYear: result.currentTiming.evaluationYear,
        domain,
        level: item.level,
        supportPressure: item.pressure.support,
        tensionPressure: item.pressure.tension,
        mixedPressure: item.pressure.mixed,
        contextPressure: item.pressure.context,
        sourceEvidenceIds: item.evidenceIds,
      },
    });
  }

  for (const [role, load] of [
    ["parent", result.currentTiming.parentLoad],
    ["child", result.currentTiming.childLoad],
  ] as const) {
    facts.push({
      id: `family:timing-load:${role}`,
      family: "timing_load",
      tone: levelTone(load.level),
      confidence: load.confidence,
      payload: {
        evaluationYear: result.currentTiming.evaluationYear,
        role,
        level: load.level,
        supportPressure: load.supportPressure,
        burdenPressure: load.burdenPressure,
        neutralPressure: load.neutralPressure,
        cycles: load.cycles.map((cycle) => cycle.cycle),
      },
    });
  }
}

export function buildFamilyParentChildReportContext(
  result: FamilyParentChildCompatibilityResult,
): FamilyParentChildReportContext {
  const evidenceFacts: FamilyParentChildEvidenceFact[] = [];
  addFamilyDomainFacts(result, evidenceFacts);
  addDirectionalFacts(result, evidenceFacts);
  addTimingFacts(result, evidenceFacts);
  evidenceFacts.sort((left, right) => left.id.localeCompare(right.id));

  return {
    contractVersion: FAMILY_PARENT_CHILD_REPORT_CONTRACT_VERSION,
    relationshipType: "parent_child",
    roleSemantics: result.roleSemantics,
    evaluationYear: result.currentTiming.evaluationYear,
    natalDataQuality: result.dataQuality,
    timingDataQuality: result.currentTiming.dataQuality,
    evidenceFacts,
    allowedEvidenceRefs: evidenceFacts.map((fact) => fact.id),
  };
}

const SECTION_ALLOWED_FAMILIES: Readonly<Record<
  Exclude<(typeof FAMILY_PARENT_CHILD_REPORT_SECTION_ORDER)[number], "actionGuide">,
  readonly FamilyParentChildEvidenceFamily[]
>> = {
  relationshipCore: ["family_domain", "directional_structure"],
  emotionalConnection: ["family_domain", "directional_structure"],
  communication: ["family_domain", "directional_structure"],
  expectationAndAutonomy: ["family_domain", "directional_structure"],
  boundariesAndPressure: ["family_domain", "directional_structure"],
  recovery: ["family_domain", "directional_structure"],
  currentTiming: ["timing_domain", "timing_load"],
};

const FORBIDDEN_VISIBLE_PATTERNS: readonly RegExp[] = [
  /\d{1,3}\s*(?:점|%)/u,
  /(?:무조건|반드시|확실히|절대로)/u,
  /(?:연애|연인|배우자|결혼|이혼|재회)/u,
  /(?:부모\s*탓|자녀\s*탓|불효|나쁜\s*부모)/u,
  /\b(?:A|B)\b/u,
  /\b(?:supportive|adjustment_needed|insufficient_evidence|burdensome)\b/u,
];

function allVisibleText(report: FamilyParentChildReportOutput): string {
  return JSON.stringify(report);
}

function validateRefs(
  refs: readonly string[],
  section: Exclude<(typeof FAMILY_PARENT_CHILD_REPORT_SECTION_ORDER)[number], "actionGuide">,
  factById: ReadonlyMap<string, FamilyParentChildEvidenceFact>,
): void {
  for (const ref of refs) {
    const fact = factById.get(ref);
    if (!fact) throw new Error(`허용되지 않은 가족 궁합 근거를 참조했습니다: ${ref}`);
    if (!SECTION_ALLOWED_FAMILIES[section].includes(fact.family)) {
      throw new Error(`${section} 섹션에서 사용할 수 없는 가족 궁합 근거입니다: ${ref}`);
    }
  }
}

export function validateFamilyParentChildReportOutput(
  value: unknown,
  context: FamilyParentChildReportContext,
): FamilyParentChildReportOutput {
  const report = FamilyParentChildReportOutputSchema.parse(value);
  const factById = new Map(context.evidenceFacts.map((fact) => [fact.id, fact]));

  validateRefs(report.relationshipCore.evidenceRefs, "relationshipCore", factById);
  validateRefs(report.emotionalConnection.evidenceRefs, "emotionalConnection", factById);
  validateRefs(report.communication.evidenceRefs, "communication", factById);
  validateRefs(report.expectationAndAutonomy.evidenceRefs, "expectationAndAutonomy", factById);
  validateRefs(report.boundariesAndPressure.evidenceRefs, "boundariesAndPressure", factById);
  validateRefs(report.recovery.evidenceRefs, "recovery", factById);
  if (report.currentTiming) validateRefs(report.currentTiming.evidenceRefs, "currentTiming", factById);

  for (const action of [...report.actionGuide.doNext, ...report.actionGuide.avoid]) {
    for (const ref of action.evidenceRefs) {
      if (!factById.has(ref)) throw new Error(`허용되지 않은 가족 궁합 행동 근거를 참조했습니다: ${ref}`);
    }
  }

  const visible = allVisibleText(report);
  for (const pattern of FORBIDDEN_VISIBLE_PATTERNS) {
    if (pattern.test(visible)) throw new Error(`가족 궁합 고객 문구 제한을 위반했습니다: ${pattern.source}`);
  }

  return report;
}

export function buildFamilyParentChildReportPrompt(
  context: FamilyParentChildReportContext,
): Readonly<{ system: string; user: string }> {
  const userRole = context.roleSemantics.A === "parent" ? "부모" : "자녀";
  const counterpartRole = context.roleSemantics.B === "parent" ? "부모" : "자녀";

  return {
    system: [
      "당신은 부모·자녀 관계의 명리 근거를 고객 언어로 설명하는 리포트 작성자입니다.",
      "계산 결과와 제공된 evidenceFacts만 설명하며 근거에 없는 성격, 의도, 과거 사건을 만들지 않습니다.",
      "연인·배우자용 표현을 사용하지 않습니다.",
      "부모와 자녀 중 어느 한쪽을 문제의 원인으로 단정하거나 도덕적으로 평가하지 않습니다.",
      "총점, 퍼센트, 관계의 성공/실패 판정을 만들지 않습니다.",
      "기본 관계와 현재 연도 흐름을 분리해 설명합니다.",
      "부모→자녀와 자녀→부모의 영향은 서로 다를 수 있으므로 방향성을 보존합니다.",
      "출생시간이 부족한 경우 확인 가능한 범위만 설명하고 빈 근거를 추정하지 않습니다.",
      "반드시 JSON 객체만 반환합니다.",
    ].join("\n"),
    user: JSON.stringify({
      task: "부모·자녀 궁합 리포트를 작성하세요.",
      roleGuide: { user: userRole, counterpart: counterpartRole },
      sectionOrder: FAMILY_PARENT_CHILD_REPORT_SECTION_ORDER,
      sectionGuide: {
        relationshipCore: "두 사람의 관계에서 가장 먼저 이해해야 할 핵심",
        emotionalConnection: "정서적으로 가까워지거나 거리를 두게 되는 방식",
        communication: "말을 주고받는 속도와 표현 방식",
        expectationAndAutonomy: "기대와 독립 사이에서 맞춰야 할 기준",
        boundariesAndPressure: "보호가 간섭이나 압박으로 느껴지기 쉬운 지점",
        recovery: "갈등 뒤 다시 연결되기 쉬운 조건",
        currentTiming: `${context.evaluationYear}년 현재 관계 흐름만 설명`,
        actionGuide: "지금 실천할 수 있는 구체적 행동과 줄이면 좋은 행동",
      },
      evidenceFacts: context.evidenceFacts,
    }),
  };
}
