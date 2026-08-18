import {
  formatTopicConfigForPrompt,
  getPaidAnalysisPremiumDepthContract,
  getPaidAnalysisTopicConfig,
} from "../app/lib/paidAnalysisTopicConfig";
import { getPaidAnalysisEngine, getPaidAnalysisEngineRules } from "../app/lib/paidAnalysisEngine";
import { buildPaidAnalysisDetailPromptV4 } from "../app/lib/paidAnalysisDetailPrompt";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";
import { validatePremiumDepthSiblingDistinction } from "../app/lib/paidAnalysisV4QualityValidators";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const siblingIds = [
  "relationship-current",
  "relationship-conflict",
  "relationship-boundary",
  "relationship-intimacy",
  "relationship-reunion",
  "relationship-partner-pattern",
  "relationship-marriage",
  "relationship-new-connection",
] as const;

function configOf(productId: "relationship" | (typeof siblingIds)[number]) {
  const config = getPaidAnalysisTopicConfig(productId);
  if (!config) throw new Error(`FAIL: missing config for ${productId}`);
  return config;
}

function ids(items: { id: string }[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

const relationship = configOf("relationship");
const siblings = siblingIds.map((productId) => [productId, configOf(productId)] as const);

assert(getPaidAnalysisEngine("relationship") === "RELATIONSHIP", "relationship must map to RELATIONSHIP");
assert(relationship.decisionType === "exploration", "relationship must remain exploration");
assert(relationship.requiredInsights.length === 4, "relationship needs four requiredInsights");
assert((relationship.excludedFocus?.length ?? 0) === 3, "relationship needs three excludedFocus items");

const relationshipRequired = ids(relationship.requiredInsights);
for (const requiredId of [
  "relationship-operating-structure",
  "reciprocity-emotional-load",
  "distance-response-pattern",
  "relationship-operating-review-action",
]) {
  assert(relationshipRequired.has(requiredId), `relationship must require ${requiredId}`);
}

const relationshipExcluded = ids(relationship.excludedFocus ?? []);
for (const excludedId of [
  "specific-current-or-reunion-decision",
  "conflict-boundary-intimacy-intervention",
  "selection-commitment-connection-ownership",
]) {
  assert(relationshipExcluded.has(excludedId), `relationship must exclude ${excludedId}`);
}

for (const insight of [...relationship.requiredInsights, ...(relationship.excludedFocus ?? [])]) {
  assert(insight.id.trim().length > 0, "relationship insight id must not be empty");
  assert(insight.prompt.trim().length > 0, "relationship insight prompt must not be empty");
}

const siblingInsightIds = [
  "current-relationship-core-problem",
  "continue-adjust-criteria",
  "conflict-trigger-pattern",
  "repair-signal",
  "boundary-overload-pattern",
  "distance-permission-standard",
  "intimacy-pace-pattern",
  "emotional-opening-boundary",
  "separation-context",
  "recontact-signal",
  "partner-selection-pattern",
  "role-expectation-pattern",
  "shared-life-condition",
  "role-responsibility-readiness",
  "connection-opportunity-pattern",
  "initial-contact-style",
];
for (const insightId of siblingInsightIds) {
  assert(!relationshipRequired.has(insightId), `relationship must not require sibling insight ${insightId}`);
}

for (const [siblingId, sibling] of siblings) {
  assert(relationship.userQuestion !== sibling.userQuestion, `relationship and ${siblingId} questions must differ`);
  assert(JSON.stringify(relationship.requiredInsights) !== JSON.stringify(sibling.requiredInsights), `relationship and ${siblingId} required insights must differ`);
  assert(JSON.stringify(relationship.actionFocus) !== JSON.stringify(sibling.actionFocus), `relationship and ${siblingId} actionFocus must differ`);
  assert(
    validatePremiumDepthSiblingDistinction(
      getPaidAnalysisPremiumDepthContract(relationship),
      getPaidAnalysisPremiumDepthContract(sibling),
    ).ok,
    `relationship and ${siblingId} must have distinct positive ownership`,
  );
}

const basePromptInput = {
  analysisType: "테스트 분석",
  birthData: "birth",
  originalChart: "chart",
  coreInterpretation: "core",
  fortuneTiming: "timing",
  sajuSummary: "summary",
  currentFortuneFlow: "flow",
};
const relationshipPrompt = buildPaidAnalysisDetailPromptV4({ ...basePromptInput, productId: "relationship" });

assert(relationshipPrompt.includes("[반드시 다룰 핵심 통찰]"), "relationship needs required insights");
assert(relationshipPrompt.includes("[이 상품의 경계]"), "relationship needs excluded focus");
assert(!relationshipPrompt.includes('"decisionCheck": ['), "relationship must not request decisionCheck");
assert(relationshipPrompt.includes("decisionCheck 필드를 출력하지 않는다"), "relationship must forbid decisionCheck");
for (const insight of relationship.requiredInsights) {
  assert(relationshipPrompt.includes(insight.prompt), `relationship prompt must include ${insight.id}`);
}
for (const focus of relationship.excludedFocus ?? []) {
  assert(relationshipPrompt.includes(focus.prompt), `relationship prompt must include excluded ${focus.id}`);
}
for (const [, sibling] of siblings) {
  assert(!relationshipPrompt.includes(sibling.requiredInsights[0].prompt), "relationship prompt must not carry sibling-specific ownership");
}

const relationshipContract = formatTopicConfigForPrompt(relationship);
for (const prohibitedClaim of [
  "특정 현재 관계를 이어가거나 조정해야 한다는 결론",
  "갈등 수습·경계 설정·친밀감 속도를 단일 관계에 처방",
  "파트너 선택·새 인연·재회·결혼 준비를 중심 결론으로 제시",
]) {
  assert(relationshipContract.includes(prohibitedClaim), `relationship must prohibit ${prohibitedClaim}`);
}

const rules = getPaidAnalysisEngineRules("RELATIONSHIP");
assert(rules.includes("TopicConfig의 단일 질문과 반드시 다룰 핵심 통찰"), "RELATIONSHIP Engine must prioritize TopicConfig");
assert(rules.includes("제외한 범위를 핵심 결론이나 주된 action으로 확장하지 않는다"), "RELATIONSHIP Engine must honor excludedFocus");
assert(!rules.includes("relationship-current") && !rules.includes("productId"), "RELATIONSHIP Engine must not hardcode product IDs");

const metadata = [
  getPremiumProduct("relationship")?.description,
  ...(getPremiumProduct("relationship")?.details ?? []),
].join("\n");
for (const siblingPromise of ["갈등 후 대화 재개", "허용·거절 기준", "친밀감이 형성되는 속도", "새로운 접점", "재연결", "공동생활"]) {
  assert(!metadata.includes(siblingPromise), `relationship metadata must not promise ${siblingPromise}`);
}
for (const requiredPromise of ["상호작용", "정서적 부담", "운영", "우선순위", "모니터링"]) {
  assert(metadata.includes(requiredPromise), `relationship metadata must promise ${requiredPromise}`);
}

console.log("paid-analysis-v4-general-relationship-boundary-regression passed ✓");