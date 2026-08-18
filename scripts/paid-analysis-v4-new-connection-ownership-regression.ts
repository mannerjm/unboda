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
  "relationship",
  "relationship-current",
  "relationship-intimacy",
  "relationship-partner-pattern",
  "relationship-marriage",
  "relationship-reunion",
  "relationship-conflict",
  "relationship-boundary",
] as const;

function configOf(productId: "relationship-new-connection" | (typeof siblingIds)[number]) {
  const config = getPaidAnalysisTopicConfig(productId);
  if (!config) throw new Error(`FAIL: missing config for ${productId}`);
  return config;
}

function ids(items: { id: string }[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

const connection = configOf("relationship-new-connection");
const siblings = siblingIds.map((productId) => [productId, configOf(productId)] as const);

assert(getPaidAnalysisEngine("relationship-new-connection") === "RELATIONSHIP", "new-connection must map to RELATIONSHIP");
assert(connection.decisionType === "exploration", "new-connection must remain exploration");
assert(connection.requiredInsights.length === 4, "new-connection needs four requiredInsights");
assert((connection.excludedFocus?.length ?? 0) === 3, "new-connection needs three excludedFocus items");

const connectionRequired = ids(connection.requiredInsights);
for (const requiredId of [
  "connection-opportunity-pattern",
  "initial-contact-style",
  "early-trust-signal",
  "new-connection-action",
]) {
  assert(connectionRequired.has(requiredId), `new-connection must require ${requiredId}`);
}

for (const insight of [...connection.requiredInsights, ...(connection.excludedFocus ?? [])]) {
  assert(insight.id.trim().length > 0, "new-connection insight id must not be empty");
  assert(insight.prompt.trim().length > 0, "new-connection insight prompt must not be empty");
}

for (const siblingInsight of [
  "relationship-operating-structure",
  "current-relationship-core-problem",
  "intimacy-pace-pattern",
  "partner-selection-pattern",
  "shared-life-condition",
  "separation-context",
  "conflict-trigger-pattern",
  "boundary-overload-pattern",
]) {
  assert(!connectionRequired.has(siblingInsight), `new-connection must not require sibling insight ${siblingInsight}`);
}

for (const [siblingId, sibling] of siblings) {
  assert(connection.userQuestion !== sibling.userQuestion, `new-connection and ${siblingId} questions must differ`);
  assert(JSON.stringify(connection.requiredInsights) !== JSON.stringify(sibling.requiredInsights), `new-connection and ${siblingId} required insights must differ`);
  assert(JSON.stringify(connection.actionFocus) !== JSON.stringify(sibling.actionFocus), `new-connection and ${siblingId} actionFocus must differ`);
  assert(
    validatePremiumDepthSiblingDistinction(
      getPaidAnalysisPremiumDepthContract(connection),
      getPaidAnalysisPremiumDepthContract(sibling),
    ).ok,
    `new-connection and ${siblingId} must have distinct positive ownership`,
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
const connectionPrompt = buildPaidAnalysisDetailPromptV4({ ...basePromptInput, productId: "relationship-new-connection" });

assert(connectionPrompt.includes("[반드시 다룰 핵심 통찰]"), "new-connection needs required insights");
assert(connectionPrompt.includes("[이 상품의 경계]"), "new-connection needs excluded focus");
assert(!connectionPrompt.includes('"decisionCheck": ['), "new-connection must not request decisionCheck");
assert(connectionPrompt.includes("decisionCheck 필드를 출력하지 않는다"), "new-connection must forbid decisionCheck");
for (const insight of connection.requiredInsights) {
  assert(connectionPrompt.includes(insight.prompt), `connection prompt must include ${insight.id}`);
}
for (const focus of connection.excludedFocus ?? []) {
  assert(connectionPrompt.includes(focus.prompt), `connection prompt must include excluded ${focus.id}`);
}
for (const [, sibling] of siblings) {
  assert(!connectionPrompt.includes(sibling.requiredInsights[0].prompt), "new-connection prompt must not carry sibling-specific ownership");
}

const contract = formatTopicConfigForPrompt(connection);
for (const prohibitedClaim of [
  "정확한 사람·장소·행사·직장·날짜에서 만난다는 예측",
  "현재 특정 상대의 행동을 관계 지속·조정 결론으로 해석",
  "친밀감 심화·갈등 수습·경계 처방을 초기 접점의 중심 결론으로 제시",
  "반복 파트너 선택·공동생활 준비·재접촉 판단을 중심 결론으로 제시",
]) {
  assert(contract.includes(prohibitedClaim), `new-connection must prohibit ${prohibitedClaim}`);
}

const rules = getPaidAnalysisEngineRules("RELATIONSHIP");
assert(rules.includes("TopicConfig의 단일 질문과 반드시 다룰 핵심 통찰"), "RELATIONSHIP Engine must prioritize TopicConfig");
assert(rules.includes("제외한 범위를 핵심 결론이나 주된 action으로 확장하지 않는다"), "RELATIONSHIP Engine must honor excludedFocus");
assert(!rules.includes("relationship-new-connection") && !rules.includes("productId"), "RELATIONSHIP Engine must not hardcode product IDs");

const metadata = [
  getPremiumProduct("relationship-new-connection")?.description,
  ...(getPremiumProduct("relationship-new-connection")?.details ?? []),
].join("\n");
for (const prohibitedPromise of ["생기기 쉬운 명리적 조건", "현재 운에서 접점", "관계 시작 전후", "특정 날짜", "정확한 장소"]) {
  assert(!metadata.includes(prohibitedPromise), `new-connection metadata must not promise ${prohibitedPromise}`);
}
for (const requiredPromise of ["접점", "초기", "신뢰", "상호작용", "검토"]) {
  assert(metadata.includes(requiredPromise), `new-connection metadata must promise ${requiredPromise}`);
}

for (const evidenceKey of ["element_relations", "fortune_brain", "strength", "element_balance", "yongshin"] as const) {
  assert(connection.evidenceFocus.includes(evidenceKey), `new-connection must use ${evidenceKey}`);
}
assert(!connection.evidenceFocus.includes("daeun"), "new-connection must not use daeun as differentiator");
assert(!connection.evidenceFocus.includes("seun"), "new-connection must not use seun as differentiator");
assert(!connection.evidenceFocus.includes("fortune_flow"), "new-connection must not use fortune_flow for event timing");

console.log("paid-analysis-v4-new-connection-ownership-regression passed ✓");