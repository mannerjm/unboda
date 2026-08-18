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
  "money-wealth-accumulation",
  "money-leak-risk",
  "money-saving-discipline",
] as const;

function configOf(productId: "wealth" | (typeof siblingIds)[number]) {
  const config = getPaidAnalysisTopicConfig(productId);
  if (!config) throw new Error(`FAIL: missing config for ${productId}`);
  return config;
}

function ids(items: { id: string }[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

const wealth = configOf("wealth");
const siblings = siblingIds.map((productId) => [productId, configOf(productId)] as const);

assert(getPaidAnalysisEngine("wealth") === "MONEY", "wealth must map to MONEY");
assert(wealth.decisionType === "exploration", "wealth must remain exploration");
assert(wealth.requiredInsights.length === 4, "wealth needs four requiredInsights");
assert((wealth.excludedFocus?.length ?? 0) === 3, "wealth needs three excludedFocus items");

const wealthRequired = ids(wealth.requiredInsights);
for (const requiredId of [
  "money-operating-structure",
  "money-flow-coordination",
  "money-operating-pressure",
  "money-operating-review-action",
]) {
  assert(wealthRequired.has(requiredId), `wealth must require ${requiredId}`);
}

const wealthExcluded = ids(wealth.excludedFocus ?? []);
for (const excludedId of [
  "accumulation-preservation-allocation",
  "loss-exposure-early-warning",
  "saving-routine-continuity",
]) {
  assert(wealthExcluded.has(excludedId), `wealth must exclude ${excludedId}`);
}

for (const siblingInsight of [
  "accumulation-leak-pattern",
  "preservation-capacity-design",
  "income-allocation-routine",
  "loss-leak-pattern",
  "spending-risk-signal",
  "financial-vulnerability-condition",
  "saving-rule-continuity",
  "variable-spending-control",
  "routine-automation-readiness",
]) {
  assert(!wealthRequired.has(siblingInsight), `wealth must not require sibling insight ${siblingInsight}`);
}

for (const [siblingId, sibling] of siblings) {
  assert(wealth.userQuestion !== sibling.userQuestion, `wealth and ${siblingId} questions must differ`);
  assert(JSON.stringify(wealth.requiredInsights) !== JSON.stringify(sibling.requiredInsights), `wealth and ${siblingId} required insights must differ`);
  assert(JSON.stringify(wealth.actionFocus) !== JSON.stringify(sibling.actionFocus), `wealth and ${siblingId} actionFocus must differ`);
  assert(
    validatePremiumDepthSiblingDistinction(
      getPaidAnalysisPremiumDepthContract(wealth),
      getPaidAnalysisPremiumDepthContract(sibling),
    ).ok,
    `wealth and ${siblingId} must have distinct positive ownership`,
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
const wealthPrompt = buildPaidAnalysisDetailPromptV4({ ...basePromptInput, productId: "wealth" });

assert(wealthPrompt.includes("[반드시 다룰 핵심 통찰]"), "wealth needs required insights");
assert(wealthPrompt.includes("[이 상품의 경계]"), "wealth needs excluded focus");
assert(!wealthPrompt.includes('"decisionCheck": ['), "wealth must not request decisionCheck");
assert(wealthPrompt.includes("decisionCheck 필드를 출력하지 않는다"), "wealth must forbid decisionCheck");
for (const insight of wealth.requiredInsights) {
  assert(wealthPrompt.includes(insight.prompt), `wealth prompt must include ${insight.id}`);
}
for (const focus of wealth.excludedFocus ?? []) {
  assert(wealthPrompt.includes(focus.prompt), `wealth prompt must include excluded ${focus.id}`);
}
for (const [, sibling] of siblings) {
  assert(!wealthPrompt.includes(sibling.requiredInsights[0].prompt), "wealth prompt must not carry sibling-specific ownership");
}

const contract = formatTopicConfigForPrompt(wealth);
for (const prohibitedClaim of [
  "정확한 수입·자산·부채·지출 사실을 사주만으로 단정",
  "재물 증가·금융 성공을 보장",
  "특정 손실 금액이나 파산 시점을 예언",
  "대출·투자 실행을 지시",
  "축적 구조·손실 경고·저축 루틴을 중심 결론으로 제시",
]) {
  assert(contract.includes(prohibitedClaim), `wealth must prohibit ${prohibitedClaim}`);
}

const rules = getPaidAnalysisEngineRules("MONEY");
assert(rules.includes("TopicConfig의 단일 질문과 반드시 다룰 핵심 통찰"), "MONEY Engine must prioritize TopicConfig");
assert(rules.includes("제외한 범위를 핵심 결론이나 주된 action으로 확장하지 않는다"), "MONEY Engine must honor excludedFocus");
assert(!rules.includes("wealth") && !rules.includes("productId"), "MONEY Engine must not hardcode product IDs");

const metadata = [
  getPremiumProduct("wealth")?.description,
  ...(getPremiumProduct("wealth")?.details ?? []),
  ...(getPremiumProduct("wealth")?.recommendedFor ?? []),
  ...(getPremiumProduct("wealth")?.analysisFocus ?? []),
  ...(getPremiumProduct("wealth")?.expectedOutcome ?? []),
].join("\n");
for (const prohibitedPromise of ["돈을 벌어도 잘 모이지", "반복 누수", "보존선", "저축·예산", "자동 이체", "손실 노출", "대운·세운"]) {
  assert(!metadata.includes(prohibitedPromise), `wealth metadata must not promise ${prohibitedPromise}`);
}
for (const requiredPromise of ["수입", "지출", "책임", "활동", "계약", "운영", "우선순위"]) {
  assert(metadata.includes(requiredPromise), `wealth metadata must promise ${requiredPromise}`);
}

for (const evidenceKey of ["element_relations", "fortune_brain", "strength", "element_balance", "yongshin"] as const) {
  assert(wealth.evidenceFocus.includes(evidenceKey), `wealth must use ${evidenceKey}`);
}
assert(!wealth.evidenceFocus.includes("daeun"), "wealth must not use daeun as differentiator");
assert(!wealth.evidenceFocus.includes("seun"), "wealth must not use seun as differentiator");
assert(!wealth.evidenceFocus.includes("fortune_flow"), "wealth must not use fortune_flow for timing");

console.log("paid-analysis-v4-general-wealth-boundary-regression passed ✓");