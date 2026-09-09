import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const migration = read("supabase/migrations/041_ai_consulting_long_term_memory.sql");
const server = read("app/lib/aiConsulting/memory.ts");
const memoryRoute = read("app/api/ai-consulting/memories/route.ts");
const chatClient = read("app/ai-consulting/AiConsultingChatClient.tsx");
const answerPipeline = read("app/lib/aiConsulting/answerPipeline.ts");

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
  "getAiConsultingUserMemories",
  "deleteAiConsultingUserMemory",
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

assert.ok(
  server.includes('.eq("user_id", input.userId)') &&
    server.includes('.eq("profile_id", input.profileId)') &&
    server.includes('.eq("provenance", "USER_STATED")') &&
    server.includes('.eq("status", "active")'),
  "user-visible memories must remain user/profile scoped, USER_STATED, and active-only",
);
assert.ok(
  server.includes('.update({ status: "deleted"') && !server.includes('.delete()'),
  "memory removal must soft-delete rather than erase provenance history",
);

for (const required of [
  "getCurrentUser",
  "getActiveProfile",
  "getUserProfile",
  'eq("role", "user")',
  'provenance: "USER_STATED"',
  "USER_MEMORY_MAX_CHARS = 300",
  "sourceThreadId: thread.id",
  "sourceMessageId: sourceMessage.id",
  "deleteAiConsultingUserMemory",
]) {
  assert.ok(memoryRoute.includes(required), `missing memory API boundary: ${required}`);
}
assert.ok(
  !memoryRoute.includes("getOpenAIClient") &&
    !memoryRoute.includes("reserveAiConsultingQuestion") &&
    !memoryRoute.includes("completeAiConsultingAnswer"),
  "memory management must not call the model or mutate question credits",
);
assert.ok(
  memoryRoute.includes('eq("source_message_id", sourceMessage.id)') && memoryRoute.includes("status: 409"),
  "one active explicit memory per source user message must prevent accidental duplicates",
);

for (const required of [
  "AI가 기억하는 내용",
  "기억에 추가",
  "이 내용 기억하기",
  "기억에서 삭제",
  "내가 직접 저장한 내용만 사용자 사실로 참고합니다",
  "질문이나 추측은 지우고",
  "최대 8개",
]) {
  assert.ok(chatClient.includes(required), `missing explicit memory UX: ${required}`);
}
assert.ok(
  chatClient.includes('method: "POST"') && chatClient.includes('method: "DELETE"'),
  "chat must expose explicit save and delete actions",
);
assert.ok(
  !chatClient.includes("saveAiConsultingMemory"),
  "browser must never call server memory persistence helpers directly",
);

assert.ok(
  answerPipeline.includes("getAiConsultingContextMemories") &&
    answerPipeline.includes("partitionAiConsultingMemoriesForPrompt") &&
    answerPipeline.includes("사용자가 직접 말한 사실(USER_STATED)만 사용자 사실로 다룬다"),
  "answer pipeline must keep using provenance-separated memories safely",
);
assert.ok(
  !answerPipeline.includes("saveAiConsultingMemory"),
  "answer generation must not auto-save long-term memory",
);

console.log("AI consulting long-term memory regression passed");
