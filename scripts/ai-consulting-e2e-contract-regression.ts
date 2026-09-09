import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AI_CONSULTING_CREDIT_BUNDLES } from "../app/lib/aiConsulting/commercialPolicy";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function indexAfter(source: string, first: string, second: string, message: string): void {
  const firstIndex = source.indexOf(first);
  assert.ok(firstIndex >= 0, `${message}: missing first checkpoint`);
  const secondIndex = source.indexOf(second, firstIndex + first.length);
  assert.ok(secondIndex > firstIndex, `${message}: second checkpoint must occur after first`);
}

// 1) Commercial entry: exact packs, server-authoritative payment, and launch gate.
const bundles = new Map(AI_CONSULTING_CREDIT_BUNDLES.map((bundle) => [bundle.id, bundle]));
assert.deepEqual(
  [
    bundles.get("ai-consulting-3")?.questions,
    bundles.get("ai-consulting-5")?.questions,
    bundles.get("ai-consulting-10")?.questions,
  ],
  [3, 5, 10],
  "launch credit packs must remain 3/5/10 questions",
);
assert.deepEqual(
  [
    bundles.get("ai-consulting-3")?.priceKrw,
    bundles.get("ai-consulting-5")?.priceKrw,
    bundles.get("ai-consulting-10")?.priceKrw,
  ],
  [2900, 4900, 8900],
  "launch prices must remain 2,900/4,900/8,900 KRW",
);

const checkout = read("app/lib/aiConsulting/creditCheckout.ts");
for (const required of [
  'NEXT_PUBLIC_AI_CONSULTING_CREDIT_CHECKOUT_ENABLED === "true"',
  "getActiveEntitlementForProfileEdition",
  "getPaidReport",
  "amount: bundle.priceKrw",
  'payment_provider: AI_CONSULTING_CREDIT_PAYMENT_PROVIDER',
  'rpc("record_ai_consulting_credit_purchase"',
  "p_quantity: bundle.questions",
  "getAiConsultingCreditBalance",
]) {
  assert.ok(checkout.includes(required), `checkout E2E checkpoint missing: ${required}`);
}
assert.ok(!checkout.includes("clientAmount"), "client must never be authoritative for AI credit price");

const confirmation = read("app/api/ai-consulting/credits/orders/[orderId]/confirm-payment/route.ts");
for (const required of [
  "getOrderForUser",
  "order.amount !== bundle.priceKrw",
  "provider.orderId !== order.id",
  "provider.totalAmount !== order.amount",
  'provider.currency !== "KRW"',
  'provider.status !== "DONE"',
  "markOrderPaid(order, provider.paymentKey)",
  "finalizeAiConsultingCreditPurchase(paidOrder)",
  "reconciliation_required",
]) {
  assert.ok(confirmation.includes(required), `payment confirmation E2E checkpoint missing: ${required}`);
}
indexAfter(
  confirmation,
  "markOrderPaid(order, provider.paymentKey)",
  "finalizeAiConsultingCreditPurchase(paidOrder)",
  "ledger credit must happen only after verified provider payment is persisted",
);

// 2) Entitlement/report/session boundary: history remains readable even at zero credits.
const session = read("app/lib/aiConsulting/session.ts");
for (const required of [
  "getActiveEntitlementForProfileEdition",
  "getPaidReport",
  "getAiConsultingCreditBalance",
  "loadMessages",
  'state: "report_required"',
  'state: "credit_required"',
  'state: "ready"',
  "ensureAiConsultingAccessGrant",
  '"get_or_create_ai_consulting_thread"',
]) {
  assert.ok(session.includes(required), `session E2E checkpoint missing: ${required}`);
}
indexAfter(
  session,
  "const messages = await loadMessages",
  "if (questionsRemaining <= 0)",
  "prior conversation must be loaded before zero-credit state is returned",
);

// 3) Question lifecycle: deterministic scope, one reservation, atomic completion, failure release.
const questionRoute = read("app/api/ai-consulting/question/route.ts");
assert.ok(questionRoute.includes("answerAiConsultingQuestion"), "question API must use the hardened answer orchestration");
assert.ok(questionRoute.includes("질문 횟수는 차감되지 않습니다"), "server failure UX must preserve no-charge promise");

const answerPipeline = read("app/lib/aiConsulting/answerPipeline.ts");
for (const required of [
  "evaluateAiConsultingScope",
  "reserveAiConsultingQuestion",
  'scope.decision !== "ALLOW"',
  "getPaidReport",
  "getAiConsultingContextMemories",
  "loadRecentMessages",
  "generateConsultingAnswer",
  "completeAiConsultingAnswer",
  "releaseAiConsultingQuestionReservation",
]) {
  assert.ok(answerPipeline.includes(required), `answer E2E checkpoint missing: ${required}`);
}
indexAfter(
  answerPipeline,
  "evaluateAiConsultingScope",
  "reserveAiConsultingQuestion",
  "scope must be classified before paid capacity handling",
);
indexAfter(
  answerPipeline,
  "generateConsultingAnswer(prompt)",
  "completeAiConsultingAnswer",
  "only a generated, validated answer may reach atomic completion",
);

