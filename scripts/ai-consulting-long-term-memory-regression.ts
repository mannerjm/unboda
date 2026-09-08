import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/041_ai_consulting_long_term_memory.sql"),
  "utf8",
);
const server = readFileSync(
  join(process.cwd(), "app/lib/aiConsulting/memory.ts"),
  "utf8",
);

for (const required of [
  "write_request_id uuid",
  "supersedes_memory_id uuid",
  "ai_consulting_memories_provenance_kind_pair",
  "save_ai_consulting_memory",
  "get_ai_consulting_context_memories",
  "AI_CONSULTING_MEMORY_WRITE_REPLAY_MISMATCH",
  "AI_CONSULTING_MEMORY_PROFILE_BOUNDARY_MISMATCH",
  "AI_CONSULTING_MEMORY_USER_FACT_REQUIRES_USER_SOURCE",
  "AI_CONSULTING_MEMORY_SUPERSEDED_TYPE_MISMATCH",
  "AI_CONSULTING_MEMORY_LIMIT_OUT_OF_RANGE",
]) {
  assert.ok(migration.includes(required), `missing migration guard: ${required}`);
}

assert.match(
  migration,
  /provenance = 'USER_STATED'[\s\S]*kind in \('user_fact', 'life_event', 'goal', 'preference'\)/,
  "USER_STATED memory must remain factual/user-context kinds only",
);
assert.match(
  migration,
  /provenance = 'ANALYSIS_DERIVED'[\s\S]*kind = 'analysis_interpretation'/,
  "analysis-derived memory must remain interpretation only",
);
assert.match(
  migration,
  /provenance = 'SYSTEM_SUMMARY'[\s\S]*kind = 'consultation_summary'/,
  "system summaries must not become user facts",
);

assert.match(
  migration,
  /p_limit < 1 or p_limit > 8/,
  "retrieval must remain capped at eight long-term memories",
);
assert.match(
  migration,
  /m\.user_id = p_user_id[\s\S]*m\.profile_id = p_profile_id[\s\S]*m\.status = 'active'/,
  "retrieval must remain user/profile scoped and active-only",
);
assert.match(
  migration,
  /when 'USER_STATED' then 0[\s\S]*when 'ANALYSIS_DERIVED' then 1[\s\S]*when 'SYSTEM_SUMMARY' then 2/,
  "retrieval must preserve provenance-aware ordering",
);

for (const signature of [
  "public.save_ai_consulting_memory(\n  uuid, uuid, uuid, text, text, text, text[], uuid, uuid, uuid\n)",
  "public.get_ai_consulting_context_memories(uuid, uuid, text[], integer)",
]) {
  assert.ok(
    migration.includes(`revoke all on function ${signature}`),
    `missing public/anon/authenticated revoke for ${signature}`,
  );
  assert.ok(
    migration.includes(`grant execute on function ${signature}`),
    `missing service_role grant for ${signature}`,
  );
}

assert.ok(!/drop\s+table/i.test(migration), "phase 7 must not drop tables");
assert.ok(!/truncate\s+/i.test(migration), "phase 7 must not truncate data");
assert.ok(
  !/delete\s+from\s+public\.ai_consulting_memories/i.test(migration),
  "phase 7 must preserve prior memory rows instead of deleting history",
);

for (const required of [
  "saveAiConsultingMemory",
  "getAiConsultingContextMemories",
  "partitionAiConsultingMemoriesForPrompt",
  'createAdminClient().rpc("save_ai_consulting_memory"',
  '"get_ai_consulting_context_memories"',
  "AI_CONSULTING_CONTEXT_LIMITS.longTermMemories",
  'memory.provenance === "USER_STATED"',
  'memory.provenance === "ANALYSIS_DERIVED"',
  'memory.provenance === "SYSTEM_SUMMARY"',
]) {
  assert.ok(server.includes(required), `missing server memory guard: ${required}`);
}

console.log("AI consulting long-term memory regression passed");
