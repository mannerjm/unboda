import { z } from "zod";
import {
  FAMILY_OTHER_DOMAINS,
  FAMILY_SIBLING_DOMAINS,
  getFamilyOtherRelationshipLabel,
  getFamilyOtherRoleLabel,
  type FamilyOtherCompatibilityResult,
  type FamilyOtherDomain,
  type FamilySiblingCompatibilityResult,
  type FamilySiblingDomain,
} from "./familyCompatibilityExtended";

export const FAMILY_SIBLING_REPORT_CONTRACT_VERSION = "family-sibling-report-v1" as const;
export const FAMILY_OTHER_REPORT_CONTRACT_VERSION = "family-other-report-v1" as const;

export const FAMILY_SIBLING_REPORT_SECTION_ORDER = [
  "relationshipCore",
  "emotionalBond",
  "communication",
  "comparisonAndCompetition",
  "rolesAndBoundaries",
  "recovery",
  "currentTiming",
  "actionGuide",
] as const;

export const FAMILY_OTHER_REPORT_SECTION_ORDER = [
  "relationshipCore",
  "emotionalDistance",
  "communication",
  "roleAndExpectations",
  "boundariesAndContact",
  "recovery",
  "currentTiming",
  "actionGuide",
] as const;

type EvidenceFamily = "family_domain" | "directional_structure" | "timing_domain" | "timing_load";
type EvidenceTone = "support" | "tension" | "mixed" | "context";

type EvidenceFact<TDomain extends string> = Readonly<{
  id: string;
  family: EvidenceFamily;
  tone: EvidenceTone;
  domain?: TDomain;
  confidence: number;
  payload: Readonly<Record<string, string | number | boolean | readonly string[] | null>>;
}>;

export type FamilySiblingEvidenceFact = EvidenceFact<FamilySiblingDomain>;
export type FamilyOtherEvidenceFact = EvidenceFact<FamilyOtherDomain>;

export type FamilySiblingReportContext = Readonly<{
  contractVersion: typeof FAMILY_SIBLING_REPORT_CONTRACT_VERSION;
  relationshipType: "siblings";
  evaluationYear: number;
  natalDataQuality: FamilySiblingCompatibilityResult["dataQuality"];
  timingDataQuality: FamilySiblingCompatibilityResult["currentTiming"]["dataQuality"];
  evidenceFacts: readonly FamilySiblingEvidenceFact[];
  allowedEvidenceRefs: readonly string[];
}>;

