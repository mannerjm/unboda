import {
  getPaidAnalysisTopicConfig,
  formatTopicConfigForPrompt,
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

function configOf(productId: "career-job-fit" | "career-specialization") {
  const config = getPaidAnalysisTopicConfig(productId);

  if (!config) {
    throw new Error(`FAIL: missing config for ${productId}`);
  }

  return config;
}

function ids(items: { id: string }[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

const jobFit = configOf("career-job-fit");
const specialization = configOf("career-specialization");

for (const [productId, config] of [
  ["career-job-fit", jobFit],
  ["career-specialization", specialization],
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

const jobFitRequired = ids(jobFit.requiredInsights);
const specializationRequired = ids(specialization.requiredInsights);

for (const specializationOnly of [
  "specialization-direction",
  "depth-vs-breadth",
  "recognition-path",
]) {
  assert(
    !jobFitRequired.has(specializationOnly),
    `job-fit must not require ${specializationOnly}`,
  );
}

for (const jobFitOnly of [
  "work-style-fit",
  "role-environment-fit",
  "fit-verification-action",
]) {
  assert(
    !specializationRequired.has(jobFitOnly),
    `specialization must not require ${jobFitOnly}`,
  );
}

const jobFitExcluded = ids(jobFit.excludedFocus ?? []);
const specializationExcluded = ids(specialization.excludedFocus ?? []);
assert(
  jobFitExcluded.has("recognition-path"),
  "job-fit must yield recognition-path to specialization",
);
assert(
  specializationRequired.has("recognition-path"),
  "specialization must require recognition-path",
);
assert(
  specializationExcluded.has("overall-job-fit-profile") &&
    specializationExcluded.has("organization-environment-fit"),
  "specialization must yield job-fit profile and environment judgment",
);
assert(
  jobFitRequired.has("work-style-fit") && jobFitRequired.has("role-environment-fit"),
  "job-fit must require work style and environment fit",
);
assert(
  jobFit.userQuestion !== specialization.userQuestion,
  "CAREER siblings must ask different questions",
);
assert(
  JSON.stringify(jobFit.actionFocus) !== JSON.stringify(specialization.actionFocus),
  "CAREER siblings must have different actionFocus",
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

const jobFitPrompt = promptFor("career-job-fit");
const specializationPrompt = promptFor("career-specialization");
const careerPrompt = promptFor("career");
const jobChangePrompt = promptFor("career-job-change");

for (const [productId, config, prompt] of [
  ["career-job-fit", jobFit, jobFitPrompt],
  ["career-specialization", specialization, specializationPrompt],
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
  !jobFitPrompt.includes(specialization.requiredInsights[0].prompt),
  "job-fit prompt must not carry specialization-only required insight",
);
assert(
  !specializationPrompt.includes(jobFit.requiredInsights[0].prompt),
  "specialization prompt must not carry job-fit-only required insight",
);
assert(jobFitPrompt !== specializationPrompt, "CAREER sibling prompts must differ");

const careerRules = getPaidAnalysisEngineRules("CAREER");
assert(
  careerRules.includes("TopicConfig의 단일 질문과 반드시 다룰 핵심 통찰"),
  "CAREER Engine must prioritize the TopicConfig boundary",
);
assert(
  careerRules.includes("제외한 범위를 핵심 결론이나 주된 action으로 확장하지 않는다"),
  "CAREER Engine must honor excluded scope",
);
assert(
  !careerRules.includes("career-job-fit") && !careerRules.includes("career-specialization"),
  "CAREER Engine must not hardcode sibling product IDs",
);
assert(
  getPaidAnalysisEngine("career-specialization") === "CAREER",
  "career-specialization must map to CAREER",
);

assert(
  jobChangePrompt.includes('"decisionCheck": ['),
  "career-job-change must retain the decisionCheck JSON contract",
);
assert(
  jobChangePrompt.includes("decisionCheck: 3개 이상 5개 이하"),
  "career-job-change must retain the decisionCheck count rule",
);
assert(
  careerPrompt.includes("현재 커리어에서 반복되는 강점과 문제의 구조"),
  "general career must retain its required career-pattern insight",
);
assert(
  careerPrompt.includes("현재 역할과 업무 경계에서 조정할 방향"),
  "general career must retain its current-direction insight",
);

const jobFitMetadata = [
  getPremiumProduct("career-job-fit")?.description,
  ...(getPremiumProduct("career-job-fit")?.details ?? []),
].join("\n");
assert(
  !jobFitMetadata.includes("깊이 파고들수록 성과가 커지는"),
  "job-fit metadata must not promise a specialization roadmap",
);

const specializationMetadata = [
  getPremiumProduct("career-specialization")?.description,
  ...(getPremiumProduct("career-specialization")?.details ?? []),
].join("\n");
for (const jobFitOnlyPromise of ["체계적인 조직", "이직·부서 이동", "직무 전환"]) {
  assert(
    !specializationMetadata.includes(jobFitOnlyPromise),
    `specialization metadata must not promise ${jobFitOnlyPromise}`,
  );
}

assert(
  formatTopicConfigForPrompt(jobFit) !== formatTopicConfigForPrompt(specialization),
  "CAREER specialization contracts must differ",
);

console.log("paid-analysis-v4-career-boundary-regression passed ✓");
