import {
  formatTopicConfigForPrompt,
  getLaunchProductIds,
  getPaidAnalysisTopicConfig,
  resolvePaidAnalysisLaunchSpecialization,
} from "../app/lib/paidAnalysisTopicConfig";
import {
  getPaidAnalysisEngine,
  getPaidAnalysisEngineRules,
} from "../app/lib/paidAnalysisEngine";
import { getPeriodAnalysisStrategy } from "../app/lib/analysisPeriodStrategy";
import { buildPaidAnalysisDetailPromptV4 } from "../app/lib/paidAnalysisDetailPrompt";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const LAUNCH_PRODUCT_IDS = getLaunchProductIds();

assert(LAUNCH_PRODUCT_IDS.length === 8, "Launch set must contain 8 products");

for (const productId of [
  "career",
  "career-job-change",
  "career-job-fit",
  "wealth",
  "money-wealth-accumulation",
  "relationship",
  "relationship-current",
  "daeun-current",
]) {
  assert(
    LAUNCH_PRODUCT_IDS.includes(productId),
    `${productId} must be part of the Launch set`,
  );
  assert(
    Boolean(getPremiumProduct(productId)),
    `${productId} must exist in the premium product registry`,
  );
  assert(
    Boolean(getPaidAnalysisEngine(productId)),
    `${productId} must map to an engine`,
  );
}

// Engine mapping is deterministic and matches the approved Launch split.
const EXPECTED_ENGINES: Record<string, string> = {
  career: "CAREER",
  "career-job-change": "CAREER",
  "career-job-fit": "CAREER",
  wealth: "MONEY",
  "money-wealth-accumulation": "MONEY",
  relationship: "RELATIONSHIP",
  "relationship-current": "RELATIONSHIP",
  "daeun-current": "PERIOD",
};

for (const [productId, engine] of Object.entries(EXPECTED_ENGINES)) {
  assert(
    getPaidAnalysisEngine(productId) === engine,
    `${productId} must map to ${engine}`,
  );
}

// Launch completeness.
for (const productId of LAUNCH_PRODUCT_IDS) {
  const specialization = resolvePaidAnalysisLaunchSpecialization(productId);

  assert(
    specialization.kind !== "none",
    `${productId} must have Launch specialization`,
  );

  if (specialization.kind === "topic") {
    const config = specialization.config;

    assert(config.userQuestion.trim().length > 0, `${productId} needs a userQuestion`);
    assert(config.analysisFocus.length >= 3, `${productId} needs 3+ analysisFocus`);
    assert(config.evidenceFocus.length >= 3, `${productId} needs 3+ evidenceFocus`);
    assert(
      config.prohibitedClaims.length > 0,
      `${productId} needs prohibitedClaims`,
    );
    assert(config.actionFocus.length >= 3, `${productId} needs 3+ actionFocus`);

    for (const direction of ["확대", "유지", "조정", "보류"] as const) {
      assert(
        config.decisionCriteria[direction].trim().length > 0,
        `${productId} needs a meaning for direction ${direction}`,
      );
    }
  } else if (specialization.kind === "period") {
    assert(
      Boolean(getPeriodAnalysisStrategy(productId)),
      `${productId} must reuse an existing period strategy`,
    );
    assert(
      getPaidAnalysisTopicConfig(productId) === undefined,
      `${productId} must not duplicate the period strategy in a topic config`,
    );
  }
}

// Engine rules exist and differ per engine.
const engineRuleTexts = ["CAREER", "MONEY", "RELATIONSHIP", "PERIOD"].map(
  (engine) =>
    getPaidAnalysisEngineRules(engine as "CAREER" | "MONEY" | "RELATIONSHIP" | "PERIOD"),
);

assert(
  new Set(engineRuleTexts).size === engineRuleTexts.length,
  "each engine must have distinct rules",
);

function configOf(productId: string) {
  const config = getPaidAnalysisTopicConfig(productId);

  if (!config) {
    throw new Error(`FAIL: missing config for ${productId}`);
  }

  return config;
}

function assertDifferentConfigs(left: string, right: string): void {
  const a = configOf(left);
  const b = configOf(right);

  assert(
    a.userQuestion !== b.userQuestion,
    `${left} and ${right} must ask different questions`,
  );
  assert(
    JSON.stringify(a.analysisFocus) !== JSON.stringify(b.analysisFocus),
    `${left} and ${right} must have different analysisFocus`,
  );
  assert(
    JSON.stringify(a.decisionCriteria) !== JSON.stringify(b.decisionCriteria),
    `${left} and ${right} must define direction differently`,
  );
  assert(
    JSON.stringify(a.evidenceFocus) !== JSON.stringify(b.evidenceFocus) ||
      JSON.stringify(a.actionFocus) !== JSON.stringify(b.actionFocus),
    `${left} and ${right} must differ in evidenceFocus or actionFocus`,
  );
}

// CAREER differentiation.
assertDifferentConfigs("career", "career-job-change");
assertDifferentConfigs("career", "career-job-fit");
assertDifferentConfigs("career-job-change", "career-job-fit");
assert(
  configOf("career-job-change").decisionType !== configOf("career-job-fit").decisionType,
  "career-job-change and career-job-fit must have different decisionType",
);

// MONEY differentiation.
assertDifferentConfigs("wealth", "money-wealth-accumulation");

