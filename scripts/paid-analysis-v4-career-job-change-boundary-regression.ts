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
  productId: "career-job-change" | "career-job-fit" | "career-specialization",
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

const jobChange = configOf("career-job-change");
const jobFit = configOf("career-job-fit");
const specialization = configOf("career-specialization");

assert(
  getPaidAnalysisEngine("career-job-change") === "CAREER",
  "career-job-change must map to CAREER",
);
assert(jobChange.decisionType === "decision", "career-job-change must remain decision");
assert(jobChange.requiredInsights.length === 4, "career-job-change needs four requiredInsights");
assert((jobChange.excludedFocus?.length ?? 0) === 3, "career-job-change needs three excludedFocus items");

for (const insight of [...jobChange.requiredInsights, ...(jobChange.excludedFocus ?? [])]) {
  assert(insight.id.trim().length > 0, "career-job-change insight id must not be empty");
  assert(insight.prompt.trim().length > 0, "career-job-change insight prompt must not be empty");
}

const jobChangeRequired = ids(jobChange.requiredInsights);
for (const requiredId of [
  "stay-move-decision-criteria",
  "change-readiness-signal",
  "transition-risk-condition",
  "job-change-preparation-action",
]) {
  assert(jobChangeRequired.has(requiredId), `career-job-change must require ${requiredId}`);
}

const jobChangeExcluded = ids(jobChange.excludedFocus ?? []);
for (const excludedId of [
  "overall-job-fit-profile",
  "specialization-or-promotion-path",
  "organization-or-independence-profile",
]) {
  assert(jobChangeExcluded.has(excludedId), `career-job-change must exclude ${excludedId}`);
}

for (const siblingInsight of [
  "work-style-fit",
  "role-environment-fit",
  "fit-verification-action",
  "specialization-direction",
  "depth-vs-breadth",
  "recognition-path",
]) {
  assert(
    !jobChangeRequired.has(siblingInsight),
    `career-job-change must not require sibling insight ${siblingInsight}`,
  );
}

for (const [siblingId, sibling] of [
  ["career-job-fit", jobFit],
  ["career-specialization", specialization],
] as const) {
  assert(jobChange.userQuestion !== sibling.userQuestion, `job-change and ${siblingId} questions must differ`);
  assert(
    JSON.stringify(jobChange.requiredInsights) !== JSON.stringify(sibling.requiredInsights),
    `job-change and ${siblingId} required insights must differ`,
  );
  assert(
    JSON.stringify(jobChange.actionFocus) !== JSON.stringify(sibling.actionFocus),
    `job-change and ${siblingId} actionFocus must differ`,
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

const jobChangePrompt = buildPaidAnalysisDetailPromptV4({
  ...basePromptInput,
  productId: "career-job-change",
});
const jobFitPrompt = buildPaidAnalysisDetailPromptV4({
  ...basePromptInput,
  productId: "career-job-fit",
});
const specializationPrompt = buildPaidAnalysisDetailPromptV4({
  ...basePromptInput,
  productId: "career-specialization",
});

assert(jobChangePrompt.includes("[반드시 다룰 핵심 통찰]"), "job-change needs required insights");
assert(jobChangePrompt.includes("[이 상품의 경계]"), "job-change needs excluded focus");
assert(jobChangePrompt.includes('"decisionCheck": ['), "job-change must request decisionCheck");
assert(jobChangePrompt.includes("decisionCheck: 3개 이상 5개 이하"), "job-change needs decisionCheck count rule");
for (const insight of jobChange.requiredInsights) {
  assert(jobChangePrompt.includes(insight.prompt), `job-change prompt must include ${insight.id}`);
}
for (const focus of jobChange.excludedFocus ?? []) {
  assert(jobChangePrompt.includes(focus.prompt), `job-change prompt must include excluded ${focus.id}`);
}
assert(!jobChangePrompt.includes(jobFit.requiredInsights[0].prompt), "job-change prompt must not carry job-fit insight");
assert(!jobChangePrompt.includes(specialization.requiredInsights[0].prompt), "job-change prompt must not carry specialization insight");
assert(jobChangePrompt !== jobFitPrompt, "job-change and job-fit prompts must differ");
assert(jobChangePrompt !== specializationPrompt, "job-change and specialization prompts must differ");

const promptContract = formatTopicConfigForPrompt(jobChange);
for (const prohibitedClaim of [
  "이직 시기를 특정 연도나 월로 단정",
  "합격이나 채용 결과 확정",
  "반드시 퇴사하거나 이직해야 한다는 단정",
  "이직 성공이나 연봉 상승 보장",
  "현재 회사에 남으면 실패한다는 단정",
  "사주만으로 특정 직장 선택을 확정",
]) {
  assert(promptContract.includes(prohibitedClaim), `job-change must prohibit ${prohibitedClaim}`);
}

const careerRules = getPaidAnalysisEngineRules("CAREER");
assert(
  careerRules.includes("TopicConfig의 단일 질문과 반드시 다룰 핵심 통찰"),
  "CAREER Engine must prioritize TopicConfig",
);
assert(
  careerRules.includes("제외한 범위를 핵심 결론이나 주된 action으로 확장하지 않는다"),
  "CAREER Engine must honor excludedFocus",
);
assert(
  !careerRules.includes("career-job-change") && !careerRules.includes("productId"),
  "CAREER Engine must not hardcode product IDs",
);

const jobChangeMetadata = [
  getPremiumProduct("career-job-change")?.description,
  ...(getPremiumProduct("career-job-change")?.details ?? []),
].join("\n");
for (const prohibitedPromise of ["특정 회사", "합격 보장", "연봉 상승 보장", "특정 연도"]) {
  assert(!jobChangeMetadata.includes(prohibitedPromise), `job-change metadata must not promise ${prohibitedPromise}`);
}
for (const requiredPromise of ["유지할지 이동할지", "판단", "준비"]) {
  assert(jobChangeMetadata.includes(requiredPromise), `job-change metadata must promise ${requiredPromise}`);
}

for (const productId of ["career-promotion", "career-organization-fit", "career-independence"]) {
  assert(Boolean(getPremiumProduct(productId)), `${productId} must remain a distinct registry product`);
}

console.log("paid-analysis-v4-career-job-change-boundary-regression passed ✓");