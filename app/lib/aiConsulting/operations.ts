import "server-only";

import { createAdminClient } from "@/app/lib/supabase/admin";

export type AiConsultingAttemptFailureStage =
  | "context"
  | "model"
  | "output"
  | "completion"
  | "unknown";

export type AiConsultingAttemptStatus = "succeeded" | "failed" | "timed_out";

const SAFE_FAILURE_CODE = /AI_CONSULTING_[A-Z0-9_]+/;

function boundedDuration(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(Math.trunc(value), 86_400_000);
}

export function classifyAiConsultingAttemptFailure(error: unknown): {
  status: "failed" | "timed_out";
  failureStage: AiConsultingAttemptFailureStage;
  failureCode: string;
} {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "";
  const matchedCode = message.match(SAFE_FAILURE_CODE)?.[0] ?? null;

  if (name === "AbortError" || /abort|timeout/i.test(message)) {
    return {
      status: "timed_out",
      failureStage: "model",
      failureCode: "AI_CONSULTING_TIMEOUT",
    };
  }

  if (matchedCode === "AI_CONSULTING_ANSWER_LENGTH_OUT_OF_RANGE" || matchedCode === "AI_CONSULTING_ANSWER_FORMAT_INVALID") {
    return { status: "failed", failureStage: "output", failureCode: matchedCode };
  }

  if (matchedCode?.includes("MODEL_")) {
    return { status: "failed", failureStage: "model", failureCode: matchedCode };
  }

  if (
    matchedCode?.includes("PAID_REPORT")
    || matchedCode?.includes("RECENT_MESSAGES")
    || matchedCode?.includes("MEMOR")
    || matchedCode?.includes("REPORT_SERIALIZATION")
  ) {
    return { status: "failed", failureStage: "context", failureCode: matchedCode };
  }

  if (
    matchedCode?.includes("COMPLETION")
    || matchedCode?.includes("RESERVATION")
    || matchedCode?.includes("MESSAGE_ALREADY_CHARGED")
    || matchedCode?.includes("INVALID_ANSWER")
    || matchedCode?.includes("INVALID_MODEL")
    || matchedCode?.includes("INVALID_TOKEN_COUNT")
  ) {
    return { status: "failed", failureStage: "completion", failureCode: matchedCode };
  }

  return {
    status: "failed",
    failureStage: "unknown",
    failureCode: matchedCode ?? "AI_CONSULTING_UNCLASSIFIED_ERROR",
  };
}

type ChargeableMessageRow = {
  id: string;
  thread_id: string;
  user_id: string;
  profile_id: string;
  scope_decision: string | null;
  created_at: string;
};

type AssistantOutcomeRow = {
  id: string;
  reply_to_message_id: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
};

async function findChargeableMessage(input: {
  userId: string;
  profileId: string;
  threadId: string;
  requestId: string;
}): Promise<ChargeableMessageRow | null> {
  const { data, error } = await createAdminClient()
    .from("ai_consulting_messages")
    .select("id,thread_id,user_id,profile_id,scope_decision,created_at")
    .eq("user_id", input.userId)
    .eq("profile_id", input.profileId)
    .eq("thread_id", input.threadId)
    .eq("request_id", input.requestId)
    .eq("role", "user")
    .maybeSingle<ChargeableMessageRow>();

  if (error) {
    console.error("[ai-consulting-ops] message lookup failed", { code: error.code, message: error.message });
    return null;
  }
  if (!data || data.scope_decision !== "ALLOW") return null;
  return data;
}

async function writeAttempt(payload: Record<string, unknown>): Promise<void> {
  try {
    const { error } = await createAdminClient()
      .from("ai_consulting_attempts")
      .upsert(payload, { onConflict: "user_message_id" });
    if (error) {
      console.error("[ai-consulting-ops] attempt telemetry write failed", {
        code: error.code,
        message: error.message,
      });
    }
  } catch (error) {
    console.error("[ai-consulting-ops] attempt telemetry write threw", {
      message: error instanceof Error ? error.message : "unknown-telemetry-error",
    });
  }
}

