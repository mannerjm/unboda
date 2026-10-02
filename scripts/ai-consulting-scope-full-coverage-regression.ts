import assert from "node:assert/strict";
import {
  AI_CONSULTING_QUESTION_MAX_CHARS,
  evaluateAiConsultingScope,
} from "../app/lib/aiConsultingScope";
import {
  getLaunchProductIds,
  getPaidAnalysisTopicConfig,
} from "../app/lib/paidAnalysisTopicConfig";
import { getPeriodAnalysisStrategy } from "../app/lib/analysisPeriodStrategy";
import {
  COMPATIBILITY_BUSINESS_PRODUCT_ID,
  COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID,
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID,
  COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID,
  COMPATIBILITY_FRIEND_PRODUCT_ID,
  COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  COMPATIBILITY_WORKPLACE_PRODUCT_ID,
} from "../app/lib/specialAnalysisProducts";

let caseCount = 0;
function checked(condition: unknown, message: string): asserts condition {
  caseCount += 1;
  assert(condition, message);
}

const launchIds = getLaunchProductIds();
const topicIds = launchIds.filter((id) => Boolean(getPaidAnalysisTopicConfig(id)));
const periodIds = launchIds.filter((id) => !getPaidAnalysisTopicConfig(id) && Boolean(getPeriodAnalysisStrategy(id)));
assert.equal(topicIds.length, 50);
assert.equal(periodIds.length, 7);

const vague = "그건 왜 그래?";
const unrelated = "오늘 점심 메뉴는 뭘 먹는 게 좋아?";
const safetyQuestion = "주식 종목을 추천하고 지금 매수할 금액까지 정해줘";
const tooLong = "가".repeat(AI_CONSULTING_QUESTION_MAX_CHARS + 1);

// 50 topic products × 7 cases = 350.
for (const productId of topicIds) {
  const config = getPaidAnalysisTopicConfig(productId)!;

  const core = evaluateAiConsultingScope({ productId, question: config.userQuestion });
  checked(
    core.decision === "ALLOW" && core.scopeTier === "CORE" && core.chargeable,
    `${productId}: canonical topic question must be CORE/ALLOW`,
  );

  const continuation = evaluateAiConsultingScope({
    productId,
    question: vague,
    continuation: true,
  });
  checked(
    continuation.decision === "ALLOW"
      && continuation.scopeTier === "CORE"
      && continuation.reason === "within_continuation_scope",
    `${productId}: validated shorthand follow-up must continue as CORE`,
  );

  const noContext = evaluateAiConsultingScope({ productId, question: vague });
  checked(
    noContext.decision === "CLARIFY" && !noContext.chargeable,
    `${productId}: context-free shorthand must not guess or charge`,
  );

  const adjacent = evaluateAiConsultingScope({
    productId,
    question: config.excludedFocus?.[0]?.prompt ?? "인접한 다른 전문 분석도 같이 해줘",
  });
  checked(
    adjacent.decision === "SAFETY_REDIRECT"
      || (adjacent.decision === "ALLOW"
        && adjacent.scopeTier === "BRIDGE"
        && adjacent.answerGuardrails.some((item) => item.includes("독자적인 결론"))),
    `${productId}: adjacent paid scope must be safety-redirected or limited BRIDGE, never silently become CORE`,
  );

  const offTopic = evaluateAiConsultingScope({ productId, question: unrelated });
  checked(
    offTopic.decision !== "ALLOW" && !offTopic.chargeable,
    `${productId}: unrelated question must not consume paid scope`,
  );

  const safety = evaluateAiConsultingScope({ productId, question: safetyQuestion });
  checked(
    safety.decision === "SAFETY_REDIRECT" && !safety.chargeable,
    `${productId}: high-risk execution request must safety redirect`,
  );

  const long = evaluateAiConsultingScope({ productId, question: tooLong });
  checked(
    long.decision === "DENY" && long.reason === "question_too_long" && !long.chargeable,
    `${productId}: oversized question must fail before model usage`,
  );
}

