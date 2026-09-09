import { AI_CONSULTING_CONTEXT_LIMITS } from "../aiConsultingDataModel";
import type {
  AiConsultingMemoryKind,
  AiConsultingMemoryProvenance,
} from "../aiConsultingDataModel";
import { createAdminClient } from "../supabase/admin";

export type AiConsultingMemoryRpcRow = {
  id: string;
  user_id?: string;
  profile_id?: string;
  kind: AiConsultingMemoryKind;
  provenance: AiConsultingMemoryProvenance;
  content: string;
  tags: string[];
  source_thread_id: string | null;
  source_message_id: string | null;
  supersedes_memory_id: string | null;
  updated_at: string;
};

export type AiConsultingUserMemoryRow = AiConsultingMemoryRpcRow & {
  provenance: "USER_STATED";
  status: "active" | "superseded" | "deleted";
  created_at: string;
};

function firstRow<T>(data: unknown): T | null {
  return Array.isArray(data) && data.length > 0 ? (data[0] as T) : null;
}

function assertMemoryProvenanceKindPair(input: {
  kind: AiConsultingMemoryKind;
  provenance: AiConsultingMemoryProvenance;
}): void {
  const valid =
    (input.provenance === "USER_STATED" &&
      ["user_fact", "life_event", "goal", "preference"].includes(input.kind)) ||
    (input.provenance === "ANALYSIS_DERIVED" &&
      input.kind === "analysis_interpretation") ||
    (input.provenance === "SYSTEM_SUMMARY" &&
      input.kind === "consultation_summary");

  if (!valid) {
    throw new Error("AI_CONSULTING_MEMORY_PROVENANCE_KIND_MISMATCH");
  }
}

export async function saveAiConsultingMemory(input: {
  userId: string;
  profileId: string;
  writeRequestId: string;
  kind: AiConsultingMemoryKind;
  provenance: AiConsultingMemoryProvenance;
  content: string;
  tags?: readonly string[];
  sourceThreadId?: string | null;
  sourceMessageId?: string | null;
  supersedesMemoryId?: string | null;
}): Promise<AiConsultingMemoryRpcRow> {
  assertMemoryProvenanceKindPair(input);

  const content = input.content.trim();
  if (content.length === 0 || content.length > 1200) {
    throw new Error("AI_CONSULTING_MEMORY_INVALID_CONTENT");
  }

  const tags = [...(input.tags ?? [])];
  if (tags.length > 12 || tags.some((tag) => tag.trim().length === 0 || tag.length > 40)) {
    throw new Error("AI_CONSULTING_MEMORY_INVALID_TAGS");
  }

  const { data, error } = await createAdminClient().rpc("save_ai_consulting_memory", {
    p_user_id: input.userId,
    p_profile_id: input.profileId,
    p_write_request_id: input.writeRequestId,
    p_kind: input.kind,
    p_provenance: input.provenance,
    p_content: content,
    p_tags: tags,
    p_source_thread_id: input.sourceThreadId ?? null,
    p_source_message_id: input.sourceMessageId ?? null,
    p_supersedes_memory_id: input.supersedesMemoryId ?? null,
  });

  const row = firstRow<AiConsultingMemoryRpcRow>(data);
  if (error || !row) {
    throw new Error(error?.message ?? "AI_CONSULTING_MEMORY_SAVE_FAILED");
  }
  return row;
}

export async function getAiConsultingUserMemories(input: {
  userId: string;
  profileId: string;
  limit?: number;
}): Promise<AiConsultingUserMemoryRow[]> {
  const limit = input.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 30) {
    throw new Error("AI_CONSULTING_USER_MEMORY_LIMIT_OUT_OF_RANGE");
  }

  const { data, error } = await createAdminClient()
    .from("ai_consulting_memories")
    .select(
      "id,kind,provenance,content,tags,source_thread_id,source_message_id,supersedes_memory_id,status,created_at,updated_at",
    )
    .eq("user_id", input.userId)
    .eq("profile_id", input.profileId)
    .eq("provenance", "USER_STATED")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`AI_CONSULTING_USER_MEMORY_READ_FAILED: ${error.message}`);
  }

  return (data ?? []) as AiConsultingUserMemoryRow[];
}

export async function deleteAiConsultingUserMemory(input: {
  userId: string;
  profileId: string;
  memoryId: string;
}): Promise<AiConsultingUserMemoryRow> {
  const { data, error } = await createAdminClient()
    .from("ai_consulting_memories")
    .update({ status: "deleted", updated_at: new Date().toISOString() })
    .eq("id", input.memoryId)
    .eq("user_id", input.userId)
    .eq("profile_id", input.profileId)
    .eq("provenance", "USER_STATED")
    .eq("status", "active")
    .select(
      "id,kind,provenance,content,tags,source_thread_id,source_message_id,supersedes_memory_id,status,created_at,updated_at",
    )
    .maybeSingle<AiConsultingUserMemoryRow>();

  if (error) {
    throw new Error(`AI_CONSULTING_USER_MEMORY_DELETE_FAILED: ${error.message}`);
  }
  if (!data) {
    throw new Error("AI_CONSULTING_USER_MEMORY_NOT_FOUND");
  }
  return data;
}

export async function getAiConsultingContextMemories(input: {
  userId: string;
  profileId: string;
  tags?: readonly string[];
  limit?: number;
}): Promise<AiConsultingMemoryRpcRow[]> {
  const limit = input.limit ?? AI_CONSULTING_CONTEXT_LIMITS.longTermMemories;
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > AI_CONSULTING_CONTEXT_LIMITS.longTermMemories
  ) {
    throw new Error("AI_CONSULTING_MEMORY_LIMIT_OUT_OF_RANGE");
  }

  const tags = [...(input.tags ?? [])];
  if (tags.length > 12 || tags.some((tag) => tag.trim().length === 0 || tag.length > 40)) {
    throw new Error("AI_CONSULTING_MEMORY_INVALID_TAGS");
  }

  const { data, error } = await createAdminClient().rpc(
    "get_ai_consulting_context_memories",
    {
      p_user_id: input.userId,
      p_profile_id: input.profileId,
      p_tags: tags,
      p_limit: limit,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return Array.isArray(data) ? (data as AiConsultingMemoryRpcRow[]) : [];
}

export function partitionAiConsultingMemoriesForPrompt(
  memories: readonly AiConsultingMemoryRpcRow[],
): {
  userStated: AiConsultingMemoryRpcRow[];
  analysisDerived: AiConsultingMemoryRpcRow[];
  systemSummaries: AiConsultingMemoryRpcRow[];
} {
  return {
    userStated: memories.filter((memory) => memory.provenance === "USER_STATED"),
    analysisDerived: memories.filter(
      (memory) => memory.provenance === "ANALYSIS_DERIVED",
    ),
    systemSummaries: memories.filter(
      (memory) => memory.provenance === "SYSTEM_SUMMARY",
    ),
  };
}
