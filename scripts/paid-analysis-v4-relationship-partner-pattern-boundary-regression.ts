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

function configOf(productId: "relationship" | "relationship-partner-pattern") {
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
const partnerPattern = configOf("relationship-partner-pattern");

assert(
  getPaidAnalysisEngine("relationship-partner-pattern") === "RELATIONSHIP",
  "partner-pattern must map to RELATIONSHIP",
);
assert(
  partnerPattern.decisionType === "exploration",
  "partner-pattern must remain exploration",
);
assert(
  partnerPattern.requiredInsights.length === 4,
  "partner-pattern needs four requiredInsights",
);
assert(
  (partnerPattern.excludedFocus?.length ?? 0) === 3,
  "partner-pattern needs three excludedFocus items",
);

for (const insight of [
  ...partnerPattern.requiredInsights,
  ...(partnerPattern.excludedFocus ?? []),
]) {
  assert(insight.id.trim().length > 0, "partner-pattern insight id must not be empty");
  assert(insight.prompt.trim().length > 0, "partner-pattern insight prompt must not be empty");
}

const relationshipRequired = ids(relationship.requiredInsights);
const partnerRequired = ids(partnerPattern.requiredInsights);
assert(
  [...relationshipRequired].sort().join("|") !== [...partnerRequired].sort().join("|"),
  "relationship and partner-pattern required insight sets must differ",
);
assert(
  relationship.userQuestion !== partnerPattern.userQuestion,
  "relationship and partner-pattern questions must differ",
);
assert(
  JSON.stringify(relationship.actionFocus) !== JSON.stringify(partnerPattern.actionFocus),
  "relationship and partner-pattern actionFocus must differ",
);

for (const partnerOnly of [
  "partner-selection-pattern",
  "role-expectation-pattern",
  "compatibility-verification-signal",
  "selection-adjustment-action",
]) {
  assert(!relationshipRequired.has(partnerOnly), `relationship must not require ${partnerOnly}`);
}

for (const excludedRequirement of [
  "relationship-pattern-map",
  "relationship-trigger-boundary",
  "relationship-response-pattern",
  "connection-opportunity-pattern",
  "initial-contact-style",
  "intimacy-pace-pattern",
  "emotional-opening-boundary",
  "boundary-overload-pattern",
  "distance-permission-standard",
  "current-relationship-core-problem",
  "continue-adjust-criteria",
  "separation-context",
  "recontact-signal",
]) {
  assert(
    !partnerRequired.has(excludedRequirement),
    `partner-pattern must not require sibling insight ${excludedRequirement}`,
  );
}

const partnerExcluded = ids(partnerPattern.excludedFocus ?? []);
for (const requiredExcluded of [
  "overall-relationship-operating-profile",
  "new-connection-acquisition",
  "current-marriage-reunion-outcome",
]) {
  assert(partnerExcluded.has(requiredExcluded), `partner-pattern must exclude ${requiredExcluded}`);
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

const relationshipPrompt = buildPaidAnalysisDetailPromptV4({
  ...basePromptInput,
  productId: "relationship",
});
const partnerPrompt = buildPaidAnalysisDetailPromptV4({
  ...basePromptInput,
  productId: "relationship-partner-pattern",
});

assert(partnerPrompt.includes("[반드시 다룰 핵심 통찰]"), "partner-pattern needs required insights");
assert(partnerPrompt.includes("[이 상품의 경계]"), "partner-pattern needs excluded focus");
assert(!partnerPrompt.includes('"decisionCheck": ['), "partner-pattern must not request decisionCheck");
assert(
  partnerPrompt.includes("decisionCheck 필드를 출력하지 않는다"),
  "partner-pattern must forbid decisionCheck",
);
for (const insight of partnerPattern.requiredInsights) {
  assert(partnerPrompt.includes(insight.prompt), `partner prompt must include ${insight.id}`);
}
assert(
  !partnerPrompt.includes(relationship.requiredInsights[0].prompt),
  "partner prompt must not carry general relationship insight",
);
assert(relationshipPrompt !== partnerPrompt, "relationship and partner prompts must differ");

const relationshipRules = getPaidAnalysisEngineRules("RELATIONSHIP");
assert(
  relationshipRules.includes("TopicConfig의 단일 질문과 반드시 다룰 핵심 통찰"),
  "RELATIONSHIP Engine must prioritize TopicConfig",
);
assert(
  relationshipRules.includes("제외한 범위를 핵심 결론이나 주된 action으로 확장하지 않는다"),
  "RELATIONSHIP Engine must honor excludedFocus",
);
assert(
  !relationshipRules.includes("relationship-partner-pattern") &&
    !relationshipRules.includes("productId"),
  "RELATIONSHIP Engine must not hardcode product IDs",
);

const metadata = [
  getPremiumProduct("relationship-partner-pattern")?.description,
  ...(getPremiumProduct("relationship-partner-pattern")?.details ?? []),
].join("\n");
for (const prohibitedPromise of [
  "이상형",
  "운명적 상대",
  "미래 배우자의 외모",
  "새 인연 발생 시기",
  "만남 장소",
  "현재 특정 상대 적합도",
  "결혼 가능성",
  "관계 전반 운영",
]) {
  assert(
    !metadata.includes(prohibitedPromise),
    `partner-pattern metadata must not promise ${prohibitedPromise}`,
  );
}
for (const requiredPromise of ["반복", "역할", "적합", "선택 기준"]) {
  assert(
    metadata.includes(requiredPromise),
    `partner-pattern metadata must promise ${requiredPromise}`,
  );
}

assert(
  formatTopicConfigForPrompt(relationship) !== formatTopicConfigForPrompt(partnerPattern),
  "relationship and partner-pattern specialization contracts must differ",
);

console.log("paid-analysis-v4-relationship-partner-pattern-boundary-regression passed ✓");