import { createAdminClient } from "./supabase/admin";
import type {
  PaidGenerationAttempt,
  PaidGenerationFailureStage,
} from "./paidGenerationTelemetry";
import {
  nextPaidGenerationRetryIndex,
  toPaidGenerationAttemptRow,
} from "./paidGenerationTelemetry";

export async function getNextPaidGenerationRetryIndex(
  generationId: string,
): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("paid_generation_attempts")
    .select("retry_index")
    .eq("generation_id", generationId)
    .order("retry_index", { ascending: false })
    .limit(1)
    .maybeSingle<{ retry_index: number }>();

  if (error) {
    throw new Error(`유료 생성 재시도 번호를 확인하지 못했습니다: ${error.message}`);
  }

  return nextPaidGenerationRetryIndex(data?.retry_index ?? null);
}

export async function persistPaidGenerationAttempt(
  attempt: PaidGenerationAttempt,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("paid_generation_attempts")
    .insert(toPaidGenerationAttemptRow(attempt));

  if (error) {
    throw new Error(`유료 생성 telemetry를 저장하지 못했습니다: ${error.message}`);
  }
}

export async function markPaidGenerationPersistenceFailure(input: {
  attemptId: string;
  failureStage: Extract<PaidGenerationFailureStage, "persistence">;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("paid_generation_attempts")
    // status must move off "succeeded" so it doesn't contradict failure_stage.
    .update({ failure_stage: input.failureStage, status: "failed" })
    .eq("attempt_id", input.attemptId);

  if (error) {
    throw new Error(`유료 생성 persistence telemetry를 갱신하지 못했습니다: ${error.message}`);
  }
}