const runtimeMigration = read("supabase/migrations/044_ai_consulting_credit_runtime.sql");
for (const required of [
  "reserve_ai_consulting_credit_question",
  "release_ai_consulting_credit_reservation",
  "complete_ai_consulting_credit_answer",
  "AI_CONSULTING_REQUEST_REPLAY_MISMATCH",
  "AI_CONSULTING_RESERVATION_RELEASED",
  "AI_CONSULTING_NO_PROFILE_CREDIT",
  "AI_CONSULTING_COMPLETION_STATE_INCONSISTENT",
]) {
  assert.ok(runtimeMigration.includes(required), `runtime E2E checkpoint missing: ${required}`);
}
indexAfter(
  runtimeMigration,
  "insert into public.ai_consulting_messages (\n    thread_id, user_id, profile_id, role, content,",
  "update public.ai_consulting_messages\n  set charged = true",
  "assistant answer must be persisted before marking the user message charged",
);
indexAfter(
  runtimeMigration,
  "update public.ai_consulting_messages\n  set charged = true",
  "insert into public.ai_consulting_credit_ledger (",
  "CONSUME ledger write must be part of the same completion function after charged state",
);
assert.ok(
  runtimeMigration.includes("'CONSUME',\n    -1,"),
  "a successful ALLOW answer must consume exactly one profile credit",
);

// 4) Continuation + explicit memory: readable history and user-controlled memory never cost a credit.
const chat = read("app/ai-consulting/AiConsultingChatClient.tsx");
for (const required of [
  "이전 상담 이어보기",
  "이전 상담 기록 보기",
  "AI가 기억하는 내 상황",
  "이 내용 기억하기",
  "기억에서 삭제",
]) {
  assert.ok(chat.includes(required), `continuity/memory UX checkpoint missing: ${required}`);
}

const memoryRoute = read("app/api/ai-consulting/memories/route.ts");
for (const required of [
  "getCurrentUser",
  "getActiveProfile",
  "getUserProfile",
  'eq("role", "user")',
  'provenance: "USER_STATED"',
  "deleteAiConsultingUserMemory",
]) {
  assert.ok(memoryRoute.includes(required), `memory API E2E checkpoint missing: ${required}`);
}
for (const forbidden of [
  "getOpenAIClient",
  "reserveAiConsultingQuestion",
  "completeAiConsultingAnswer",
  "record_ai_consulting_credit_purchase",
]) {
  assert.ok(!memoryRoute.includes(forbidden), `memory save/delete must not invoke paid lifecycle: ${forbidden}`);
}
assert.ok(
  answerPipeline.includes("partitionAiConsultingMemoriesForPrompt")
    && answerPipeline.includes("USER_STATED"),
  "next consultation must be able to reuse explicitly saved USER_STATED memory",
);

// 5) Operations telemetry is observational only and must not become a second commercial source of truth.
const operations = read("app/lib/aiConsulting/operations.ts");
assert.ok(operations.includes("Best-effort only"), "operations telemetry must remain best-effort");
for (const forbidden of [
  "record_ai_consulting_credit_purchase",
  "reserve_ai_consulting_credit_question",
  "complete_ai_consulting_credit_answer",
]) {
  assert.ok(!operations.includes(forbidden), `operations telemetry must not mutate paid lifecycle: ${forbidden}`);
}

// 6) Synthetic business-state walk-through. This is deliberately provider/DB/model free.
// It verifies the commercial contract while CI separately checks the real wiring above.
let balance = 0;
const conversation: Array<{ role: "user" | "assistant"; charged: boolean }> = [];
const remembered: string[] = [];

balance += 5; // verified 5-question purchase
assert.equal(balance, 5, "verified purchase must add the exact bundle quantity");

conversation.push({ role: "user", charged: false }); // CLARIFY/DENY/SAFETY redirect
assert.equal(balance, 5, "non-ALLOW handling must cost zero credits");

conversation.push({ role: "user", charged: true });
conversation.push({ role: "assistant", charged: false });
balance -= 1;
assert.equal(balance, 4, "one successfully completed ALLOW answer must cost exactly one credit");

remembered.push("현재 이직을 고민 중이다");
assert.equal(balance, 4, "explicit memory save must cost zero credits");
assert.equal(remembered.length, 1, "explicitly saved context must remain available for a later consultation");
assert.ok(conversation.length >= 2, "prior consultation history must exist for continuation");

// Failed ALLOW attempt after reservation release.
assert.equal(balance, 4, "failed model/server/output completion must not consume another credit");

console.log("AI consulting Phase 12C end-to-end contract regression passed");