const periodMismatch: Record<string, string> = {
  "monthly-current": "다음 달 전체 흐름을 자세히 알려줘",
  "monthly-next": "올해 전체 흐름을 자세히 알려줘",
  "yearly-current": "내년 전체 흐름을 자세히 알려줘",
  "annual-next": "이번 달 흐름을 자세히 알려줘",
  "annual-3years": "이번 달 흐름을 자세히 알려줘",
  "daeun-current": "다음 달 흐름을 자세히 알려줘",
  "lifetime-overview": "다음 달 흐름을 자세히 알려줘",
};

// 7 period products × 7 cases = 49.
for (const productId of periodIds) {
  const strategy = getPeriodAnalysisStrategy(productId)!;

  const core = evaluateAiConsultingScope({ productId, question: strategy.coreQuestion });
  checked(
    core.decision === "ALLOW" && core.scopeTier === "CORE" && core.chargeable,
    `${productId}: canonical period question must be CORE/ALLOW`,
  );

  const continuation = evaluateAiConsultingScope({
    productId,
    question: "그럼 나는 뭘 하면 돼?",
    continuation: true,
  });
  checked(
    continuation.decision === "ALLOW"
      && continuation.scopeTier === "CORE"
      && continuation.reason === "within_continuation_scope",
    `${productId}: validated period shorthand must continue`,
  );

  const noContext = evaluateAiConsultingScope({ productId, question: "그럼 나는 뭘 하면 돼?" });
  checked(
    noContext.decision === "CLARIFY" && !noContext.chargeable,
    `${productId}: context-free period shorthand must clarify`,
  );

  const mismatch = evaluateAiConsultingScope({
    productId,
    question: periodMismatch[productId]!,
  });
  checked(
    mismatch.decision === "DENY"
      && mismatch.reason === "period_mismatch"
      && mismatch.scopeTier === "OUTSIDE",
    `${productId}: genuinely different period must remain OUTSIDE`,
  );

  const offTopic = evaluateAiConsultingScope({ productId, question: unrelated });
  checked(
    offTopic.decision !== "ALLOW" && !offTopic.chargeable,
    `${productId}: unrelated period question must not charge`,
  );

  const safety = evaluateAiConsultingScope({ productId, question: safetyQuestion });
  checked(
    safety.decision === "SAFETY_REDIRECT" && !safety.chargeable,
    `${productId}: period safety boundary must remain intact`,
  );

  const long = evaluateAiConsultingScope({ productId, question: tooLong });
  checked(
    long.decision === "DENY" && long.reason === "question_too_long",
    `${productId}: oversized period question must fail closed`,
  );
}

const compatibilityCases = [
  {
    id: COMPATIBILITY_ROMANTIC_PRODUCT_ID,
    own: "남편과 대화할 때 자꾸 오해가 생기는데 어떻게 풀어가면 좋아?",
    cross: "아이와 관계도 같이 봐줘",
  },
  {
    id: COMPATIBILITY_WORKPLACE_PRODUCT_ID,
    own: "사수와 업무 역할을 나눌 때 갈등이 생기는데 협업 방식을 어떻게 맞추면 좋아?",
    cross: "아내와의 애정 관계도 같이 봐줘",
  },
  {
    id: COMPATIBILITY_FRIEND_PRODUCT_ID,
    own: "친구와 연락 거리감을 어떻게 맞추면 서로 부담이 덜할까?",
    cross: "동업자와 사업 파트너 관계도 같이 봐줘",
  },
  {
    id: COMPATIBILITY_BUSINESS_PRODUCT_ID,
    own: "공동 사업 파트너와 역할과 책임을 어떻게 나누는 게 좋아?",
    cross: "친구와 우정 관계도 같이 봐줘",
  },
  {
    id: COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID,
    own: "아이와 대화할 때 기대와 독립의 경계를 어떻게 잡아야 해?",
    cross: "남편과 애정 관계도 같이 봐줘",
  },
  {
    id: COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID,
    own: "동생과 비교와 경쟁이 심해질 때 갈등을 어떻게 회복하면 좋아?",
    cross: "사촌과의 관계도 같이 봐줘",
  },
  {
    id: COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID,
    own: "시어머니와 연락 빈도와 도움의 경계를 어떻게 정하는 게 좋아?",
    cross: "아이와 부모 자녀 관계도 같이 봐줘",
  },
] as const;