/**
 * Best-effort outcome telemetry. The assistant message + credit ledger transaction
 * has already succeeded before this runs; telemetry failure never changes it.
 */
export async function recordAiConsultingSuccessOutcome(input: {
  userId: string;
  profileId: string;
  threadId: string;
  requestId: string;
  assistantMessageId: string;
}): Promise<void> {
  const message = await findChargeableMessage(input);
  if (!message) return;

  const { data: assistant, error } = await createAdminClient()
    .from("ai_consulting_messages")
    .select("id,reply_to_message_id,model,input_tokens,output_tokens,created_at")
    .eq("id", input.assistantMessageId)
    .eq("role", "assistant")
    .maybeSingle<AssistantOutcomeRow>();

  if (error || !assistant || assistant.reply_to_message_id !== message.id) {
    console.error("[ai-consulting-ops] assistant outcome lookup failed", {
      code: error?.code ?? "AI_CONSULTING_OUTCOME_ASSISTANT_MISMATCH",
      message: error?.message ?? "assistant reply boundary mismatch",
    });
    return;
  }

  const startedMs = new Date(message.created_at).getTime();
  const completedMs = new Date(assistant.created_at).getTime();
  await writeAttempt({
    user_message_id: message.id,
    thread_id: message.thread_id,
    user_id: message.user_id,
    profile_id: message.profile_id,
    status: "succeeded",
    failure_stage: null,
    failure_code: null,
    model: assistant.model,
    input_tokens: assistant.input_tokens,
    output_tokens: assistant.output_tokens,
    duration_ms: boundedDuration(completedMs - startedMs),
    started_at: message.created_at,
    completed_at: assistant.created_at,
  });
}

/** Best-effort only: records failures after the commercial path has released capacity. */
export async function recordAiConsultingFailureOutcome(input: {
  userId: string;
  profileId: string;
  threadId: string;
  requestId: string;
  error: unknown;
}): Promise<void> {
  const message = await findChargeableMessage(input);
  if (!message) return;

  const failure = classifyAiConsultingAttemptFailure(input.error);
  const completedAt = new Date().toISOString();
  const startedMs = new Date(message.created_at).getTime();
  const completedMs = new Date(completedAt).getTime();

  await writeAttempt({
    user_message_id: message.id,
    thread_id: message.thread_id,
    user_id: message.user_id,
    profile_id: message.profile_id,
    status: failure.status,
    failure_stage: failure.failureStage,
    failure_code: failure.failureCode,
    model: null,
    input_tokens: null,
    output_tokens: null,
    duration_ms: boundedDuration(completedMs - startedMs),
    started_at: message.created_at,
    completed_at: completedAt,
  });
}

type AttemptRow = {
  user_message_id: string;
  thread_id: string;
  status: AiConsultingAttemptStatus;
  failure_stage: AiConsultingAttemptFailureStage | null;
  failure_code: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  duration_ms: number | null;
  started_at: string;
  completed_at: string;
};

type UserMessageRow = {
  id: string;
  thread_id: string;
  charged: boolean;
  reservation_token: string | null;
  reservation_expires_at: string | null;
  reservation_released_at: string | null;
  created_at: string;
};

type AssistantReplyRow = { reply_to_message_id: string | null };
type ConsumeRow = { related_message_id: string | null };
type ThreadRow = { id: string; base_product_id: string; analysis_edition_key: string };

export type AiConsultingOperationsFailureSample = {
  startedAt: string;
  status: "failed" | "timed_out";
  failureStage: AiConsultingAttemptFailureStage;
  failureCode: string;
  durationMs: number | null;
  productId: string | null;
  analysisEditionKey: string | null;
};

