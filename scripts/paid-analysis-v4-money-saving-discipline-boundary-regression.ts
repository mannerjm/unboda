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
  productId:
    | "money-wealth-accumulation"
    | "money-leak-risk"
    | "money-saving-discipline",
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

const accumulation = configOf("money-wealth-accumulation");
const leakRisk = configOf("money-leak-risk");
const savingDiscipline = configOf("money-saving-discipline");

assert(Boolean(getPremiumProduct("money-saving-discipline")), "saving-discipline must exist in registry");
assert(getPaidAnalysisEngine("money-saving-discipline") === "MONEY", "saving-discipline must map to MONEY");
assert(savingDiscipline.decisionType === "exploration", "saving-discipline must be exploration");
assert(savingDiscipline.requiredInsights.length === 4, "saving-discipline needs four requiredInsights");
assert((savingDiscipline.excludedFocus?.length ?? 0) === 3, "saving-discipline needs three excludedFocus items");

for (const insight of [...savingDiscipline.requiredInsights, ...(savingDiscipline.excludedFocus ?? [])]) {
  assert(insight.id.trim().length > 0, "saving-discipline insight id must not be empty");
  assert(insight.prompt.trim().length > 0, "saving-discipline insight prompt must not be empty");
}

const savingRequired = ids(savingDiscipline.requiredInsights);
for (const requiredId of [
  "saving-rule-continuity",
  "variable-spending-control",
  "routine-automation-readiness",
  "reset-discipline-action",
]) {
  assert(savingRequired.has(requiredId), `saving-discipline must require ${requiredId}`);
}

const savingExcluded = ids(savingDiscipline.excludedFocus ?? []);
for (const excludedId of [
  "accumulation-preservation-capacity",
  "loss-exposure-early-warning",
  "investment-or-income-expansion",
]) {
  assert(savingExcluded.has(excludedId), `saving-discipline must exclude ${excludedId}`);
}

for (const siblingInsight of [
  "accumulation-leak-pattern",
  "preservation-capacity-design",
  "income-allocation-routine",
  "loss-leak-pattern",
  "spending-risk-signal",
  "financial-vulnerability-condition",
]) {
  assert(
    !savingRequired.has(siblingInsight),
    `saving-discipline must not require sibling insight ${siblingInsight}`,
  );
}

for (const [siblingId, sibling] of [
  ["money-wealth-accumulation", accumulation],
  ["money-leak-risk", leakRisk],
] as const) {
  assert(savingDiscipline.userQuestion !== sibling.userQuestion, `saving-discipline and ${siblingId} questions must differ`);
  assert(
    JSON.stringify(savingDiscipline.requiredInsights) !== JSON.stringify(sibling.requiredInsights),
    `saving-discipline and ${siblingId} required insights must differ`,
  );
  assert(
    JSON.stringify(savingDiscipline.actionFocus) !== JSON.stringify(sibling.actionFocus),
    `saving-discipline and ${siblingId} actionFocus must differ`,
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

const savingPrompt = buildPaidAnalysisDetailPromptV4({
  ...basePromptInput,
  productId: "money-saving-discipline",
});
const accumulationPrompt = buildPaidAnalysisDetailPromptV4({
  ...basePromptInput,
  productId: "money-wealth-accumulation",
});
const leakPrompt = buildPaidAnalysisDetailPromptV4({
  ...basePromptInput,
  productId: "money-leak-risk",
});

assert(savingPrompt.includes("[반드시 다룰 핵심 통찰]"), "saving-discipline needs required insights");
assert(savingPrompt.includes("[이 상품의 경계]"), "saving-discipline needs excluded focus");
assert(!savingPrompt.includes('"decisionCheck": ['), "saving-discipline must not request decisionCheck");
assert(savingPrompt.includes("decisionCheck 필드를 출력하지 않는다"), "saving-discipline must forbid decisionCheck");
for (const insight of savingDiscipline.requiredInsights) {
  assert(savingPrompt.includes(insight.prompt), `saving prompt must include ${insight.id}`);
}
for (const focus of savingDiscipline.excludedFocus ?? []) {
  assert(savingPrompt.includes(focus.prompt), `saving prompt must include excluded ${focus.id}`);
}
assert(!savingPrompt.includes(accumulation.requiredInsights[0].prompt), "saving prompt must not carry accumulation insight");
assert(!savingPrompt.includes(leakRisk.requiredInsights[0].prompt), "saving prompt must not carry leak-risk insight");
assert(savingPrompt !== accumulationPrompt, "saving-discipline and accumulation prompts must differ");
assert(savingPrompt !== leakPrompt, "saving-discipline and leak-risk prompts must differ");

const promptContract = formatTopicConfigForPrompt(savingDiscipline);
for (const prohibitedClaim of [
  "특정 저축액·자산 증가 보장",
  "부자가 되는 시기 단정",
  "특정 투자 상품·종목·코인·부동산 추천",
  "사주만으로 실제 소비·부채 사실 단정",
  "특정 월·연도 자산 증가 예언",
  "금융 성공·실패 확정",
  "대출·투자·저축 상품 실행 강제",
]) {
  assert(promptContract.includes(prohibitedClaim), `saving-discipline must prohibit ${prohibitedClaim}`);
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
  !moneyRules.includes("money-saving-discipline") && !moneyRules.includes("productId"),
  "MONEY Engine must not hardcode product IDs",
);

const metadata = [
  getPremiumProduct("money-saving-discipline")?.description,
  ...(getPremiumProduct("money-saving-discipline")?.details ?? []),
].join("\n");
for (const prohibitedPromise of ["돈을 유지하는 힘", "자산 관리 패턴", "보존과 확대", "지출 통제", "현금 흘름 점검"]) {
  assert(!metadata.includes(prohibitedPromise), `saving metadata must not promise ${prohibitedPromise}`);
}
for (const requiredPromise of ["저축", "예산", "자동", "재설정", "반복"]) {
  assert(metadata.includes(requiredPromise), `saving metadata must promise ${requiredPromise}`);
}

for (const evidenceKey of ["element_relations", "fortune_brain", "strength", "element_balance", "yongshin"] as const) {
  assert(savingDiscipline.evidenceFocus.includes(evidenceKey), `saving-discipline must use ${evidenceKey}`);
}
assert(!savingDiscipline.evidenceFocus.includes("daeun"), "saving-discipline must not use daeun as differentiator");
assert(!savingDiscipline.evidenceFocus.includes("seun"), "saving-discipline must not use seun as differentiator");
assert(!savingDiscipline.evidenceFocus.includes("fortune_flow"), "saving-discipline must not use fortune_flow for timing");

console.log("paid-analysis-v4-money-saving-discipline-boundary-regression passed ✓");