// 7 compatibility products × 7 cases = 49.
for (const item of compatibilityCases) {
  const core = evaluateAiConsultingScope({ productId: item.id, question: item.own });
  checked(
    core.decision === "ALLOW" && core.scopeTier === "CORE" && core.chargeable,
    `${item.id}: own relationship wording must be CORE/ALLOW`,
  );

  const continuation = evaluateAiConsultingScope({
    productId: item.id,
    question: vague,
    continuation: true,
  });
  checked(
    continuation.decision === "ALLOW"
      && continuation.scopeTier === "CORE"
      && continuation.reason === "within_continuation_scope",
    `${item.id}: validated relationship follow-up must continue`,
  );

  const noContext = evaluateAiConsultingScope({ productId: item.id, question: vague });
  checked(
    noContext.decision === "CLARIFY" && !noContext.chargeable,
    `${item.id}: context-free relationship shorthand must clarify`,
  );

  const cross = evaluateAiConsultingScope({ productId: item.id, question: item.cross });
  checked(
    cross.decision === "DENY"
      && cross.reason === "compatibility_outside_purchased_scope"
      && cross.scopeTier === "OUTSIDE",
    `${item.id}: another relationship type must remain OUTSIDE`,
  );

  const future = evaluateAiConsultingScope({
    productId: item.id,
    question: "내년에는 이 관계가 어떻게 될까?",
  });
  checked(
    future.decision === "DENY" && future.reason === "compatibility_outside_purchased_scope",
    `${item.id}: unpurchased future-year compatibility must stay blocked`,
  );

  const safety = evaluateAiConsultingScope({ productId: item.id, question: safetyQuestion });
  checked(
    safety.decision === "SAFETY_REDIRECT" && !safety.chargeable,
    `${item.id}: compatibility safety boundary must remain intact`,
  );

  const long = evaluateAiConsultingScope({ productId: item.id, question: tooLong });
  checked(
    long.decision === "DENY" && long.reason === "question_too_long",
    `${item.id}: oversized compatibility question must fail closed`,
  );
}

// Promised comparison semantics that previously contradicted period routing.
for (const [productId, question] of [
  ["monthly-next", "이번 달과 비교해서 다음 달은 뭐가 달라?"],
  ["annual-next", "올해와 비교하면 내년은 뭐가 달라?"],
  ["annual-3years", "앞으로 3년 중 내년은 어떤 역할이야?"],
] as const) {
  const comparison = evaluateAiConsultingScope({ productId, question });
  checked(
    comparison.decision === "ALLOW"
      && comparison.scopeTier === "CORE"
      && comparison.reason === "within_period_comparison_scope",
    `${productId}: report-promised comparison must remain inside purchased CORE scope`,
  );
}

// Umbrella products may bridge to detailed sibling questions, but may not
// silently become the detailed product. A separately owned CORE report wins in
// portfolio routing (protected by ai-consulting-portfolio-regression.ts).
for (const [productId, question] of [
  ["career", "승진 준비를 위해 어떤 책임을 더 맡아야 해?"],
  ["wealth", "비상자금이 부족한데 어떤 보호 순서를 봐야 해?"],
  ["relationship", "지금 만나는 사람과 결혼까지 생각해도 될까?"],
] as const) {
  const bridge = evaluateAiConsultingScope({ productId, question });
  assert.equal(bridge.decision, "ALLOW");
  assert.equal(bridge.scopeTier, "BRIDGE");
  assert(bridge.answerGuardrails.some((item) => item.includes("독자적인 결론")));
}

assert.equal(caseCount, 451, "expected 64 products × 7 cases plus 3 promised period comparisons");
console.log(`AI consulting full-scope coverage passed: ${caseCount} deterministic cases across 64 products ✓`);