export type AiConsultingOperationsReport = {
  generatedAt: string;
  windowHours: number;
  attempts: number;
  succeeded: number;
  failed: number;
  timedOut: number;
  inFlight: number;
  successRate: number | null;
  averageSuccessDurationMs: number | null;
  failureCodeCounts: Record<string, number>;
  failureStageCounts: Record<AiConsultingAttemptFailureStage, number>;
  chargeIntegrity: {
    chargedWithoutAssistant: number;
    chargedWithoutConsume: number;
    assistantWithoutCharge: number;
    consumeWithoutCharge: number;
    staleReservations: number;
    activeReservations: number;
    releasedUncharged: number;
    releasedWithoutFailureTelemetry: number;
  };
  recentFailures: AiConsultingOperationsFailureSample[];
};

function countBy(rows: readonly AttemptRow[], key: "failure_code" | "failure_stage"): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const value = row[key];
    if (!value) continue;
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

export async function getAiConsultingOperationsReport(windowHours = 24): Promise<AiConsultingOperationsReport> {
  const safeHours = Math.min(24 * 30, Math.max(1, Math.trunc(windowHours)));
  const since = new Date(Date.now() - safeHours * 60 * 60 * 1000).toISOString();
  const nowMs = Date.now();
  const supabase = createAdminClient();

  const [attemptResult, userMessageResult] = await Promise.all([
    supabase
      .from("ai_consulting_attempts")
      .select("user_message_id,thread_id,status,failure_stage,failure_code,model,input_tokens,output_tokens,duration_ms,started_at,completed_at")
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(500),
    supabase
      .from("ai_consulting_messages")
      .select("id,thread_id,charged,reservation_token,reservation_expires_at,reservation_released_at,created_at")
      .eq("role", "user")
      .eq("scope_decision", "ALLOW")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (attemptResult.error) throw new Error(`AI_CONSULTING_OPERATIONS_ATTEMPT_READ_FAILED: ${attemptResult.error.message}`);
  if (userMessageResult.error) throw new Error(`AI_CONSULTING_OPERATIONS_MESSAGE_READ_FAILED: ${userMessageResult.error.message}`);

  const attempts = (attemptResult.data ?? []) as AttemptRow[];
  const userMessages = (userMessageResult.data ?? []) as UserMessageRow[];
  const userMessageIds = userMessages.map((row) => row.id);

  let assistantReplies: AssistantReplyRow[] = [];
  let consumeRows: ConsumeRow[] = [];
  if (userMessageIds.length > 0) {
    const [assistantResult, consumeResult] = await Promise.all([
      supabase.from("ai_consulting_messages").select("reply_to_message_id").eq("role", "assistant").in("reply_to_message_id", userMessageIds),
      supabase.from("ai_consulting_credit_ledger").select("related_message_id").eq("entry_type", "CONSUME").in("related_message_id", userMessageIds),
    ]);
    if (assistantResult.error) throw new Error(`AI_CONSULTING_OPERATIONS_ASSISTANT_READ_FAILED: ${assistantResult.error.message}`);
    if (consumeResult.error) throw new Error(`AI_CONSULTING_OPERATIONS_LEDGER_READ_FAILED: ${consumeResult.error.message}`);
    assistantReplies = (assistantResult.data ?? []) as AssistantReplyRow[];
    consumeRows = (consumeResult.data ?? []) as ConsumeRow[];
  }

  const threadIds = [...new Set(attempts.map((row) => row.thread_id))];
  let threads: ThreadRow[] = [];
  if (threadIds.length > 0) {
    const { data, error } = await supabase
      .from("ai_consulting_threads")
      .select("id,base_product_id,analysis_edition_key")
      .in("id", threadIds);
    if (error) throw new Error(`AI_CONSULTING_OPERATIONS_THREAD_READ_FAILED: ${error.message}`);
    threads = (data ?? []) as ThreadRow[];
  }

  const replyIds = new Set(assistantReplies.map((row) => row.reply_to_message_id).filter((value): value is string => Boolean(value)));
  const consumeIds = new Set(consumeRows.map((row) => row.related_message_id).filter((value): value is string => Boolean(value)));
  const attemptMessageIds = new Set(attempts.map((row) => row.user_message_id));
  const threadById = new Map(threads.map((row) => [row.id, row]));

  let chargedWithoutAssistant = 0;
  let chargedWithoutConsume = 0;
  let assistantWithoutCharge = 0;
  let consumeWithoutCharge = 0;
  let staleReservations = 0;
  let activeReservations = 0;
  let releasedUncharged = 0;
  let releasedWithoutFailureTelemetry = 0;

  for (const row of userMessages) {
    if (row.charged && !replyIds.has(row.id)) chargedWithoutAssistant += 1;
    if (row.charged && !consumeIds.has(row.id)) chargedWithoutConsume += 1;
    if (!row.charged && replyIds.has(row.id)) assistantWithoutCharge += 1;
    if (!row.charged && consumeIds.has(row.id)) consumeWithoutCharge += 1;

    if (!row.charged && row.reservation_released_at) {
      releasedUncharged += 1;
      if (!attemptMessageIds.has(row.id)) releasedWithoutFailureTelemetry += 1;
    } else if (!row.charged && row.reservation_token && row.reservation_expires_at) {
      const expiresMs = new Date(row.reservation_expires_at).getTime();
      if (Number.isFinite(expiresMs) && expiresMs <= nowMs) staleReservations += 1;
      else if (Number.isFinite(expiresMs) && expiresMs > nowMs) activeReservations += 1;
    }
  }

  const succeededRows = attempts.filter((row) => row.status === "succeeded");
  const failedRows = attempts.filter((row) => row.status === "failed");
  const timedOutRows = attempts.filter((row) => row.status === "timed_out");
  const completedCount = succeededRows.length + failedRows.length + timedOutRows.length;
  const successDurations = succeededRows.map((row) => row.duration_ms).filter((value): value is number => value !== null && value >= 0);
  const rawFailureStageCounts = countBy([...failedRows, ...timedOutRows], "failure_stage");
  const failureStageCounts: Record<AiConsultingAttemptFailureStage, number> = {
    context: rawFailureStageCounts.context ?? 0,
    model: rawFailureStageCounts.model ?? 0,
    output: rawFailureStageCounts.output ?? 0,
    completion: rawFailureStageCounts.completion ?? 0,
    unknown: rawFailureStageCounts.unknown ?? 0,
  };

  const recentFailures = attempts
    .filter((row): row is AttemptRow & { status: "failed" | "timed_out"; failure_stage: AiConsultingAttemptFailureStage; failure_code: string } =>
      (row.status === "failed" || row.status === "timed_out") && row.failure_stage !== null && row.failure_code !== null,
    )
    .slice(0, 30)
    .map<AiConsultingOperationsFailureSample>((row) => {
      const thread = threadById.get(row.thread_id);
      return {
        startedAt: row.started_at,
        status: row.status,
        failureStage: row.failure_stage,
        failureCode: row.failure_code,
        durationMs: row.duration_ms,
        productId: thread?.base_product_id ?? null,
        analysisEditionKey: thread?.analysis_edition_key ?? null,
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    windowHours: safeHours,
    attempts: attempts.length,
    succeeded: succeededRows.length,
    failed: failedRows.length,
    timedOut: timedOutRows.length,
    inFlight: activeReservations,
    successRate: completedCount > 0 ? succeededRows.length / completedCount : null,
    averageSuccessDurationMs: successDurations.length > 0
      ? Math.round(successDurations.reduce((sum, value) => sum + value, 0) / successDurations.length)
      : null,
    failureCodeCounts: countBy([...failedRows, ...timedOutRows], "failure_code"),
    failureStageCounts,
    chargeIntegrity: {
      chargedWithoutAssistant,
      chargedWithoutConsume,
      assistantWithoutCharge,
      consumeWithoutCharge,
      staleReservations,
      activeReservations,
      releasedUncharged,
      releasedWithoutFailureTelemetry,
    },
    recentFailures,
  };
}
