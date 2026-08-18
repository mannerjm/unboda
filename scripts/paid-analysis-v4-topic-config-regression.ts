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
import { buildPaidAnalysisInputFromProfile } from "../app/lib/paidAnalysisProfileInput";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const LAUNCH_PRODUCT_IDS = getLaunchProductIds();

assert(LAUNCH_PRODUCT_IDS.length === 18, "Launch set must contain 18 products");

for (const productId of [
  "career",
  "career-job-change",
  "career-job-fit",
  "career-specialization",
  "wealth",
  "money-wealth-accumulation",
  "money-leak-risk",
  "money-saving-discipline",
  "relationship",
  "relationship-current",
  "relationship-marriage",
  "relationship-partner-pattern",
  "relationship-new-connection",
  "relationship-intimacy",
  "relationship-conflict",
  "relationship-boundary",
  "relationship-reunion",
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
  "career-specialization": "CAREER",
  wealth: "MONEY",
  "money-wealth-accumulation": "MONEY",
  "money-leak-risk": "MONEY",
  "money-saving-discipline": "MONEY",
  relationship: "RELATIONSHIP",
  "relationship-current": "RELATIONSHIP",
  "relationship-marriage": "RELATIONSHIP",
  "relationship-partner-pattern": "RELATIONSHIP",
  "relationship-new-connection": "RELATIONSHIP",
  "relationship-intimacy": "RELATIONSHIP",
  "relationship-conflict": "RELATIONSHIP",
  "relationship-boundary": "RELATIONSHIP",
  "relationship-reunion": "RELATIONSHIP",
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
    assert(
      Array.isArray(config.requiredInsights),
      `${productId} needs a requiredInsights contract`,
    );
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
assertDifferentConfigs("career-job-fit", "career-specialization");
assert(
  configOf("career-job-change").decisionType !== configOf("career-job-fit").decisionType,
  "career-job-change and career-job-fit must have different decisionType",
);
assert(
  configOf("career-job-change").requiredInsights.length === 4,
  "career-job-change must carry four decision required insights",
);
assert(
  (configOf("career-job-change").excludedFocus?.length ?? 0) === 3,
  "career-job-change must carry three excluded focus items",
);

// MONEY differentiation.
assertDifferentConfigs("wealth", "money-wealth-accumulation");
assertDifferentConfigs("wealth", "money-leak-risk");
assertDifferentConfigs("money-wealth-accumulation", "money-leak-risk");
assertDifferentConfigs("money-wealth-accumulation", "money-saving-discipline");
assertDifferentConfigs("money-leak-risk", "money-saving-discipline");
assert(
  configOf("money-leak-risk").requiredInsights.length === 4,
  "money-leak-risk must carry four required insights",
);
assert(
  (configOf("money-leak-risk").excludedFocus?.length ?? 0) === 3,
  "money-leak-risk must carry three excluded focus items",
);
assert(
  configOf("money-saving-discipline").requiredInsights.length === 4,
  "money-saving-discipline must carry four required insights",
);
assert(
  (configOf("money-saving-discipline").excludedFocus?.length ?? 0) === 3,
  "money-saving-discipline must carry three excluded focus items",
);

// RELATIONSHIP differentiation.
assertDifferentConfigs("relationship", "relationship-current");
assert(
  configOf("relationship").decisionType !== configOf("relationship-current").decisionType,
  "relationship and relationship-current must have different decisionType",
);
assertDifferentConfigs("relationship", "relationship-marriage");
assertDifferentConfigs("relationship", "relationship-partner-pattern");

assertDifferentConfigs("relationship-new-connection", "relationship-intimacy");
assertDifferentConfigs("relationship-conflict", "relationship-boundary");
assertDifferentConfigs("relationship-current", "relationship-reunion");

for (const productId of [
  "relationship",
  "relationship-current",
  "relationship-marriage",
  "relationship-partner-pattern",
  "relationship-new-connection",
  "relationship-intimacy",
  "relationship-conflict",
  "relationship-boundary",
  "relationship-reunion",
]) {
  assert(
    configOf(productId).requiredInsights.length === 4,
    `${productId} must carry four relationship required insights`,
  );
  assert(
    (configOf(productId).excludedFocus?.length ?? 0) === 3,
    `${productId} must carry three relationship excluded focus items`,
  );
}

// decisionCheck is requested only for decision-type products.
for (const productId of [
  "career",
  "career-job-change",
  "career-job-fit",
  "career-specialization",
  "wealth",
  "money-wealth-accumulation",
  "money-leak-risk",
  "money-saving-discipline",
  "relationship",
  "relationship-current",
  "relationship-marriage",
  "relationship-partner-pattern",
  "relationship-new-connection",
  "relationship-intimacy",
  "relationship-conflict",
  "relationship-boundary",
  "relationship-reunion",
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
const specializationPrompt = promptFor("career-specialization");
const wealthPrompt = promptFor("wealth");
const accumulationPrompt = promptFor("money-wealth-accumulation");
const leakRiskPrompt = promptFor("money-leak-risk");
const savingDisciplinePrompt = promptFor("money-saving-discipline");
const relationshipPrompt = promptFor("relationship");
const relationshipCurrentPrompt = promptFor("relationship-current");
const marriagePrompt = promptFor("relationship-marriage");
const partnerPatternPrompt = promptFor("relationship-partner-pattern");
const connectionPrompt = promptFor("relationship-new-connection");
const intimacyPrompt = promptFor("relationship-intimacy");
const conflictPrompt = promptFor("relationship-conflict");
const boundaryPrompt = promptFor("relationship-boundary");
const reunionPrompt = promptFor("relationship-reunion");
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
  specializationPrompt,
  wealthPrompt,
  accumulationPrompt,
  leakRiskPrompt,
  savingDisciplinePrompt,
  relationshipPrompt,
  relationshipCurrentPrompt,
  marriagePrompt,
  partnerPatternPrompt,
  connectionPrompt,
  intimacyPrompt,
  conflictPrompt,
  boundaryPrompt,
  reunionPrompt,
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
  [jobFitPrompt, specializationPrompt],
  [wealthPrompt, accumulationPrompt],
  [wealthPrompt, leakRiskPrompt],
  [accumulationPrompt, leakRiskPrompt],
  [accumulationPrompt, savingDisciplinePrompt],
  [leakRiskPrompt, savingDisciplinePrompt],
  [relationshipPrompt, relationshipCurrentPrompt],
  [relationshipPrompt, marriagePrompt],
  [relationshipPrompt, partnerPatternPrompt],
  [connectionPrompt, intimacyPrompt],
  [conflictPrompt, boundaryPrompt],
  [relationshipCurrentPrompt, reunionPrompt],
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

// decisionCheck must be part of the JSON contract for decision-type products only.
for (const productId of [
  "career-job-change",
  "relationship-current",
  "relationship-reunion",
]) {
  const prompt = promptFor(productId);

  assert(
    prompt.includes('"decisionCheck": ['),
    `${productId} prompt must include decisionCheck in the JSON contract`,
  );
  assert(
    prompt.includes("decisionCheck: 3개 이상 5개 이하"),
    `${productId} prompt must state the decisionCheck count rule`,
  );
}

for (const productId of [
  "career",
  "career-job-fit",
  "career-specialization",
  "wealth",
  "money-wealth-accumulation",
  "relationship",
  "relationship-new-connection",
  "relationship-intimacy",
  "relationship-conflict",
  "relationship-boundary",
]) {
  const prompt = promptFor(productId);

  assert(
    !prompt.includes('"decisionCheck": ['),
    `${productId} is exploration-type and must not receive a decisionCheck JSON key`,
  );
  assert(
    prompt.includes("decisionCheck key 자체를 출력하지 않는다"),
    `${productId} must be told not to output decisionCheck`,
  );
  assert(
    prompt.includes("null이나 빈 배열도 보내지 않는다"),
    `${productId} must forbid null or empty decisionCheck`,
  );
}

// PERIOD products get no decisionCheck requirement at all.
assert(
  !daeunPrompt.includes('"decisionCheck": ['),
  "daeun-current must not be forced to produce decisionCheck",
);
assert(
  !daeunPrompt.includes("decisionCheck: 3개 이상 5개 이하"),
  "daeun-current must not carry a decisionCheck count rule",
);

// action contract must forbid single-verb commands.
for (const prompt of [careerPrompt, jobChangePrompt, daeunPrompt]) {
  assert(
    prompt.includes('"무엇을 어떻게 한다"가 드러나는 완결된 한 문장'),
    "action field must be defined as a complete sentence",
  );
  assert(
    prompt.includes("10자 이상으로 쓴다"),
    "action field must state a minimum length",
  );
  assert(
    prompt.includes("action과 target이 같은 말을 반복하지 않는다"),
    "action and target must be told not to duplicate",
  );

  for (const banned of ["분류하세요", "확인하세요", "점검하세요", "정리하세요"]) {
    assert(
      prompt.includes(banned),
      `single-verb command ${banned} must be listed as forbidden`,
    );
  }
}

assert(
  !careerPrompt.includes('"action": "검증 가능한 동사로 시작하는 행동"'),
  "the old verb-first action description must be gone",
);

// --- Step 4D-3 slimming safety ---

const slimInput = buildPaidAnalysisInputFromProfile(
  {
    id: "00000000-0000-0000-0000-000000000000",
    label: "테스트",
    relationshipType: "self",
    birthDate: "1995-05-20",
    birthTime: "09:00",
    calendarType: "양력",
    isLeapMonth: false,
    gender: "남성",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  "career-job-change",
);

assert(
  Boolean(slimInput.v4Context?.currentTiming),
  "TOPIC input must carry the slim current timing context",
);
assert(
  slimInput.v4Context?.periodTiming === undefined,
  "TOPIC input must not carry the full daeun/seun series",
);

const periodInput = buildPaidAnalysisInputFromProfile(
  {
    id: "00000000-0000-0000-0000-000000000000",
    label: "테스트",
    relationshipType: "self",
    birthDate: "1995-05-20",
    birthTime: "09:00",
    calendarType: "양력",
    isLeapMonth: false,
    gender: "남성",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  "daeun-current",
);

assert(
  Boolean(periodInput.v4Context?.periodTiming),
  "PERIOD input must keep the full daeun/seun series",
);

const slimTopicPrompt = buildPaidAnalysisDetailPromptV4(slimInput);
const slimPeriodPrompt = buildPaidAnalysisDetailPromptV4(periodInput);

// A. TOPIC prompt keeps every specialization block but drops the raw dumps.
assert(slimTopicPrompt.includes("[CAREER Engine 규칙]"), "slim TOPIC keeps engine rules");
assert(slimTopicPrompt.includes("[상품 전문화 계약]"), "slim TOPIC keeps topic config");
assert(slimTopicPrompt.includes('"decisionCheck": ['), "slim TOPIC keeps decisionCheck contract");
assert(
  slimTopicPrompt.includes('"무엇을 어떻게 한다"가 드러나는 완결된 한 문장'),
  "slim TOPIC keeps the action contract",
);
assert(
  slimTopicPrompt.includes("[선택 가능한 결정론 근거 요약]"),
  "slim TOPIC keeps the deterministic evidence block",
);
assert(
  slimTopicPrompt.includes("현재 대운·세운 시기 정보"),
  "slim TOPIC keeps the current fortune timing context",
);
assert(
  slimTopicPrompt.includes("현재 운의 흐름"),
  "slim TOPIC keeps the current fortune flow",
);
assert(
  !slimTopicPrompt.includes("출생 정보:"),
  "slim TOPIC must drop the raw birthData block",
);
assert(
  !slimTopicPrompt.includes("사주 핵심 요약:"),
  "slim TOPIC must drop the duplicated sajuSummary block",
);
assert(
  !slimTopicPrompt.includes(slimInput.fortuneTiming),
  "slim TOPIC must not embed the full fortuneTiming payload",
);
assert(
  slimTopicPrompt.length < buildPaidAnalysisDetailPromptV4({
    ...slimInput,
    v4Context: undefined,
  }).length,
  "slimming must reduce the TOPIC prompt",
);

// B. PERIOD prompt keeps the timing information its strategy needs.
assert(
  slimPeriodPrompt.includes("현재 대운의 진입 국면"),
  "slim PERIOD keeps the strategy labels",
);
assert(
  slimPeriodPrompt.includes("[기간 기준 고정]"),
  "slim PERIOD keeps the reference period",
);
assert(
  slimPeriodPrompt.includes(periodInput.v4Context!.periodTiming!),
  "slim PERIOD keeps the full daeun/seun series",
);
assert(
  !slimPeriodPrompt.includes("[상품 전문화 계약]"),
  "slim PERIOD still has no topic config block",
);

// C. deterministic safety: the model is never asked to compute or invent facts.
for (const prompt of [slimTopicPrompt, slimPeriodPrompt]) {
  assert(
    prompt.includes("실제 계산 값은 서버가 붙인다"),
    "prompt must keep the server-resolved fact rule",
  );
  assert(
    !prompt.includes('"observedFact"'),
    "prompt must never ask for a raw observed fact",
  );
  assert(
    !prompt.includes("직접 계산하"),
    "prompt must not ask the model to calculate the chart",
  );
}

console.log("paid-analysis-v4-topic-config-regression passed ✓");
