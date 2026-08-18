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
    | "relationship"
    | "relationship-current"
    | "relationship-reunion"
    | "relationship-partner-pattern"
    | "relationship-marriage",
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

const relationship = configOf("relationship");
const current = configOf("relationship-current");
const reunion = configOf("relationship-reunion");
const partnerPattern = configOf("relationship-partner-pattern");
const marriage = configOf("relationship-marriage");

assert(
  getPaidAnalysisEngine("relationship-marriage") === "RELATIONSHIP",
  "relationship-marriage must map to RELATIONSHIP",
);
assert(marriage.decisionType === "exploration", "relationship-marriage must be exploration");
assert(marriage.requiredInsights.length === 4, "relationship-marriage needs four requiredInsights");
assert((marriage.excludedFocus?.length ?? 0) === 3, "relationship-marriage needs three excludedFocus items");

const marriageRequired = ids(marriage.requiredInsights);
for (const requiredId of [
  "shared-life-condition",
  "role-responsibility-readiness",
  "practical-friction-signal",
  "commitment-preparation-action",
]) {
  assert(marriageRequired.has(requiredId), `relationship-marriage must require ${requiredId}`);
}

for (const insight of [...marriage.requiredInsights, ...(marriage.excludedFocus ?? [])]) {
  assert(insight.id.trim().length > 0, "relationship-marriage insight id must not be empty");
  assert(insight.prompt.trim().length > 0, "relationship-marriage insight prompt must not be empty");
}

const marriageExcluded = ids(marriage.excludedFocus ?? []);
for (const excludedId of [
  "specific-person-marriage-outcome",
  "marriage-timing-prediction",
  "future-spouse-profile",
]) {
  assert(marriageExcluded.has(excludedId), `relationship-marriage must exclude ${excludedId}`);
}

for (const [siblingId, sibling] of [
  ["relationship", relationship],
  ["relationship-current", current],
  ["relationship-reunion", reunion],
  ["relationship-partner-pattern", partnerPattern],
] as const) {
  assert(marriage.userQuestion !== sibling.userQuestion, `marriage and ${siblingId} questions must differ`);
  assert(
    JSON.stringify(marriage.requiredInsights) !== JSON.stringify(sibling.requiredInsights),
    `marriage and ${siblingId} required insights must differ`,
  );
  assert(
    JSON.stringify(marriage.actionFocus) !== JSON.stringify(sibling.actionFocus),
    `marriage and ${siblingId} actionFocus must differ`,
  );
}

for (const siblingInsight of [
  "relationship-pattern-map",
  "relationship-response-pattern",
  "current-relationship-core-problem",
  "continue-adjust-criteria",
  "separation-context",
  "recontact-signal",
  "partner-selection-pattern",
  "compatibility-verification-signal",
]) {
  assert(
    !marriageRequired.has(siblingInsight),
    `relationship-marriage must not require sibling insight ${siblingInsight}`,
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

const marriagePrompt = buildPaidAnalysisDetailPromptV4({
  ...basePromptInput,
  productId: "relationship-marriage",
});

assert(marriagePrompt.includes("[반드시 다룰 핵심 통찰]"), "marriage needs required insights");
assert(marriagePrompt.includes("[이 상품의 경계]"), "marriage needs excluded focus");
assert(!marriagePrompt.includes('"decisionCheck": ['), "marriage must not request decisionCheck");
assert(marriagePrompt.includes("decisionCheck 필드를 출력하지 않는다"), "marriage must forbid decisionCheck");
for (const insight of marriage.requiredInsights) {
  assert(marriagePrompt.includes(insight.prompt), `marriage prompt must include ${insight.id}`);
}
for (const focus of marriage.excludedFocus ?? []) {
  assert(marriagePrompt.includes(focus.prompt), `marriage prompt must include excluded ${focus.id}`);
}

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
  !relationshipRules.includes("relationship-marriage") && !relationshipRules.includes("productId"),
  "RELATIONSHIP Engine must not hardcode product IDs",
);

const metadata = [
  getPremiumProduct("relationship-marriage")?.description,
  ...(getPremiumProduct("relationship-marriage")?.details ?? []),
].join("\n");
for (const prohibitedPromise of [
  "시기 흐름",
  "결정의 압력",
  "관계 진행 시나리오",
  "결혼 적기",
  "미래 배우자",
  "결혼 가능성",
  "결혼 결과",
]) {
  assert(!metadata.includes(prohibitedPromise), `marriage metadata must not promise ${prohibitedPromise}`);
}
for (const requiredPromise of ["생활", "역할", "책임", "마찰", "준비"]) {
  assert(metadata.includes(requiredPromise), `marriage metadata must promise ${requiredPromise}`);
}

assert(
  formatTopicConfigForPrompt(marriage) !== formatTopicConfigForPrompt(relationship),
  "marriage and relationship specialization contracts must differ",
);

console.log("paid-analysis-v4-relationship-marriage-boundary-regression passed ✓");