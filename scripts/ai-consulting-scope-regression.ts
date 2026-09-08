import { evaluateAiConsultingScope, AI_CONSULTING_QUESTION_MAX_CHARS } from "../app/lib/aiConsultingScope";
import { getPeriodAnalysisStrategy } from "../app/lib/analysisPeriodStrategy";
import { getLaunchProductIds, getPaidAnalysisTopicConfig } from "../app/lib/paidAnalysisTopicConfig";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const launchIds = getLaunchProductIds();
const uniqueLaunchIds = new Set(launchIds);
assert(uniqueLaunchIds.size === launchIds.length, "Launch product ids must be unique");
assert(launchIds.length === 54, `expected 54 launch products, got ${launchIds.length}`);

const topicIds = launchIds.filter((productId) => getPaidAnalysisTopicConfig(productId) !== undefined);
const periodIds = launchIds.filter((productId) => getPeriodAnalysisStrategy(productId) !== null && !getPaidAnalysisTopicConfig(productId));

assert(topicIds.length === 47, `expected 47 topic consulting products, got ${topicIds.length}`);
assert(periodIds.length === 7, `expected 7 period consulting products, got ${periodIds.length}`);
assert(topicIds.length + periodIds.length === launchIds.length, "every launch product must resolve to exactly one consulting family");

// Every topic product's canonical user question must be accepted by its own scope.
for (const productId of topicIds) {
  const config = getPaidAnalysisTopicConfig(productId)!;
  const own = evaluateAiConsultingScope({ productId, question: config.userQuestion });
  assert(own.decision === "ALLOW", `${productId}: own userQuestion must ALLOW, got ${own.decision}/${own.reason}`);
  assert(own.chargeable, `${productId}: ALLOW must be chargeable`);
  assert(own.kind === "topic", `${productId}: must resolve as topic`);
  assert(own.answerGuardrails.length >= config.prohibitedClaims.length, `${productId}: response guardrails must preserve prohibited claims`);

  if (config.excludedFocus && config.excludedFocus.length > 0) {
    const excluded = evaluateAiConsultingScope({
      productId,
      question: config.excludedFocus[0].prompt,
    });
    assert(excluded.decision !== "ALLOW", `${productId}: first excludedFocus must never ALLOW`);
    assert(!excluded.chargeable, `${productId}: excluded question must not consume a turn`);
  }
}

// Every period product's own canonical core question must be accepted.
for (const productId of periodIds) {
  const strategy = getPeriodAnalysisStrategy(productId)!;
  const own = evaluateAiConsultingScope({ productId, question: strategy.coreQuestion });
  assert(own.decision === "ALLOW", `${productId}: own coreQuestion must ALLOW, got ${own.decision}/${own.reason}`);
  assert(own.chargeable, `${productId}: period ALLOW must be chargeable`);
  assert(own.kind === "period", `${productId}: must resolve as period`);
  assert(own.answerGuardrails.some((item) => item.includes("별도 주제형 상품")), `${productId}: period scope must not replace topic products`);
}

const mismatchedPeriodCases: Array<[string, string]> = [
  ["monthly-current", "다음 달 흐름은 어떻게 바뀌어?"],
  ["monthly-next", "이번 달에 무엇을 조정해야 해?"],
  ["yearly-current", "내년 전체 흐름을 알려줘"],
  ["annual-next", "올해 전체 흐름에서 무엇이 중요해?"],
  ["annual-3years", "이번 달에 가장 좋은 시기는 언제야?"],
  ["daeun-current", "다음 달 흐름을 자세히 알려줘"],
  ["lifetime-overview", "올해 언제 움직여야 해?"],
];

for (const [productId, question] of mismatchedPeriodCases) {
  const scope = evaluateAiConsultingScope({ productId, question });
  assert(scope.decision === "DENY", `${productId}: mismatched period must DENY, got ${scope.decision}/${scope.reason}`);
  assert(scope.reason === "period_mismatch", `${productId}: mismatched period must return period_mismatch`);
  assert(!scope.chargeable, `${productId}: denied period question must not consume a turn`);
}

const unlaunched = evaluateAiConsultingScope({
  productId: "monthly-12months",
  question: "앞으로 12개월 흐름을 알려줘",
});
assert(unlaunched.decision === "DENY", "non-launch monthly-12months consulting must stay denied");
assert(unlaunched.reason === "unknown_or_unlaunched_product", "non-launch product must use explicit unlaunched reason");
assert(!unlaunched.chargeable, "non-launch product must never consume a turn");

const tooLong = evaluateAiConsultingScope({
  productId: topicIds[0],
  question: "가".repeat(AI_CONSULTING_QUESTION_MAX_CHARS + 1),
});
assert(tooLong.decision === "DENY" && tooLong.reason === "question_too_long", "questions over the hard character cap must be denied before AI");
assert(!tooLong.chargeable, "too-long questions must not consume a turn");

const safety = evaluateAiConsultingScope({
  productId: topicIds[0],
  question: "주식 종목 추천하고 지금 매수해야 할 금액까지 알려줘",
});
assert(safety.decision === "SAFETY_REDIRECT", "concrete investment execution requests must safety-redirect");
assert(!safety.chargeable, "safety redirects must not consume a consulting turn");

const short = evaluateAiConsultingScope({ productId: topicIds[0], question: "?" });
assert(short.decision === "CLARIFY" && short.reason === "question_too_short", "too-short question must clarify without AI");
assert(!short.chargeable, "clarification must not consume a turn");

console.log(`AI consulting scope coverage: topic=${topicIds.length}, period=${periodIds.length}, total=${launchIds.length}`);
console.log("AI consulting scope regression passed ✓");
