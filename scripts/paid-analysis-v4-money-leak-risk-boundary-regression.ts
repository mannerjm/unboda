import {
  formatTopicConfigForPrompt,
  getPaidAnalysisTopicConfig,
} from "../app/lib/paidAnalysisTopicConfig";
import {
  getPaidAnalysisEngine,
  getPaidAnalysisEngineRules,
} from "../app/lib/paidAnalysisEngine";
import { buildPaidAnalysisDetailPromptV4 } from "../app/lib/paidAnalysisDetailPrompt";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function configOf(
  productId: "wealth" | "money-wealth-accumulation" | "money-leak-risk",
) {
  const config = getPaidAnalysisTopicConfig(productId);

  if (!config) {
    throw new Error(`FAIL: missing config for ${productId}`);
  }

  return config;
}

function ids(items: { id: string }[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

const wealth = configOf("wealth");
const accumulation = configOf("money-wealth-accumulation");
const leakRisk = configOf("money-leak-risk");

assert(Boolean(getPremiumProduct("money-leak-risk")), "money-leak-risk must exist in registry");
assert(getPaidAnalysisEngine("money-leak-risk") === "MONEY", "money-leak-risk must map to MONEY");
assert(leakRisk.decisionType === "exploration", "money-leak-risk must be exploration");
assert(leakRisk.requiredInsights.length === 4, "money-leak-risk needs four requiredInsights");
assert((leakRisk.excludedFocus?.length ?? 0) === 3, "money-leak-risk needs three excludedFocus items");

for (const insight of [...leakRisk.requiredInsights, ...(leakRisk.excludedFocus ?? [])]) {
  assert(insight.id.trim().length > 0, "money-leak-risk insight id must not be empty");
  assert(insight.prompt.trim().length > 0, "money-leak-risk insight prompt must not be empty");
}

const leakRequired = ids(leakRisk.requiredInsights);
for (const requiredId of [
  "loss-leak-pattern",
  "spending-risk-signal",
  "financial-vulnerability-condition",
  "leak-reduction-action",
]) {
  assert(leakRequired.has(requiredId), `money-leak-risk must require ${requiredId}`);
}

const leakExcluded = ids(leakRisk.excludedFocus ?? []);
for (const excludedId of [
  "wealth-accumulation-profile",
  "saving-discipline-routine",
  "investment-or-income-expansion",
]) {
  assert(leakExcluded.has(excludedId), `money-leak-risk must exclude ${excludedId}`);
}

for (const siblingInsight of [
  "income-path-quality",
  "overall-money-direction",
  "accumulation-leak-pattern",
  "preservation-capacity-design",
  "income-allocation-routine",
]) {
  assert(
    !leakRequired.has(siblingInsight),
    `money-leak-risk must not require sibling insight ${siblingInsight}`,
  );
}

for (const [siblingId, sibling] of [
  ["wealth", wealth],
  ["money-wealth-accumulation", accumulation],
] as const) {
  assert(leakRisk.userQuestion !== sibling.userQuestion, `leak-risk and ${siblingId} questions must differ`);
  assert(
    JSON.stringify(leakRisk.requiredInsights) !== JSON.stringify(sibling.requiredInsights),
    `leak-risk and ${siblingId} required insights must differ`,
  );
  assert(
    JSON.stringify(leakRisk.actionFocus) !== JSON.stringify(sibling.actionFocus),
    `leak-risk and ${siblingId} actionFocus must differ`,
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

const leakPrompt = buildPaidAnalysisDetailPromptV4({
  ...basePromptInput,
  productId: "money-leak-risk",
});
const wealthPrompt = buildPaidAnalysisDetailPromptV4({ ...basePromptInput, productId: "wealth" });
const accumulationPrompt = buildPaidAnalysisDetailPromptV4({
  ...basePromptInput,
  productId: "money-wealth-accumulation",
});

assert(leakPrompt.includes("[반드시 다룰 핵심 통찰]"), "leak-risk needs required insights");
assert(leakPrompt.includes("[이 상품의 경계]"), "leak-risk needs excluded focus");
assert(!leakPrompt.includes('"decisionCheck": ['), "leak-risk must not request decisionCheck");
assert(leakPrompt.includes("decisionCheck 필드를 출력하지 않는다"), "leak-risk must forbid decisionCheck");
for (const insight of leakRisk.requiredInsights) {
  assert(leakPrompt.includes(insight.prompt), `leak-risk prompt must include ${insight.id}`);
}
for (const focus of leakRisk.excludedFocus ?? []) {
  assert(leakPrompt.includes(focus.prompt), `leak-risk prompt must include excluded ${focus.id}`);
}
assert(!leakPrompt.includes(wealth.requiredInsights[0].prompt), "leak-risk prompt must not carry wealth insight");
assert(!leakPrompt.includes(accumulation.requiredInsights[0].prompt), "leak-risk prompt must not carry accumulation insight");
assert(leakPrompt !== wealthPrompt, "leak-risk and wealth prompts must differ");
assert(leakPrompt !== accumulationPrompt, "leak-risk and accumulation prompts must differ");

const promptContract = formatTopicConfigForPrompt(leakRisk);
for (const prohibitedClaim of [
  "특정 투자 손실·수익 보장",
  "종목·코인·부동산 매수·매도 추천",
  "특정 금액의 손실 예언",
  "특정 월·연도의 파산·손실 시점 단정",
  "대출·투자 실행을 강제하는 결론",
  "사주만으로 실제 소비·부채 사실을 단정",
  "재정 성공·실패를 운명처럼 확정",
]) {
  assert(promptContract.includes(prohibitedClaim), `leak-risk must prohibit ${prohibitedClaim}`);
}

const moneyRules = getPaidAnalysisEngineRules("MONEY");
assert(
  moneyRules.includes("TopicConfig의 단일 질문과 반드시 다룰 핵심 통찰"),
  "MONEY Engine must prioritize TopicConfig",
);
assert(
  moneyRules.includes("제외한 범위를 핵심 결론이나 주된 action으로 확장하지 않는다"),
  "MONEY Engine must honor excludedFocus",
);
assert(
  !moneyRules.includes("money-leak-risk") && !moneyRules.includes("productId"),
  "MONEY Engine must not hardcode product IDs",
);

const metadata = [
  getPremiumProduct("money-leak-risk")?.description,
  ...(getPremiumProduct("money-leak-risk")?.details ?? []),
].join("\n");
for (const accumulationPromise of ["반복 누수", "돈이 남지 않음", "보존선", "축적 여력"]) {
  assert(!metadata.includes(accumulationPromise), `leak-risk metadata must not promise ${accumulationPromise}`);
}
for (const requiredPromise of ["손실 노출", "계약", "공동 부담", "위험"]) {
  assert(metadata.includes(requiredPromise), `leak-risk metadata must promise ${requiredPromise}`);
}

for (const evidenceKey of ["element_relations", "fortune_brain", "strength", "element_balance", "fortune_flow"] as const) {
  assert(leakRisk.evidenceFocus.includes(evidenceKey), `leak-risk must use ${evidenceKey}`);
}
assert(!leakRisk.evidenceFocus.includes("daeun"), "leak-risk must not use daeun as differentiator");
assert(!leakRisk.evidenceFocus.includes("seun"), "leak-risk must not use seun as differentiator");

console.log("paid-analysis-v4-money-leak-risk-boundary-regression passed ✓");