export type FamilyOtherReportContext = Readonly<{
  contractVersion: typeof FAMILY_OTHER_REPORT_CONTRACT_VERSION;
  relationshipType: "other_family";
  relationshipKind: FamilyOtherCompatibilityResult["relationshipKind"];
  roleSemantics: FamilyOtherCompatibilityResult["roleSemantics"];
  evaluationYear: number;
  natalDataQuality: FamilyOtherCompatibilityResult["dataQuality"];
  timingDataQuality: FamilyOtherCompatibilityResult["currentTiming"]["dataQuality"];
  evidenceFacts: readonly FamilyOtherEvidenceFact[];
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
const CurrentTimingSchema = z.object({
  headline: z.string().trim().min(8).max(100),
  summary: z.string().trim().min(30).max(900),
  keyPoints: z.array(z.string().trim().min(10).max(300)).min(1).max(3),
  evidenceRefs: EvidenceRefsSchema,
}).nullable();

export const FamilySiblingReportOutputSchema = z.object({
  relationshipCore: z.object({
    headline: z.string().trim().min(8).max(100),
    summary: z.string().trim().min(40).max(1000),
    evidenceRefs: EvidenceRefsSchema,
  }),
  emotionalBond: SectionSchema,
  communication: SectionSchema,
  comparisonAndCompetition: SectionSchema,
  rolesAndBoundaries: SectionSchema,
  recovery: SectionSchema,
  currentTiming: CurrentTimingSchema,
  actionGuide: z.object({
    doNext: z.array(ActionItemSchema).min(2).max(4),
    avoid: z.array(ActionItemSchema).min(1).max(3),
  }),
});

export const FamilyOtherReportOutputSchema = z.object({
  relationshipCore: z.object({
    headline: z.string().trim().min(8).max(100),
    summary: z.string().trim().min(40).max(1000),
    evidenceRefs: EvidenceRefsSchema,
  }),
  emotionalDistance: SectionSchema,
  communication: SectionSchema,
  roleAndExpectations: SectionSchema,
  boundariesAndContact: SectionSchema,
  recovery: SectionSchema,
  currentTiming: CurrentTimingSchema,
  actionGuide: z.object({
    doNext: z.array(ActionItemSchema).min(2).max(4),
    avoid: z.array(ActionItemSchema).min(1).max(3),
  }),
});

export type FamilySiblingReportOutput = z.infer<typeof FamilySiblingReportOutputSchema>;
export type FamilyOtherReportOutput = z.infer<typeof FamilyOtherReportOutputSchema>;

function levelTone(level: string): EvidenceTone {
  if (level === "supportive") return "support";
  if (level === "adjustment_needed" || level === "burdensome") return "tension";
  if (level === "mixed") return "mixed";
  return "context";
}

function addDomainFacts<TDomain extends string>(input: {
  prefix: string;
  domains: readonly TDomain[];
  source: Readonly<Record<TDomain, {
    level: string;
    confidence: number;
    pressure: { support: number; tension: number; mixed: number; context: number };
    sourceDomains: readonly string[];
    evidenceIds: readonly string[];
  }>>;
  family: "family_domain" | "timing_domain";
  evaluationYear?: number;
  target: EvidenceFact<TDomain>[];
}) {
  for (const domain of input.domains) {
    const item = input.source[domain];
    input.target.push({
      id: `${input.prefix}:${domain}`,
      family: input.family,
      tone: levelTone(item.level),
      domain,
      confidence: item.confidence,
      payload: {
        ...(input.evaluationYear ? { evaluationYear: input.evaluationYear } : {}),
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

function directionFact<TDomain extends string>(
  id: string,
  item: FamilySiblingCompatibilityResult["directions"][keyof FamilySiblingCompatibilityResult["directions"]],
): EvidenceFact<TDomain> {
  return {
    id,
    family: "directional_structure",
    tone: levelTone(item.level),
    confidence: item.confidence,
    payload: {
      level: item.level,
      supportPressure: item.supportPressure,
      burdenPressure: item.burdenPressure,
      neutralPressure: item.neutralPressure,
      leadingSupportElements: item.leadingSupportElements,
      leadingBurdenElements: item.leadingBurdenElements,
    },
  };
}

function timingLoadFact<TDomain extends string>(
  id: string,
  evaluationYear: number,
  role: string,
  load: FamilySiblingCompatibilityResult["currentTiming"]["userLoad"],
): EvidenceFact<TDomain> {
  return {
    id,
    family: "timing_load",
    tone: levelTone(load.level),
    confidence: load.confidence,
    payload: {
      evaluationYear,
      role,
      level: load.level,
      supportPressure: load.supportPressure,
      burdenPressure: load.burdenPressure,
      neutralPressure: load.neutralPressure,
      cycles: load.cycles.map((cycle) => cycle.cycle),
    },
  };
}

export function buildFamilySiblingReportContext(result: FamilySiblingCompatibilityResult): FamilySiblingReportContext {
  const facts: FamilySiblingEvidenceFact[] = [];
  addDomainFacts({
    prefix: "family-sibling:natal-domain",
    domains: FAMILY_SIBLING_DOMAINS,
    source: result.domains,
    family: "family_domain",
    target: facts,
  });
  facts.push(directionFact("family-sibling:direction:user-to-sibling", result.directions.userToSibling));
  facts.push(directionFact("family-sibling:direction:sibling-to-user", result.directions.siblingToUser));
  addDomainFacts({
    prefix: "family-sibling:timing-domain",
    domains: FAMILY_SIBLING_DOMAINS,
    source: result.currentTiming.domains,
    family: "timing_domain",
    evaluationYear: result.currentTiming.evaluationYear,
    target: facts,
  });
  facts.push(timingLoadFact("family-sibling:timing-load:user", result.currentTiming.evaluationYear, "user", result.currentTiming.userLoad));
  facts.push(timingLoadFact("family-sibling:timing-load:sibling", result.currentTiming.evaluationYear, "sibling", result.currentTiming.siblingLoad));
  facts.sort((a, b) => a.id.localeCompare(b.id));
  return {
    contractVersion: FAMILY_SIBLING_REPORT_CONTRACT_VERSION,
    relationshipType: "siblings",
    evaluationYear: result.currentTiming.evaluationYear,
    natalDataQuality: result.dataQuality,
    timingDataQuality: result.currentTiming.dataQuality,
    evidenceFacts: facts,
    allowedEvidenceRefs: facts.map((fact) => fact.id),
  };
}

export function buildFamilyOtherReportContext(result: FamilyOtherCompatibilityResult): FamilyOtherReportContext {
  const facts: FamilyOtherEvidenceFact[] = [];
  addDomainFacts({
    prefix: "family-other:natal-domain",
    domains: FAMILY_OTHER_DOMAINS,
    source: result.domains,
    family: "family_domain",
    target: facts,
  });
  facts.push(directionFact("family-other:direction:user-to-family", result.directions.userToFamily));
  facts.push(directionFact("family-other:direction:family-to-user", result.directions.familyToUser));
  addDomainFacts({
    prefix: "family-other:timing-domain",
    domains: FAMILY_OTHER_DOMAINS,
    source: result.currentTiming.domains,
    family: "timing_domain",
    evaluationYear: result.currentTiming.evaluationYear,
    target: facts,
  });
  facts.push(timingLoadFact("family-other:timing-load:user", result.currentTiming.evaluationYear, "user", result.currentTiming.userLoad));
  facts.push(timingLoadFact("family-other:timing-load:family", result.currentTiming.evaluationYear, "family", result.currentTiming.familyLoad));
  facts.sort((a, b) => a.id.localeCompare(b.id));
  return {
    contractVersion: FAMILY_OTHER_REPORT_CONTRACT_VERSION,
    relationshipType: "other_family",
    relationshipKind: result.relationshipKind,
    roleSemantics: result.roleSemantics,
    evaluationYear: result.currentTiming.evaluationYear,
    natalDataQuality: result.dataQuality,
    timingDataQuality: result.currentTiming.dataQuality,
    evidenceFacts: facts,
    allowedEvidenceRefs: facts.map((fact) => fact.id),
  };
}

const FORBIDDEN_VISIBLE_PATTERNS: readonly RegExp[] = [
  /\d{1,3}\s*(?:점|%)/u,
  /(?:무조건|반드시|확실히|절대로)/u,
  /(?:연애|연인|배우자|결혼|이혼|재회)/u,
  /\b(?:A|B)\b/u,
  /\b(?:supportive|adjustment_needed|insufficient_evidence|burdensome)\b/u,
  /\b(?:supportPressure|burdenPressure|tensionPressure|mixedPressure|neutralPressure|contextPressure)\b/u,
  /(?:지지|부담|긴장|혼합)\s*압력/u,
  /(?:단정하기보다는|보는 편이 적절(?:합니다)?|제공된 근거상)/u,
];

const OVERUSED_NARRATIVE_PATTERNS = [
  { label: "도움과 부담", pattern: /도움과 부담/gu, max: 3 },
  { label: "긴장이 커지", pattern: /긴장이 커지/gu, max: 3 },
  { label: "조정이 필요", pattern: /조정이 필요/gu, max: 3 },
  { label: "상황에 따라", pattern: /상황에 따라/gu, max: 3 },
] as const;

const SIBLING_DIRECTION_REFS = [
  "family-sibling:direction:user-to-sibling",
  "family-sibling:direction:sibling-to-user",
] as const;
const OTHER_DIRECTION_REFS = [
  "family-other:direction:user-to-family",
  "family-other:direction:family-to-user",
] as const;

const SECTION_ALLOWED_FAMILIES: readonly EvidenceFamily[] = ["family_domain", "directional_structure"];
const TIMING_ALLOWED_FAMILIES: readonly EvidenceFamily[] = ["timing_domain", "timing_load"];

function validateRefs<TDomain extends string>(
  refs: readonly string[],
  facts: ReadonlyMap<string, EvidenceFact<TDomain>>,
  allowed: readonly EvidenceFamily[],
): void {
  for (const ref of refs) {
    const fact = facts.get(ref);
    if (!fact) throw new Error(`허용되지 않은 가족 궁합 근거를 참조했습니다: ${ref}`);
    if (!allowed.includes(fact.family)) throw new Error(`이 섹션에서 사용할 수 없는 가족 궁합 근거입니다: ${ref}`);
  }
}

function validateDirectionRefs(refs: readonly string[], required: readonly string[]): void {
  for (const ref of required) {
    if (!refs.includes(ref)) throw new Error(`관계 핵심은 두 방향 근거를 모두 포함해야 합니다: ${ref}`);
  }
}

function validateVisible(value: unknown): void {
  const visible = JSON.stringify(value);
  for (const pattern of FORBIDDEN_VISIBLE_PATTERNS) {
    if (pattern.test(visible)) throw new Error(`가족 궁합 고객 문구 제한을 위반했습니다: ${pattern.source}`);
  }
  for (const rule of OVERUSED_NARRATIVE_PATTERNS) {
    const count = visible.match(rule.pattern)?.length ?? 0;
    if (count > rule.max) throw new Error(`같은 추상 표현이 지나치게 반복되었습니다: ${rule.label} (${count}회)`);
  }
}

export function validateFamilySiblingReportOutput(
  value: unknown,
  context: FamilySiblingReportContext,
): FamilySiblingReportOutput {
  const report = FamilySiblingReportOutputSchema.parse(value);
  const facts = new Map(context.evidenceFacts.map((fact) => [fact.id, fact]));
  validateRefs(report.relationshipCore.evidenceRefs, facts, SECTION_ALLOWED_FAMILIES);
  validateDirectionRefs(report.relationshipCore.evidenceRefs, SIBLING_DIRECTION_REFS);
  validateRefs(report.emotionalBond.evidenceRefs, facts, SECTION_ALLOWED_FAMILIES);
  validateRefs(report.communication.evidenceRefs, facts, SECTION_ALLOWED_FAMILIES);
  validateRefs(report.comparisonAndCompetition.evidenceRefs, facts, SECTION_ALLOWED_FAMILIES);
  validateRefs(report.rolesAndBoundaries.evidenceRefs, facts, SECTION_ALLOWED_FAMILIES);
  validateRefs(report.recovery.evidenceRefs, facts, SECTION_ALLOWED_FAMILIES);
  if (report.currentTiming) validateRefs(report.currentTiming.evidenceRefs, facts, TIMING_ALLOWED_FAMILIES);
  for (const action of [...report.actionGuide.doNext, ...report.actionGuide.avoid]) {
    for (const ref of action.evidenceRefs) if (!facts.has(ref)) throw new Error(`허용되지 않은 행동 근거를 참조했습니다: ${ref}`);
  }
  validateVisible(report);
  return report;
}

export function validateFamilyOtherReportOutput(
  value: unknown,
  context: FamilyOtherReportContext,
): FamilyOtherReportOutput {
  const report = FamilyOtherReportOutputSchema.parse(value);
  const facts = new Map(context.evidenceFacts.map((fact) => [fact.id, fact]));
  validateRefs(report.relationshipCore.evidenceRefs, facts, SECTION_ALLOWED_FAMILIES);
  validateDirectionRefs(report.relationshipCore.evidenceRefs, OTHER_DIRECTION_REFS);
  validateRefs(report.emotionalDistance.evidenceRefs, facts, SECTION_ALLOWED_FAMILIES);
  validateRefs(report.communication.evidenceRefs, facts, SECTION_ALLOWED_FAMILIES);
  validateRefs(report.roleAndExpectations.evidenceRefs, facts, SECTION_ALLOWED_FAMILIES);
  validateRefs(report.boundariesAndContact.evidenceRefs, facts, SECTION_ALLOWED_FAMILIES);
  validateRefs(report.recovery.evidenceRefs, facts, SECTION_ALLOWED_FAMILIES);
  if (report.currentTiming) validateRefs(report.currentTiming.evidenceRefs, facts, TIMING_ALLOWED_FAMILIES);
  for (const action of [...report.actionGuide.doNext, ...report.actionGuide.avoid]) {
    for (const ref of action.evidenceRefs) if (!facts.has(ref)) throw new Error(`허용되지 않은 행동 근거를 참조했습니다: ${ref}`);
  }
  validateVisible(report);
  return report;
}

function getFamilyOtherRelationshipWritingGuide(kind: FamilyOtherReportContext["relationshipKind"]): string {
  switch (kind) {
    case "grandparent_grandchild":
      return "조부모·손주 관계에서는 보호·지원과 자율성, 세대별 생활 리듬, 연락·방문, 조언의 범위를 중심으로 설명합니다. 세대 차이 자체를 갈등 원인으로 단정하지 않습니다.";
    case "aunt_uncle_niece_nephew":
      return "삼촌·이모·고모·조카 관계에서는 조언·지원과 상대의 선택권, 연락의 편안한 빈도, 필요할 때 돕는 범위를 중심으로 설명합니다.";
    case "cousins":
      return "사촌 관계에서는 수평적인 친밀감, 비교·평가로 느껴질 수 있는 지점, 연락 리듬, 각자의 생활 경계를 중심으로 설명합니다.";
    case "in_laws":
      return "인척 관계에서는 예의와 역할 기대, 연락·도움·관여의 범위, 서로 다른 가족 생활 기준을 조정하는 방식을 중심으로 설명합니다.";
    case "other_relatives":
      return "기타 친족 관계에서는 정서적 거리, 역할 기대, 연락·도움·관여의 범위를 실제 근거에 맞춰 구체적으로 설명합니다.";
  }
}

export function buildFamilySiblingReportPrompt(context: FamilySiblingReportContext) {
  return {
    system: [
      "당신은 형제·자매 관계의 명리 근거를 고객 언어로 설명하는 리포트 작성자입니다.",
      "제공된 evidenceFacts만 설명하며 성격, 가족사, 과거 사건, 부모의 태도를 추정하지 않습니다.",
      "형제·자매 중 한쪽을 질투가 많다거나 이기적이라고 도덕적으로 평가하지 않습니다.",
      "총점, 퍼센트, 관계 성공/실패 판정을 만들지 않습니다.",
      "나→형제·자매와 형제·자매→나의 영향은 다를 수 있으므로 방향성을 보존합니다.",
      "관계 핵심은 두 directional_structure 근거를 모두 사용하며, 방향 차이가 있으면 고객이 한눈에 알아볼 수 있게 구체적으로 씁니다.",
      "비교·경쟁, 역할·경계, 회복 섹션은 서로 다른 질문에 답해야 하며 같은 추상 문장을 반복하지 않습니다.",
      "기본 관계와 현재 연도 흐름을 분리합니다.",
      "반드시 JSON 객체만 반환합니다.",
    ].join("\n"),
    user: JSON.stringify({
      task: "형제·자매 궁합 리포트를 작성하세요.",
      sectionOrder: FAMILY_SIBLING_REPORT_SECTION_ORDER,
      sectionGuide: {
        relationshipCore: "두 사람 관계의 핵심과 두 방향의 차이. 두 방향 근거를 모두 인용하고, 차이가 있으면 방향별 체감 차이를 직접 설명",
        emotionalBond: "정서적으로 가까워지는 방식과 거리가 생기는 조건",
        communication: "말과 반응이 맞거나 엇갈리는 방식",
        comparisonAndCompetition: "비교·경쟁·평가로 느껴지기 쉬운 지점과 협력 조건",
        rolesAndBoundaries: "오래 굳어진 역할과 서로의 선택 범위를 조정하는 기준",
        recovery: "갈등 뒤 다시 연결되기 쉬운 조건",
        currentTiming: `${context.evaluationYear}년 형제·자매 관계에서 특히 달라지는 흐름`,
        actionGuide: "지금 바로 시도할 행동과 줄이면 좋은 행동",
      },
      evidenceFacts: context.evidenceFacts,
    }),
  } as const;
}

export function buildFamilyOtherReportPrompt(context: FamilyOtherReportContext) {
  const relationshipLabel = getFamilyOtherRelationshipLabel(context.relationshipKind);
  const userRoleLabel = getFamilyOtherRoleLabel(context.roleSemantics.user);
  const familyRoleLabel = getFamilyOtherRoleLabel(context.roleSemantics.familyMember);
  const relationshipWritingGuide = getFamilyOtherRelationshipWritingGuide(context.relationshipKind);
  return {
    system: [
      "당신은 가족·친족 관계의 명리 근거를 고객 언어로 설명하는 리포트 작성자입니다.",
      "제공된 evidenceFacts와 관계 유형만 설명하며 실제 가족사, 의도, 과거 사건을 추정하지 않습니다.",
      "가족의 서열이나 도덕성을 평가하거나 한쪽을 문제의 원인으로 단정하지 않습니다.",
      "총점, 퍼센트, 관계 성공/실패 판정을 만들지 않습니다.",
      "나→가족과 가족→나의 영향은 다를 수 있으므로 방향성을 보존합니다.",
      "관계 핵심은 두 directional_structure 근거를 모두 사용하며, 방향 차이가 있으면 고객이 한눈에 알아볼 수 있게 구체적으로 씁니다.",
      "관계 유형별 writingGuide를 실제 문장 차별화에 사용하되 evidenceFacts에 없는 사건이나 성격을 추가하지 않습니다.",
      "기본 관계와 현재 연도 흐름을 분리합니다.",
      "반드시 JSON 객체만 반환합니다.",
    ].join("\n"),
    user: JSON.stringify({
      task: "기타 가족 궁합 리포트를 작성하세요.",
      relationship: { relationshipLabel, userRoleLabel, familyRoleLabel },
      relationshipWritingGuide,
      sectionOrder: FAMILY_OTHER_REPORT_SECTION_ORDER,
      sectionGuide: {
        relationshipCore: "관계 유형을 고려한 핵심과 두 방향의 차이. 두 방향 근거를 모두 인용하고 관계 유형에 맞는 실제 생활 주제로 차이를 설명",
        emotionalDistance: "가까움과 거리 조절이 편안해지는 조건",
        communication: "연락·대화·표현 방식이 맞거나 엇갈리는 지점",
        roleAndExpectations: "가족 역할과 기대가 서로에게 어떻게 전달되는지",
        boundariesAndContact: "연락 빈도, 도움, 조언, 관여의 경계를 조정하는 기준",
        recovery: "불편함이나 갈등 뒤 다시 연결되기 쉬운 조건",
        currentTiming: `${context.evaluationYear}년 이 가족 관계에서 특히 달라지는 흐름`,
        actionGuide: "지금 바로 시도할 행동과 줄이면 좋은 행동",
      },
      evidenceFacts: context.evidenceFacts,
    }),
  } as const;
}