// RELATIONSHIP differentiation.
assertDifferentConfigs("relationship", "relationship-current");
assert(
  configOf("relationship").decisionType !== configOf("relationship-current").decisionType,
  "relationship and relationship-current must have different decisionType",
);

// decisionCheck is requested only for decision-type products.
for (const productId of [
  "career",
  "career-job-change",
  "career-job-fit",
  "wealth",
  "money-wealth-accumulation",
  "relationship",
  "relationship-current",
]) {
  const config = configOf(productId);
  const block = formatTopicConfigForPrompt(config);

  if (config.decisionType === "decision") {
    assert(
      block.includes("decisionCheck에 예 또는 아니오로 답할 수 있는 확인 질문"),
      `${productId} must request decisionCheck`,
    );
  } else {
    assert(
      block.includes("decisionCheck 필드를 출력하지 않는다"),
      `${productId} must forbid decisionCheck`,
    );
  }
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

function promptFor(productId: string): string {
  return buildPaidAnalysisDetailPromptV4({ ...basePromptInput, productId });
}

// Prompt assembly carries engine rules + topic config, and stays distinct per product.
const careerPrompt = promptFor("career");
const jobChangePrompt = promptFor("career-job-change");
const jobFitPrompt = promptFor("career-job-fit");
const wealthPrompt = promptFor("wealth");
const accumulationPrompt = promptFor("money-wealth-accumulation");
const relationshipPrompt = promptFor("relationship");
const relationshipCurrentPrompt = promptFor("relationship-current");
const daeunPrompt = promptFor("daeun-current");

assert(
  careerPrompt.includes("[CAREER Engine 규칙]"),
  "career prompt must include engine rules",
);
assert(
  wealthPrompt.includes("[MONEY Engine 규칙]"),
  "wealth prompt must include engine rules",
);
assert(
  relationshipPrompt.includes("[RELATIONSHIP Engine 규칙]"),
  "relationship prompt must include engine rules",
);
assert(
  daeunPrompt.includes("[PERIOD Engine 규칙]"),
  "daeun prompt must include engine rules",
);
assert(
  daeunPrompt.includes("현재 대운의 진입 국면"),
  "daeun prompt must reuse the period strategy labels",
);
assert(
  !daeunPrompt.includes("[상품 전문화 계약]"),
  "daeun-current must not carry a duplicated topic config block",
);

for (const prompt of [
  careerPrompt,
  jobChangePrompt,
  jobFitPrompt,
  wealthPrompt,
  accumulationPrompt,
  relationshipPrompt,
  relationshipCurrentPrompt,
]) {
  assert(
    prompt.includes("[상품 전문화 계약]"),
    "topic products must carry the specialization block",
  );
  assert(
    prompt.includes("evidence는 다음 key를 우선 선택한다"),
    "topic prompt must pass evidenceFocus",
  );
}

const promptPairs: [string, string][] = [
  [careerPrompt, jobChangePrompt],
  [careerPrompt, jobFitPrompt],
  [jobChangePrompt, jobFitPrompt],
  [wealthPrompt, accumulationPrompt],
  [relationshipPrompt, relationshipCurrentPrompt],
];

for (const [left, right] of promptPairs) {
  assert(left !== right, "same-engine products must produce different prompts");
}

// Exaggerated product-copy promises must not be regenerated by the prompt.
assert(
  wealthPrompt.includes("3개월·6개월·1년처럼 계산 근거가 없는 기간 약속"),
  "wealth prompt must forbid the unbacked period promise",
);
for (const prompt of [
  careerPrompt,
  jobChangePrompt,
  jobFitPrompt,
  wealthPrompt,
  accumulationPrompt,
  relationshipPrompt,
  relationshipCurrentPrompt,
]) {
  assert(
    prompt.includes("label에 연도, 월, 날짜를 절대 쓰지 않는다"),
    "TOPIC prompts must forbid concrete dates",
  );
}

// Non-Launch products stay explicitly unspecialised.
const nonLaunch = resolvePaidAnalysisLaunchSpecialization("health");
assert(nonLaunch.kind === "none", "non-Launch products must resolve to none");
assert(
  !promptFor("health").includes("[상품 전문화 계약]"),
  "non-Launch products must not pretend to be specialised",
);
assert(
  promptFor("health").includes("상품별 작성 규칙"),
  "non-Launch products keep the legacy plugin rules",
);

// Direction meanings must define the direction, not pre-decide the analysis result.
const CONCLUSION_PRESETTING_PATTERNS = [
  /보다\s*먼저\s*두는/,
  /보다\s*우선(?:하는|해야)/,
  /반드시/,
  /해야\s*한다/,
  /권장한다/,
];

for (const productId of LAUNCH_PRODUCT_IDS) {
  const config = getPaidAnalysisTopicConfig(productId);

  if (!config) {
    continue;
  }

  for (const [direction, meaning] of Object.entries(config.decisionCriteria)) {
    for (const pattern of CONCLUSION_PRESETTING_PATTERNS) {
      assert(
        !pattern.test(meaning),
        `${productId} ${direction} must describe the direction without pre-deciding the conclusion`,
      );
    }

    assert(
      meaning.trim().endsWith("방향"),
      `${productId} ${direction} must be phrased as a direction`,
    );
  }
}

assert(
  configOf("money-wealth-accumulation").decisionCriteria.확대.includes("축적"),
  "money-wealth-accumulation 확대 must stay consistent with the accumulation focus",
);

console.log("paid-analysis-v4-topic-config-regression passed ✓");
