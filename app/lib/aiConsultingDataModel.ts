export const AI_CONSULTING_MAX_QUESTION_CHARS = 300;
export const AI_CONSULTING_TARGET_ANSWER_CHARS = { min: 500, max: 800 } as const;
export const AI_CONSULTING_CONTEXT_LIMITS = {
  recentMessages: 6,
  longTermMemories: 8,
} as const;

export type AiConsultingGrantStatus =
  | "active"
  | "exhausted"
  | "revoked"
  | "expired";

export type AiConsultingThreadStatus = "active" | "archived";
export type AiConsultingMessageRole = "user" | "assistant";
export type AiConsultingScopeDecision =
  | "ALLOW"
  | "CLARIFY"
  | "DENY"
  | "SAFETY_REDIRECT";

export type AiConsultingMemoryKind =
  | "user_fact"
  | "life_event"
  | "goal"
  | "preference"
  | "consultation_summary"
  | "analysis_interpretation";

export type AiConsultingMemoryProvenance =
  | "USER_STATED"
  | "ANALYSIS_DERIVED"
  | "SYSTEM_SUMMARY";

export type AiConsultingMemoryStatus = "active" | "superseded" | "deleted";

/**
 * A paid question grant is always scoped to exactly one authenticated user,
 * one profile, one paid source purchase, and one purchased/entitled analysis
 * edition. A memory does not create permission; this grant is the commercial
 * permission boundary.
 */
export interface AiConsultingGrant {
  id: string;
  userId: string;
  profileId: string;
  sourcePurchaseId: string;
  sourceProductId: string;
  baseEntitlementId: string;
  baseProductId: string;
  baseResourceType: "paid_analysis";
  analysisEditionKey: string;
  questionLimit: number;
  questionsUsed: number;
  status: AiConsultingGrantStatus;
  expiresAt: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * A thread cannot float between profiles or products. If the user starts a
 * consultation from another profile/product/edition, a new thread is required.
 */
export interface AiConsultingThread {
  id: string;
  userId: string;
  profileId: string;
  grantId: string;
  baseProductId: string;
  analysisEditionKey: string;
  title: string | null;
  status: AiConsultingThreadStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * scopeDecision is persisted as an audit snapshot. Only a successfully
 * answered user message with ALLOW may consume one paid question.
 */
export interface AiConsultingMessage {
  id: string;
  threadId: string;
  userId: string;
  profileId: string;
  role: AiConsultingMessageRole;
  content: string;
  scopeDecision: AiConsultingScopeDecision | null;
  scopeReasonCode: string | null;
  charged: boolean;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: string;
}

/**
 * Long-term memory is profile-scoped and provenance-tagged. USER_STATED items
 * may be treated as user-provided facts. ANALYSIS_DERIVED and SYSTEM_SUMMARY
 * items must never be silently promoted to objective facts.
 */
export interface AiConsultingMemory {
  id: string;
  userId: string;
  profileId: string;
  kind: AiConsultingMemoryKind;
  provenance: AiConsultingMemoryProvenance;
  content: string;
  sourceThreadId: string | null;
  sourceMessageId: string | null;
  status: AiConsultingMemoryStatus;
  tags: readonly string[];
  createdAt: string;
  updatedAt: string;
}

export function canConsumeAiConsultingQuestion(
  grant: Pick<
    AiConsultingGrant,
    "status" | "questionLimit" | "questionsUsed" | "expiresAt"
  >,
  now: Date = new Date(),
): boolean {
  if (grant.status !== "active") return false;
  if (!Number.isInteger(grant.questionLimit) || grant.questionLimit <= 0) return false;
  if (!Number.isInteger(grant.questionsUsed) || grant.questionsUsed < 0) return false;
  if (grant.questionsUsed >= grant.questionLimit) return false;

  if (grant.expiresAt) {
    const expiresAt = new Date(grant.expiresAt);
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
      return false;
    }
  }

  return true;
}

export function shouldChargeAiConsultingQuestion(input: {
  scopeDecision: AiConsultingScopeDecision;
  answerCompleted: boolean;
  grant: Pick<
    AiConsultingGrant,
    "status" | "questionLimit" | "questionsUsed" | "expiresAt"
  >;
  now?: Date;
}): boolean {
  return (
    input.scopeDecision === "ALLOW" &&
    input.answerCompleted &&
    canConsumeAiConsultingQuestion(input.grant, input.now)
  );
}

export function isAiConsultingMemoryUsableAsUserFact(
  memory: Pick<AiConsultingMemory, "kind" | "provenance" | "status">,
): boolean {
  return (
    memory.status === "active" &&
    memory.provenance === "USER_STATED" &&
    (memory.kind === "user_fact" || memory.kind === "life_event")
  );
}

export function assertSameConsultingBoundary(input: {
  grant: Pick<AiConsultingGrant, "userId" | "profileId" | "baseProductId" | "analysisEditionKey">;
  thread: Pick<AiConsultingThread, "userId" | "profileId" | "baseProductId" | "analysisEditionKey">;
}): void {
  const { grant, thread } = input;
  if (
    grant.userId !== thread.userId ||
    grant.profileId !== thread.profileId ||
    grant.baseProductId !== thread.baseProductId ||
    grant.analysisEditionKey !== thread.analysisEditionKey
  ) {
    throw new Error("AI_CONSULTING_BOUNDARY_MISMATCH");
  }
}
