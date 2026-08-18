import {
  formatTopicConfigForPrompt,
  getPaidAnalysisPremiumDepthContract,
  getPaidAnalysisTopicConfig,
} from "../app/lib/paidAnalysisTopicConfig";
import {
  getPaidAnalysisEngine,
  getPaidAnalysisEngineRules,
} from "../app/lib/paidAnalysisEngine";
import { buildPaidAnalysisDetailPromptV4 } from "../app/lib/paidAnalysisDetailPrompt";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";
import { validatePremiumDepthSiblingDistinction } from "../app/lib/paidAnalysisV4QualityValidators";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function configOf(
  productId:
    | "career"
    | "career-job-change"
    | "career-job-fit"
    | "career-specialization",
) {
  const config = getPaidAnalysisTopicConfig(productId);

  if (!config) throw new Error(`FAIL: missing config for ${productId}`);

  return config;
}

function ids(items: { id: string }[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

const career = configOf("career");
const jobChange = configOf("career-job-change");
const jobFit = configOf("career-job-fit");
const specialization = configOf("career-specialization");

assert(getPaidAnalysisEngine("career") === "CAREER", "career must map to CAREER");
assert(career.decisionType === "exploration", "career must remain exploration");
assert(career.requiredInsights.length === 4, "career needs four requiredInsights");
assert((career.excludedFocus?.length ?? 0) === 3, "career needs three excludedFocus items");

const careerRequired = ids(career.requiredInsights);
for (const requiredId of [
  "career-operating-structure",
  "career-capacity-strain",
  "career-priority-stability",
  "career-operating-review-action",
]) {
  assert(careerRequired.has(requiredId), `career must require ${requiredId}`);
}

const careerExcluded = ids(career.excludedFocus ?? []);
for (const excludedId of [
  "role-environment-fit-diagnosis",
  "stay-move-transition-decision",
  "specialization-path-recognition",
]) {
  assert(careerExcluded.has(excludedId), `career must exclude ${excludedId}`);
}

for (const insight of [...career.requiredInsights, ...(career.excludedFocus ?? [])]) {
  assert(insight.id.trim().length > 0, "career insight id must not be empty");
  assert(insight.prompt.trim().length > 0, "career insight prompt must not be empty");
}

for (const siblingInsight of [
  "work-style-fit",
  "role-environment-fit",
  "stay-move-decision-criteria",
  "change-readiness-signal",
  "specialization-direction",
  "depth-vs-breadth",
  "recognition-path",
]) {
  assert(!careerRequired.has(siblingInsight), `career must not require sibling insight ${siblingInsight}`);
}

for (const [siblingId, sibling] of [
  ["career-job-fit", jobFit],
  ["career-job-change", jobChange],
  ["career-specialization", specialization],
] as const) {
  assert(career.userQuestion !== sibling.userQuestion, `career and ${siblingId} questions must differ`);
  assert(JSON.stringify(career.requiredInsights) !== JSON.stringify(sibling.requiredInsights), `career and ${siblingId} required insights must differ`);
  assert(JSON.stringify(career.actionFocus) !== JSON.stringify(sibling.actionFocus), `career and ${siblingId} actionFocus must differ`);
  assert(
    validatePremiumDepthSiblingDistinction(
      getPaidAnalysisPremiumDepthContract(career),
      getPaidAnalysisPremiumDepthContract(sibling),
    ).ok,
    `career and ${siblingId} must have distinct positive ownership`,
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

const careerPrompt = buildPaidAnalysisDetailPromptV4({ ...basePromptInput, productId: "career" });
const jobFitPrompt = buildPaidAnalysisDetailPromptV4({ ...basePromptInput, productId: "career-job-fit" });
const jobChangePrompt = buildPaidAnalysisDetailPromptV4({ ...basePromptInput, productId: "career-job-change" });
const specializationPrompt = buildPaidAnalysisDetailPromptV4({ ...basePromptInput, productId: "career-specialization" });

assert(careerPrompt.includes("[반드시 다룰 핵심 통찰]"), "career needs required insights");
assert(careerPrompt.includes("[이 상품의 경계]"), "career needs excluded focus");
assert(!careerPrompt.includes('"decisionCheck": ['), "career must not request decisionCheck");
assert(careerPrompt.includes("decisionCheck 필드를 출력하지 않는다"), "career must forbid decisionCheck");
for (const insight of career.requiredInsights) {
  assert(careerPrompt.includes(insight.prompt), `career prompt must include ${insight.id}`);
}
for (const focus of career.excludedFocus ?? []) {
  assert(careerPrompt.includes(focus.prompt), `career prompt must include excluded ${focus.id}`);
}
assert(!careerPrompt.includes(jobFit.requiredInsights[0].prompt), "career must not carry job-fit diagnosis");
assert(!careerPrompt.includes(jobChange.requiredInsights[0].prompt), "career must not carry stay-move decision");
assert(!careerPrompt.includes(specialization.requiredInsights[0].prompt), "career must not carry specialization selection");
assert(careerPrompt !== jobFitPrompt, "career and job-fit prompts must differ");
assert(careerPrompt !== jobChangePrompt, "career and job-change prompts must differ");
assert(careerPrompt !== specializationPrompt, "career and specialization prompts must differ");

const careerContract = formatTopicConfigForPrompt(career);
for (const prohibitedClaim of [
  "현재 자리를 떠나거나 유지해야 한다는 결론",
  "특정 조직 환경이나 역할이 맞는다고 단정",
  "선택할 전문 분야나 인정 경로를 확정",
]) {
  assert(careerContract.includes(prohibitedClaim), `career must prohibit ${prohibitedClaim}`);
}

const careerRules = getPaidAnalysisEngineRules("CAREER");
assert(careerRules.includes("TopicConfig의 단일 질문과 반드시 다룰 핵심 통찰"), "CAREER Engine must prioritize TopicConfig");
assert(careerRules.includes("제외한 범위를 핵심 결론이나 주된 action으로 확장하지 않는다"), "CAREER Engine must honor excludedFocus");
assert(!careerRules.includes("career") && !careerRules.includes("productId"), "CAREER Engine must not hardcode product IDs");

const metadata = [
  getPremiumProduct("career")?.description,
  ...(getPremiumProduct("career")?.details ?? []),
].join("\n");
for (const siblingPromise of ["나에게 맞는 역할과 일하는 방식", "이직·유지·확장", "앞으로의 직업 흐름과 변화 가능성"]) {
  assert(!metadata.includes(siblingPromise), `career metadata must not promise ${siblingPromise}`);
}
for (const requiredPromise of ["책임", "에너지", "운영", "우선순위", "재정리"]) {
  assert(metadata.includes(requiredPromise), `career metadata must promise ${requiredPromise}`);
}

console.log("paid-analysis-v4-general-career-boundary-regression passed ✓");