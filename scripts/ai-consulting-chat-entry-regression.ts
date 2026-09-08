import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const migration = read("supabase/migrations/042_ai_consulting_thread_entry.sql");
const sessionService = read("app/lib/aiConsulting/session.ts");
const sessionRoute = read("app/api/ai-consulting/session/route.ts");
const questionRoute = read("app/api/ai-consulting/question/route.ts");
const entryCard = read("app/paid-analysis/[productId]/report/AiConsultingEntryCard.tsx");
const reportPage = read("app/paid-analysis/[productId]/report/page.tsx");
const chatClient = read("app/ai-consulting/AiConsultingChatClient.tsx");

assert(migration.includes("ai_consulting_threads_one_active_per_grant_uidx"), "one active thread per grant must be unique");
assert(migration.includes("where status = 'active'"), "active-thread uniqueness must be partial");
assert(migration.includes("get_or_create_ai_consulting_thread"), "idempotent thread entry RPC must exist");
assert(migration.includes("security definer") && migration.includes("set search_path = public, pg_temp"), "thread RPC must use hardened security definer settings");
assert(migration.includes("revoke all on function public.get_or_create_ai_consulting_thread") && migration.includes("to service_role"), "thread RPC must remain service-role-only");
assert(migration.includes("AI_CONSULTING_BASE_ENTITLEMENT_INACTIVE"), "thread creation must fail when base entitlement is inactive");
assert(!migration.includes("issue_ai_consulting_grant("), "chat entry migration must not issue grants");
assert(!migration.toLowerCase().includes("drop table") && !migration.toLowerCase().includes("truncate"), "migration must not contain destructive table operations");

assert(sessionService.includes("getActiveEntitlementForProfileEdition"), "session must verify exact-edition paid entitlement");
assert(sessionService.includes('report.status !== "completed"'), "session must require a completed paid report");
assert(sessionService.includes("getAiConsultingCreditBalance"), "session must read the shared profile credit balance");
assert(sessionService.includes("ensureAiConsultingAccessGrant"), "session must create only an access binding after credit and entitlement checks");
assert(sessionService.includes("get_or_create_ai_consulting_thread"), "session service must use atomic thread RPC");

assert(sessionRoute.includes("getCurrentUser"), "session API must authenticate first");
assert(sessionRoute.includes("getActiveProfile"), "session API must enforce the active profile boundary");
assert(sessionRoute.includes('initial.state !== "ready"'), "session API must not create a thread without a ready credit-backed state");
assert(questionRoute.includes("answerAiConsultingQuestion"), "question API must use the grounded answer pipeline");
assert(questionRoute.includes("crypto") === false, "server question API must never generate hidden retries on behalf of the browser");
assert(questionRoute.includes("300"), "question API must enforce the 300-char cap");

assert(entryCard.includes('session.state === "credit_required"') && entryCard.includes("return null"), "report CTA must stay hidden when no credit and no prior thread exists");
assert(reportPage.includes("AiConsultingEntryCard"), "paid report page must wire the credit-gated entry card");
assert(chatClient.includes("crypto.randomUUID()"), "each browser submission must get an idempotency request id");
assert(chatClient.includes("scopeDecision") && chatClient.includes("차감되지 않았습니다"), "non-chargeable scope outcomes must be visible without pretending they are answers");
assert(chatClient.includes("whitespace-pre-wrap"), "assistant answers must render as text rather than injected HTML");
assert(!chatClient.includes("dangerouslySetInnerHTML"), "chat must not render model output as raw HTML");

console.log("AI consulting chat entry regression passed");
