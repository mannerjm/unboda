import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const migration = read("supabase/migrations/040_ai_consulting_atomic_grants.sql");
const server = read("app/lib/aiConsulting/server.ts");
const model = read("app/lib/aiConsultingDataModel.ts");

for (const rpc of [
  "issue_ai_consulting_grant",
  "reserve_ai_consulting_question",
  "release_ai_consulting_question_reservation",
  "complete_ai_consulting_answer",
]) {
  assert(migration.includes(`function public.${rpc}`), `${rpc} must exist`);
  assert(
    migration.includes(`grant execute on function public.${rpc}`),
    `${rpc} must be granted explicitly`,
  );
}

assert(
  migration.includes("questions_used + questions_reserved <= question_limit"),
  "used + reserved must never exceed question limit",
);
assert(
  migration.includes("source_purchase_id = p_source_purchase_id") &&
    migration.includes("AI_CONSULTING_GRANT_REPLAY_MISMATCH"),
  "grant issuance must be idempotent and fail closed on replay mismatch",
);
assert(
  migration.includes("request_id = p_request_id") &&
    migration.includes("AI_CONSULTING_REQUEST_REPLAY_MISMATCH"),
  "question reservation must be idempotent per request id",
);
assert(
  migration.includes("scope_decision = 'ALLOW'") &&
    migration.includes("questions_reserved = questions_reserved + 1"),
  "only ALLOW questions may reserve paid capacity",
);
assert(
  migration.includes("reservation_released_at = now()") &&
    migration.includes("questions_reserved = questions_reserved - 1"),
  "failed calls must be able to release capacity without using a question",
);
assert(
  migration.includes("insert into public.ai_consulting_messages") &&
    migration.includes("questions_used = questions_used + 1") &&
    migration.includes("set charged = true"),
  "answer persistence and charge transition must live in the same DB RPC",
);
assert(
  migration.includes("reply_to_message_id = v_message.id") &&
    migration.includes("ai_consulting_messages_reply_uidx"),
  "one user question may have at most one persisted assistant answer",
);
assert(
  migration.includes("v_entitlement.is_active") &&
    migration.includes("AI_CONSULTING_BASE_ENTITLEMENT_REVOKED"),
  "revoked base analysis entitlements must block reservation/completion",
);
assert(
  !migration.toLowerCase().includes("truncate table") &&
    !migration.toLowerCase().includes("drop table"),
  "phase 6 migration must remain additive and non-destructive",
);
assert(
  migration.includes("from public, anon, authenticated") &&
    migration.includes("to service_role"),
  "mutation RPCs must remain service-role-only",
);

for (const helper of [
  "issueAiConsultingGrant",
  "reserveAiConsultingQuestion",
  "releaseAiConsultingQuestionReservation",
  "completeAiConsultingAnswer",
]) {
  assert(server.includes(`function ${helper}`), `${helper} server helper must exist`);
}
assert(
  server.includes('rpc("reserve_ai_consulting_question"') &&
    server.includes('rpc("complete_ai_consulting_answer"'),
  "server helpers must use the atomic RPC boundary",
);
assert(
  model.includes("questionsReserved") &&
    model.includes("canReserveAiConsultingQuestion") &&
    model.includes("hasActiveReservation"),
  "TypeScript model must represent reservation-aware charging",
);

console.log("AI consulting atomic grants regression: PASS");
