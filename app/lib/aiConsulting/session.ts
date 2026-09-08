import { getCanonicalPremiumProductId } from "../premiumProductRegistry";
import { getActiveEntitlementForProfileEdition } from "../purchases/server";
import { getPaidReport } from "../paidReports/server";
import { createAdminClient } from "../supabase/admin";

export type AiConsultingSessionMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  scopeDecision: "ALLOW" | "CLARIFY" | "DENY" | "SAFETY_REDIRECT" | null;
  charged: boolean;
  createdAt: string;
};

export type AiConsultingSessionState =
  | { state: "report_required"; productId: string; analysisEditionKey: string }
  | { state: "grant_required"; productId: string; analysisEditionKey: string }
  | {
      state: "unavailable";
      productId: string;
      analysisEditionKey: string;
      reason: "revoked" | "expired" | "exhausted";
      questionsRemaining: number;
      threadId: string | null;
      messages: AiConsultingSessionMessage[];
    }
  | {
      state: "ready";
      productId: string;
      analysisEditionKey: string;
      grantId: string;
      threadId: string | null;
      questionLimit: number;
      questionsUsed: number;
      questionsReserved: number;
      questionsRemaining: number;
      messages: AiConsultingSessionMessage[];
    };

type GrantRow = {
  id: string;
  status: "active" | "exhausted" | "revoked" | "expired";
  question_limit: number;
  questions_used: number;
  questions_reserved: number;
  expires_at: string | null;
  created_at: string;
};

type ThreadRow = { id: string };

type MessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  scope_decision: AiConsultingSessionMessage["scopeDecision"];
  charged: boolean;
  created_at: string;
};

async function loadMessages(input: {
  userId: string;
  profileId: string;
  threadId: string | null;
}): Promise<AiConsultingSessionMessage[]> {
  if (!input.threadId) return [];

  const { data, error } = await createAdminClient()
    .from("ai_consulting_messages")
    .select("id,role,content,scope_decision,charged,created_at")
    .eq("user_id", input.userId)
    .eq("profile_id", input.profileId)
    .eq("thread_id", input.threadId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    throw new Error(`AI_CONSULTING_MESSAGES_READ_FAILED: ${error.message}`);
  }

  return ((data ?? []) as MessageRow[]).map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    scopeDecision: row.scope_decision,
    charged: row.charged,
    createdAt: row.created_at,
  }));
}

export async function getAiConsultingSessionState(input: {
  userId: string;
  profileId: string;
  productId: string;
  analysisEditionKey: string;
}): Promise<AiConsultingSessionState> {
  const productId = getCanonicalPremiumProductId(input.productId);
  const entitlement = await getActiveEntitlementForProfileEdition(
    input.userId,
    input.profileId,
    productId,
    input.analysisEditionKey,
  );

  if (!entitlement) {
    throw new Error("AI_CONSULTING_BASE_ENTITLEMENT_REQUIRED");
  }

  const report = await getPaidReport(
    input.userId,
    input.profileId,
    productId,
    input.analysisEditionKey,
  );

  if (!report || report.status !== "completed" || !report.content) {
    return {
      state: "report_required",
      productId,
      analysisEditionKey: input.analysisEditionKey,
    };
  }

  const supabase = createAdminClient();
  const { data: grant, error: grantError } = await supabase
    .from("ai_consulting_grants")
    .select("id,status,question_limit,questions_used,questions_reserved,expires_at,created_at")
    .eq("user_id", input.userId)
    .eq("profile_id", input.profileId)
    .eq("base_product_id", productId)
    .eq("analysis_edition_key", input.analysisEditionKey)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<GrantRow>();

  if (grantError) {
    throw new Error(`AI_CONSULTING_GRANT_READ_FAILED: ${grantError.message}`);
  }

  if (!grant) {
    return {
      state: "grant_required",
      productId,
      analysisEditionKey: input.analysisEditionKey,
    };
  }

  const { data: thread, error: threadError } = await supabase
    .from("ai_consulting_threads")
    .select("id")
    .eq("user_id", input.userId)
    .eq("profile_id", input.profileId)
    .eq("grant_id", grant.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle<ThreadRow>();

  if (threadError) {
    throw new Error(`AI_CONSULTING_THREAD_READ_FAILED: ${threadError.message}`);
  }

  const messages = await loadMessages({
    userId: input.userId,
    profileId: input.profileId,
    threadId: thread?.id ?? null,
  });
  const questionsRemaining = Math.max(
    0,
    grant.question_limit - grant.questions_used - grant.questions_reserved,
  );
  const expiredByTime = Boolean(grant.expires_at && new Date(grant.expires_at).getTime() <= Date.now());

  if (grant.status !== "active" || expiredByTime || questionsRemaining <= 0) {
    const reason = grant.status === "revoked"
      ? "revoked"
      : grant.status === "expired" || expiredByTime
        ? "expired"
        : "exhausted";

    return {
      state: "unavailable",
      productId,
      analysisEditionKey: input.analysisEditionKey,
      reason,
      questionsRemaining,
      threadId: thread?.id ?? null,
      messages,
    };
  }

  return {
    state: "ready",
    productId,
    analysisEditionKey: input.analysisEditionKey,
    grantId: grant.id,
    threadId: thread?.id ?? null,
    questionLimit: grant.question_limit,
    questionsUsed: grant.questions_used,
    questionsReserved: grant.questions_reserved,
    questionsRemaining,
    messages,
  };
}

export async function getOrCreateAiConsultingThread(input: {
  grantId: string;
  title?: string | null;
}): Promise<string> {
  const { data, error } = await createAdminClient().rpc(
    "get_or_create_ai_consulting_thread",
    {
      p_grant_id: input.grantId,
      p_title: input.title ?? null,
    },
  );

  const row = Array.isArray(data) && data.length > 0
    ? (data[0] as { id?: string })
    : null;

  if (error || !row?.id) {
    throw new Error(error?.message ?? "AI_CONSULTING_THREAD_CREATE_FAILED");
  }

  return row.id;
}
