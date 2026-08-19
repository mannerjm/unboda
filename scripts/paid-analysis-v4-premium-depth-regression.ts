import { getPeriodAnalysisStrategy } from "../app/lib/analysisPeriodStrategy";
import {
  getLaunchProductIds,
  getPaidAnalysisPremiumDepthContract,
  getPaidAnalysisTopicConfig,
} from "../app/lib/paidAnalysisTopicConfig";
import {
  validatePremiumDepthContract,
  validatePremiumDepthSiblingDistinction,
  type PaidAnalysisPremiumDepthContract,
} from "../app/lib/paidAnalysisV4QualityValidators";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function assertRejected(
  contract: PaidAnalysisPremiumDepthContract,
  message: string,
): void {
  assert(!validatePremiumDepthContract(contract).ok, message);
}

const launchProductIds = getLaunchProductIds();
assert(launchProductIds.length === 40, "Batch 4 launch set must contain exactly 40 products");

const topicContracts: PaidAnalysisPremiumDepthContract[] = [];

for (const productId of launchProductIds) {
  const config = getPaidAnalysisTopicConfig(productId);

  if (config) {
    const contract = getPaidAnalysisPremiumDepthContract(config);
    const result = validatePremiumDepthContract(contract);
    assert(result.ok, `${productId} premium-depth contract failed: ${result.issues.map((item) => item.message).join(" | ")}`);
    topicContracts.push(contract);
    continue;
  }

  const strategy = getPeriodAnalysisStrategy(productId);
  assert(Boolean(strategy), `${productId} must be a valid period strategy when no TopicConfig exists`);

  const periodContract: PaidAnalysisPremiumDepthContract = {
    productId,
    requiredInsightIds: strategy!.focus.map((_, index) => `period-focus-${index}`),
    evidenceFocus: ["daeun", "seun", "fortune_flow"],
    actionFocus: strategy!.focus,
    positiveOwnership: [strategy!.coreQuestion, ...strategy!.focus, ...strategy!.timelineSpec.labels],
    insightOwnership: strategy!.focus.map((focus, index) => ({
      insightId: `period-focus-${index}`,
      evidenceKey: (["daeun", "seun", "fortune_flow"] as const)[index % 3],
      mechanism: focus,
      observableCondition: strategy!.timelineSpec.labels[index % strategy!.timelineSpec.labels.length],
      actionResponsibility: `${strategy!.timelineSpec.rule} (${focus})`,
    })),
    timingMode: "period",
    temporalEvidence: ["daeun", "seun"],
  };

  const result = validatePremiumDepthContract(periodContract);
  assert(result.ok, `${productId} period premium-depth contract failed`);
}

assert(topicContracts.length === 39, "39 Batch 4 launch entries must be TopicConfigs");
assert(
  launchProductIds.includes("daeun-current") && !getPaidAnalysisTopicConfig("daeun-current"),
  "daeun-current must stay period-specialized rather than a TopicConfig",
);

const accumulation = topicContracts.find((contract) => contract.productId === "money-wealth-accumulation");
const leakRisk = topicContracts.find((contract) => contract.productId === "money-leak-risk");
const saving = topicContracts.find((contract) => contract.productId === "money-saving-discipline");

assert(Boolean(accumulation && leakRisk && saving), "MONEY depth contracts must be present");
assert(validatePremiumDepthSiblingDistinction(accumulation!, leakRisk!).ok, "accumulation and leak-risk must have distinct positive ownership");
assert(validatePremiumDepthSiblingDistinction(accumulation!, saving!).ok, "accumulation and saving must have distinct positive ownership");
assert(validatePremiumDepthSiblingDistinction(leakRisk!, saving!).ok, "leak-risk and saving must have distinct positive ownership");

const validFixture: PaidAnalysisPremiumDepthContract = {
  productId: "fixture",
  requiredInsightIds: ["mechanism", "signal"],
  evidenceFocus: ["strength", "fortune_brain"],
  actionFocus: ["반복 조건을 기록하고 다음 검토일에 기준을 재설정한다"],
  positiveOwnership: ["반복 조건", "관찰 신호", "재설정 기준"],
  insightOwnership: [
    {
      insightId: "mechanism",
      evidenceKey: "strength",
      mechanism: "반복 조건이 통제력에 미치는 구조",
      observableCondition: "기준이 흔들리는 상황을 기록하는 신호",
      actionResponsibility: "다음 검토일에 한도를 재설정한다",
    },
    {
      insightId: "signal",
      evidenceKey: "fortune_brain",
      mechanism: "판단 취약점이 반복되는 구조",
      observableCondition: "사전 기준과 실제 행동의 차이를 확인하는 신호",
      actionResponsibility: "차이가 반복되면 다음 주기 규칙을 조정한다",
    },
  ],
  timingMode: "contextual",
};

assert(validatePremiumDepthContract(validFixture).ok, "valid premium-depth fixture must pass");

assertRejected(
  {
    ...validFixture,
    insightOwnership: [
      validFixture.insightOwnership[0],
      { ...validFixture.insightOwnership[1], mechanism: validFixture.insightOwnership[0].mechanism },
    ],
  },
  "duplicate required-insight ownership must fail",
);

assertRejected(
  {
    ...validFixture,
    insightOwnership: [{ ...validFixture.insightOwnership[0], evidenceKey: "unsupported" as never }],
  },
  "unsupported evidence path must fail",
);

assertRejected(
  {
    ...validFixture,
    insightOwnership: validFixture.insightOwnership.map((item) => ({ ...item, actionResponsibility: "확인하세요" })),
  },
  "generic-action-only ownership must fail",
);

assertRejected(
  { ...validFixture, actionFocus: ["기록하세요", "확인하세요"] },
  "generic-action-only product focus must fail",
);

assertRejected(
  {
    ...validFixture,
    insightOwnership: [{ ...validFixture.insightOwnership[0], observableCondition: "" }, validFixture.insightOwnership[1]],
  },
  "missing observable-condition ownership must fail",
);

assert(
  !validatePremiumDepthSiblingDistinction(validFixture, { ...validFixture, productId: "excluded-only-fixture" }).ok,
  "excludedFocus-only differentiation must fail when positive ownership matches",
);

assert(
  !validatePremiumDepthSiblingDistinction(validFixture, {
    ...validFixture,
    productId: "near-duplicate-fixture",
    positiveOwnership: ["반복 조건", "관찰 신호", "재설정 기준", "반복 조건"],
  }).ok,
  "substantially identical positive ownership must fail",
);

assertRejected(
  { ...validFixture, temporalEvidence: ["daeun"] },
  "non-timing product claiming event-date ownership must fail",
);

assertRejected(
  { ...validFixture, timingMode: "period", temporalEvidence: [] },
  "timing product lacking temporal evidence must fail",
);

console.log("paid-analysis-v4-premium-depth-regression passed ✓");