import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const migration = read("supabase/migrations/044_ai_consulting_credit_runtime.sql");
const server = read("app/lib/aiConsulting/server.ts");
const session = read("app/lib/aiConsulting/session.ts");
const pipeline = read("app/lib/aiConsulting/answerPipeline.ts");

assert(migration.includes("ai_consulting_grants_source_purchase_entitlement_unique"));
assert(migration.includes("ensure_ai_consulting_access_grant"));
assert(migration.includes("reserve_ai_consulting_credit_question"));
assert(migration.includes("release_ai_consulting_credit_reservation"));
assert(migration.includes("complete_ai_consulting_credit_answer"));
assert(migration.includes("AI_CONSULTING_NO_PROFILE_CREDIT"));
assert(migration.includes("v_balance - v_reserved <= 0"));
assert(migration.includes("entry_type,\n    quantity,\n    related_message_id"));
assert(migration.includes("'CONSUME',\n    -1"));
assert(migration.includes("v_existing_found := found"));
assert(migration.includes("for update"));
assert(migration.includes("set search_path = public, pg_temp"));
assert(!migration.includes("to authenticated"));
assert(!migration.toLowerCase().includes("drop table"));
assert(!migration.toLowerCase().includes("truncate"));

assert(server.includes('rpc("reserve_ai_consulting_credit_question"'));
assert(server.includes('rpc("complete_ai_consulting_credit_answer"'));
assert(server.includes('rpc("release_ai_consulting_credit_reservation"'));
assert(server.includes('rpc("get_ai_consulting_credit_balance"'));
assert(session.includes("getActiveEntitlementForProfileEdition"));
assert(session.includes('report.status !== "completed"'));
assert(session.includes("ensureAiConsultingAccessGrant"));
assert(session.includes('state: "credit_required"'));
assert(pipeline.includes("completion.questionsRemaining"));
assert(!pipeline.includes("completion.questionsUsed"));
assert(!pipeline.includes("completion.questionLimit"));

console.log("AI consulting shared-credit runtime regression passed");
