import { getCanonicalPremiumProductId } from "../premiumProductRegistry";
import { getActiveEntitlementForProfileEdition } from "../purchases/server";
import { getPaidReport } from "../paidReports/server";
import { createAdminClient } from "../supabase/admin";
import {
  ensureAiConsultingAccessGrant,
  getAiConsultingCreditBalance,
} from "./server";

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
  | {
      state: "credit_required";
      productId: string;
      analysisEditionKey: string;
      questionsRemaining: 0;
      threadId: string | null;
      messages: AiConsultingSessionMessage[];
    }
  | {
      state: "ready";
      productId: string;
      analysisEditionKey: string;
      grantId: string | null;
      threadId: string | null;
      questionsRemaining: number;
      messages: AiConsultingSessionMessage[];
    };

type GrantRow = {
  id: string;
  status: "active" | "exhausted" | "revoked" | "expired";
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

async function findAccessThread(input: {
  userId: string;
  profileId: string;
  productId: string;
  analysisEditionKey: string;
}): Promise<{ grantId: string | null; threadId: string | null }> {
  const supabase = createAdminClient();
  const { data: grant, error: grantError } = await supabase
    .from("ai_consulting_grants")
    .select("id,status,created_at")
    .eq("user_id", input.userId)
    .eq("profile_id", input.profileId)
    .eq("base_product_id", input.productId)
    .eq("analysis_edition_key", input.analysisEditionKey)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<GrantRow>();

  if (grantError) {
    throw new Error(`AI_CONSULTING_ACCESS_GRANT_READ_FAILED: ${grantError.message}`);
  }
  if (!grant) return { grantId: null, threadId: null };

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

  return { grantId: grant.id, threadId: thread?.id ?? null };
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

  const access = await findAccessThread({
    userId: input.userId,
    profileId: input.profileId,
    productId,
    analysisEditionKey: input.analysisEditionKey,
  });
  const messages = await loadMessages({
    userId: input.userId,
    profileId: input.profileId,
    threadId: access.threadId,
  });
  const questionsRemaining = await getAiConsultingCreditBalance({
    userId: input.userId,
    profileId: input.profileId,
  });

  if (questionsRemaining <= 0) {
    return {
      state: "credit_required",
      productId,
      analysisEditionKey: input.analysisEditionKey,
      questionsRemaining: 0,
      threadId: access.threadId,
      messages,
    };
  }

  return {
    state: "ready",
    productId,
    analysisEditionKey: input.analysisEditionKey,
    grantId: access.grantId,
    threadId: access.threadId,
    questionsRemaining,
    messages,
  };
}

export async function ensureAiConsultingThreadForAnalysis(input: {
  userId: string;
  profileId: string;
  productId: string;
  analysisEditionKey: string;
  title?: string | null;
}): Promise<string> {
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
    throw new Error("AI_CONSULTING_PAID_REPORT_UNAVAILABLE");
  }

  const balance = await getAiConsultingCreditBalance({
    userId: input.userId,
    profileId: input.profileId,
  });
  if (balance <= 0) {
    throw new Error("AI_CONSULTING_NO_PROFILE_CREDIT");
  }

  const grant = await ensureAiConsultingAccessGrant({
    userId: input.userId,
    profileId: input.profileId,
    baseEntitlementId: entitlement.id,
  });

  const { data, error } = await createAdminClient().rpc(
    "get_or_create_ai_consulting_thread",
    {
      p_grant_id: grant.id,
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
