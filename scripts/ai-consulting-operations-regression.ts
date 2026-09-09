import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const migration = read("supabase/migrations/045_ai_consulting_attempt_observability.sql");
const operations = read("app/lib/aiConsulting/operations.ts");
const route = read("app/api/ai-consulting/question/route.ts");
const dashboard = read("app/admin/ai-consulting/operations/page.tsx");
const answerPipeline = read("app/lib/aiConsulting/answerPipeline.ts");

for (const required of [
  "create table if not exists public.ai_consulting_attempts",
  "status in ('succeeded', 'failed', 'timed_out')",
  "enable row level security",
  "revoke all on public.ai_consulting_attempts from public, anon, authenticated",
  "grant select, insert, update on public.ai_consulting_attempts to service_role",
  "user_message_id uuid not null",
  "thread_id uuid not null",
]) {
  assert.ok(migration.includes(required), `missing attempt observability boundary: ${required}`);
}

assert.ok(
  !migration.includes("grant select on public.ai_consulting_attempts to authenticated"),
  "attempt telemetry must stay service-role-only",
);
const migrationWithoutComments = migration.replace(/^--.*$/gm, "");
assert.ok(
  !/\b(content|question|answer)\s+text\b/i.test(migrationWithoutComments),
  "attempt telemetry must not define consultation text columns",
);

for (const required of [
  "recordAiConsultingSuccessOutcome",
  "recordAiConsultingFailureOutcome",
  "classifyAiConsultingAttemptFailure",
  "AI_CONSULTING_TIMEOUT",
  "AI_CONSULTING_ANSWER_FORMAT_INVALID",
  "AI_CONSULTING_ANSWER_LENGTH_OUT_OF_RANGE",
  ".from(\"ai_consulting_credit_ledger\")",
  "chargedWithoutAssistant",
  "chargedWithoutConsume",
  "assistantWithoutCharge",
  "consumeWithoutCharge",
  "staleReservations",
  "releasedWithoutFailureTelemetry",
]) {
  assert.ok(operations.includes(required), `missing operations safeguard: ${required}`);
}

assert.ok(
  !operations.includes(".insert({ entry_type: \"CONSUME\"") &&
    !operations.includes("reserveAiConsultingQuestion") &&
    !operations.includes("completeAiConsultingAnswer"),
  "operations telemetry must never own credit reservation or consumption",
);
assert.ok(
  operations.includes('SAFE_FAILURE_CODE = /AI_CONSULTING_[A-Z0-9_]+/') &&
    operations.includes('"AI_CONSULTING_UNCLASSIFIED_ERROR"'),
  "failure persistence must store bounded safe codes rather than raw errors",
);

assert.ok(
  route.includes("if (result.state === \"answered\")") &&
    route.includes("await recordAiConsultingSuccessOutcome") &&
    route.includes("await recordAiConsultingFailureOutcome"),
  "question route must record only completed ALLOW outcomes and failures",
);
assert.ok(
  route.indexOf("recordAiConsultingFailureOutcome") < route.lastIndexOf("return NextResponse.json"),
  "failure telemetry must remain inside the existing API failure boundary",
);
assert.ok(
  !answerPipeline.includes("aiConsulting/operations") && !answerPipeline.includes('from "./operations"'),
  "Phase 12B must not change the answer/charge orchestration itself",
);

for (const required of [
  "await requireOperator()",
  "AI 상담 운영 모니터링",
  "질문권 차감 무결성",
  "차감됐지만 답변 없음",
  "타임아웃",
  "실패 텔레메트리 누락",
]) {
  assert.ok(dashboard.includes(required), `missing operator operations UX: ${required}`);
}
assert.ok(
  !dashboard.includes("userId") && !dashboard.includes("profileId"),
  "operator dashboard must not render user/profile identifiers",
);

console.log("AI consulting operations regression guard passed.");
