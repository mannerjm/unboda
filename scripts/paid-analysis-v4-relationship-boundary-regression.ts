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

function configOf(productId: "relationship" | "relationship-current") {
  const config = getPaidAnalysisTopicConfig(productId);

  if (!config) {
    throw new Error(`FAIL: missing config for ${productId}`);
  }

  return config;
}

function ids(items: { id: string }[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

const relationship = configOf("relationship");
const current = configOf("relationship-current");

assert(
  relationship.decisionType === "exploration",
  "relationship must remain exploration for verification routing",
);
assert(
  current.decisionType === "decision",
  "relationship-current must remain decision for verification routing",
);

for (const [productId, config] of [
  ["relationship", relationship],
  ["relationship-current", current],
] as const) {
  assert(
    config.requiredInsights.length >= 2 && config.requiredInsights.length <= 4,
    `${productId} needs 2-4 requiredInsights`,
  );
  assert(
    (config.excludedFocus?.length ?? 0) <= 3,
    `${productId} needs at most 3 excludedFocus items`,
  );

  for (const insight of [...config.requiredInsights, ...(config.excludedFocus ?? [])]) {
    assert(insight.id.trim().length > 0, `${productId} insight id must not be empty`);
    assert(insight.prompt.trim().length > 0, `${productId} insight prompt must not be empty`);
  }
}

const relationshipRequired = ids(relationship.requiredInsights);
const currentRequired = ids(current.requiredInsights);

for (const currentOnly of [
  "current-relationship-core-problem",
  "observable-relationship-signals",
  "continue-adjust-criteria",
]) {
  assert(
    !relationshipRequired.has(currentOnly),
    `relationship must not require ${currentOnly}`,
  );
}

for (const generalOnly of [
  "relationship-operating-structure",
  "reciprocity-emotional-load",
  "relationship-operating-review-action",
]) {
  assert(
    !currentRequired.has(generalOnly),
    `relationship-current must not require ${generalOnly}`,
  );
}

const relationshipExcluded = ids(relationship.excludedFocus ?? []);
const currentExcluded = ids(current.excludedFocus ?? []);
assert(
  relationshipExcluded.has("specific-current-or-reunion-decision"),
  "relationship must yield current-person and reunion decisions",
);
assert(
  currentRequired.has("continue-adjust-criteria") &&
    currentRequired.has("observable-relationship-signals"),
  "relationship-current must require decision criteria and observable signals",
);
assert(
  currentExcluded.has("overall-relationship-profile") &&
    currentExcluded.has("relationship-type-boundary-design"),
  "relationship-current must yield the general relationship profile and boundary design",
);
assert(
  relationshipRequired.has("relationship-operating-structure") &&
    relationshipRequired.has("reciprocity-emotional-load"),
  "relationship must require cross-relationship operating structure and reciprocity load",
);
assert(
  relationship.userQuestion !== current.userQuestion,
  "relationship siblings must ask different questions",
);
assert(
  JSON.stringify(relationship.actionFocus) !== JSON.stringify(current.actionFocus),
  "relationship siblings must have different actionFocus",
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

function promptFor(productId: string): string {
  return buildPaidAnalysisDetailPromptV4({ ...basePromptInput, productId });
}

const relationshipPrompt = promptFor("relationship");
const currentPrompt = promptFor("relationship-current");

for (const [productId, config, prompt] of [
  ["relationship", relationship, relationshipPrompt],
  ["relationship-current", current, currentPrompt],
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
}

assert(
  !relationshipPrompt.includes(current.requiredInsights[0].prompt),
  "relationship prompt must not carry current-only required insight",
);
assert(
  !currentPrompt.includes(relationship.requiredInsights[0].prompt),
  "relationship-current prompt must not carry general-only required insight",
);
assert(relationshipPrompt !== currentPrompt, "relationship sibling prompts must differ");

const relationshipRules = getPaidAnalysisEngineRules("RELATIONSHIP");
assert(
  relationshipRules.includes("TopicConfig의 단일 질문과 반드시 다룰 핵심 통찰"),
  "RELATIONSHIP Engine must prioritize the TopicConfig boundary",
);
assert(
  relationshipRules.includes("제외한 범위를 핵심 결론이나 주된 action으로 확장하지 않는다"),
  "RELATIONSHIP Engine must honor excluded scope",
);
assert(
  !relationshipRules.includes("relationship-current") && !relationshipRules.includes('productId'),
  "RELATIONSHIP Engine must not hardcode sibling product IDs",
);

const relationshipMetadata = [
  getPremiumProduct("relationship")?.description,
  ...(getPremiumProduct("relationship")?.details ?? []),
].join("\n");
for (const removedCurrentPromise of [
  "현재 관계에서 살펴볼 핵심 포인트",
  "현재 관계 흐름이 나타나는",
  "새로운 인연과 관계 변화가 강해지는 시기",
]) {
  assert(
    !relationshipMetadata.includes(removedCurrentPromise),
    `relationship metadata must not promise current-specific scope: ${removedCurrentPromise}`,
  );
}

assert(
  currentPrompt.includes('"decisionCheck": ['),
  "relationship-current must retain the decisionCheck JSON contract",
);
assert(
  currentPrompt.includes("decisionCheck: 3개 이상 5개 이하"),
  "relationship-current must retain the decisionCheck count rule",
);
assert(
  formatTopicConfigForPrompt(relationship) !== formatTopicConfigForPrompt(current),
  "relationship specialization contracts must differ",
);

console.log("paid-analysis-v4-relationship-boundary-regression passed ✓");
