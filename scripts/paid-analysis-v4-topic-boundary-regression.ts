import {
  formatTopicConfigForPrompt,
  getPaidAnalysisTopicConfig,
} from "../app/lib/paidAnalysisTopicConfig";
import { getPaidAnalysisEngineRules } from "../app/lib/paidAnalysisEngine";
import { buildPaidAnalysisDetailPromptV4 } from "../app/lib/paidAnalysisDetailPrompt";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function configOf(productId: "wealth" | "money-wealth-accumulation") {
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

for (const [productId, config] of [
  ["wealth", wealth],
  ["money-wealth-accumulation", accumulation],
] as const) {
  assert(
    config.requiredInsights.length >= 2 && config.requiredInsights.length <= 4,
    `${productId} needs 2-4 requiredInsights`,
  );
  assert(
    (config.excludedFocus?.length ?? 0) <= 3,
    `${productId} needs at most 3 excludedFocus items`,
  );
  assert(config.actionFocus.length >= 2, `${productId} needs 2+ actionFocus`);

  for (const insight of [...config.requiredInsights, ...(config.excludedFocus ?? [])]) {
    assert(insight.id.trim().length > 0, `${productId} insight id must not be empty`);
    assert(insight.prompt.trim().length > 0, `${productId} insight prompt must not be empty`);
  }
}

assert(
  wealth.userQuestion !== accumulation.userQuestion,
  "MONEY siblings must ask different user questions",
);
assert(
  JSON.stringify(wealth.actionFocus) !== JSON.stringify(accumulation.actionFocus),
  "MONEY siblings must have different actionFocus",
);
assert(
  JSON.stringify(wealth.evidenceFocus) !== JSON.stringify(accumulation.evidenceFocus),
  "MONEY siblings must retain different evidenceFocus",
);
assert(
  [...ids(wealth.requiredInsights)].sort().join("|") !==
    [...ids(accumulation.requiredInsights)].sort().join("|"),
  "MONEY siblings must have different required insight sets",
);

const wealthExcluded = ids(wealth.excludedFocus ?? []);
const accumulationRequired = ids(accumulation.requiredInsights);
assert(
  [...wealthExcluded].filter((id) => accumulationRequired.has(id)).length >= 2,
  "wealth must yield its accumulation boundary to accumulation required insights",
);

const accumulationExcluded = ids(accumulation.excludedFocus ?? []);
const wealthRequired = ids(wealth.requiredInsights);
assert(
  [...accumulationExcluded].filter((id) => wealthRequired.has(id)).length >= 2,
  "accumulation must yield broad operating judgments to wealth required insights",
);

const basePromptInput = {
  analysisType: "테스트 분석",
  birthData: "birth",
  originalChart: "chart",
  coreInterpretation: "core",
  fortuneTiming: "timing",
  sajuSummary: "summary",
  currentFortuneFlow: "flow",
};

const wealthPrompt = buildPaidAnalysisDetailPromptV4({
  ...basePromptInput,
  productId: "wealth",
});
const accumulationPrompt = buildPaidAnalysisDetailPromptV4({
  ...basePromptInput,
  productId: "money-wealth-accumulation",
});

for (const [productId, config, prompt] of [
  ["wealth", wealth, wealthPrompt],
  ["money-wealth-accumulation", accumulation, accumulationPrompt],
] as const) {
  assert(
    prompt.includes("[반드시 다룰 핵심 통찰]"),
    `${productId} prompt must include required insights`,
  );
  assert(
    prompt.includes("[이 상품의 경계]"),
    `${productId} prompt must include excluded scope`,
  );

  for (const insight of config.requiredInsights) {
    assert(prompt.includes(insight.prompt), `${productId} must include ${insight.id}`);
  }

  for (const insight of config.excludedFocus ?? []) {
    assert(prompt.includes(insight.prompt), `${productId} must include excluded ${insight.id}`);
  }
}

assert(
  !wealthPrompt.includes(accumulation.requiredInsights[0].prompt),
  "wealth prompt must not carry accumulation-only required insights",
);
assert(
  !accumulationPrompt.includes(wealth.requiredInsights[0].prompt),
  "accumulation prompt must not carry wealth-only required insights",
);
assert(wealthPrompt !== accumulationPrompt, "MONEY sibling prompts must differ");

const moneyEngineRules = getPaidAnalysisEngineRules("MONEY");
assert(
  moneyEngineRules.includes("TopicConfig의 단일 질문과 반드시 다룰 핵심 통찰"),
  "MONEY Engine must prioritize the TopicConfig boundary",
);
assert(
  moneyEngineRules.includes("제외한 범위를 핵심 결론이나 주된 action으로 확장하지 않는다"),
  "MONEY Engine must honor excluded scope",
);
assert(
  !moneyEngineRules.includes("wealth") &&
    !moneyEngineRules.includes("money-wealth-accumulation"),
  "MONEY Engine must not hardcode product IDs",
);

const wealthRegistry = getPremiumProduct("wealth");
assert(Boolean(wealthRegistry), "wealth must remain in the registry");
const wealthMetadata = [
  wealthRegistry?.description,
  ...(wealthRegistry?.details ?? []),
  ...(wealthRegistry?.recommendedFor ?? []),
  ...(wealthRegistry?.expectedOutcome ?? []),
].join("\n");

for (const removedBoundaryPromise of [
  "돈을 벌어도 잘 모이지 않는 이유",
  "장기적으로 자신에게 맞는 재물 축적 방식",
  "돈이 들어오는 구조와 남는 구조의 차이",
]) {
  assert(
    !wealthMetadata.includes(removedBoundaryPromise),
    `wealth metadata must not promise accumulation scope: ${removedBoundaryPromise}`,
  );
}

const accumulationRegistry = getPremiumProduct("money-wealth-accumulation");
assert(Boolean(accumulationRegistry), "accumulation must remain in the registry");
const accumulationMetadata = [
  accumulationRegistry?.description,
  ...(accumulationRegistry?.details ?? []),
].join("\n");

for (const requiredBoundaryPromise of ["반복 누수", "보존", "축적"]) {
  assert(
    accumulationMetadata.includes(requiredBoundaryPromise),
    `accumulation metadata must retain its boundary: ${requiredBoundaryPromise}`,
  );
}

const wealthContract = formatTopicConfigForPrompt(wealth);
const accumulationContract = formatTopicConfigForPrompt(accumulation);
assert(wealthContract !== accumulationContract, "MONEY contracts must differ");

console.log("paid-analysis-v4-topic-boundary-regression passed ✓");
