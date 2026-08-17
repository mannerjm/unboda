import { createHash } from "node:crypto";
import type {
  AnalyzeProfileMetadata,
  AnalyzeSuccessResponse,
} from "../analyzeApiTypes";
import { MAX_MAIN_ANALYSIS_RETRY_COUNT } from "../analyzeApiTypes";
import { createAdminClient } from "../supabase/admin";
import type { ProfileDto } from "../profiles/types";

export type FreeAnalysisResultStatus = "generating" | "completed" | "failed";

export type FreeAnalysisResultRecord = {
  id: string;
  userId: string;
  profileId: string;
  profileFingerprint: string;
  profileSnapshot: AnalyzeProfileMetadata;
  status: FreeAnalysisResultStatus;
  content: AnalyzeSuccessResponse | null;
  errorCode: string | null;
  updatedAt: string;
};

type FreeAnalysisResultRow = {
  id: string;
  user_id: string;
  profile_id: string;
  profile_fingerprint: string;
  profile_snapshot: AnalyzeProfileMetadata;
  status: FreeAnalysisResultStatus;
  content: AnalyzeSuccessResponse | null;
  error_code: string | null;
  updated_at: string;
};

const STALE_GENERATING_MS = 5 * 60 * 1000;

// Same staleness bound used for a stuck initial generation: main-analysis is
// bounded by the same 120s OpenAI timeout, so a stuck retry lock is stale for
// the same reason and can reuse the same threshold.
export const STALE_RETRY_LOCK_MS = STALE_GENERATING_MS;

export function toAnalyzeProfileMetadata(profile: ProfileDto): AnalyzeProfileMetadata {
  return {
    id: profile.id,
    label: profile.label,
    birthDate: profile.birthDate,
    birthTime: profile.birthTime,
    gender: profile.gender,
    calendarType: profile.calendarType,
    isLeapMonth: profile.isLeapMonth,
  };
}

export function getProfileFingerprint(profile: ProfileDto): string {
  const snapshot = toAnalyzeProfileMetadata(profile);
  const birthInputs = {
    birthDate: snapshot.birthDate,
    birthTime: snapshot.birthTime,
    gender: snapshot.gender,
    calendarType: snapshot.calendarType,
    isLeapMonth: snapshot.isLeapMonth,
  };

  return createHash("sha256").update(JSON.stringify(birthInputs)).digest("hex");
}

function toRecord(row: FreeAnalysisResultRow): FreeAnalysisResultRecord {
  return {
    id: row.id,
    userId: row.user_id,
    profileId: row.profile_id,
    profileFingerprint: row.profile_fingerprint,
    profileSnapshot: row.profile_snapshot,
    status: row.status,
    content: row.content,
    errorCode: row.error_code,
    updatedAt: row.updated_at,
  };
}

export async function getFreeAnalysisResult(
  userId: string,
  profileId: string,
): Promise<FreeAnalysisResultRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("free_analysis_results")
    .select("*")
    .eq("user_id", userId)
    .eq("profile_id", profileId)
    .maybeSingle<FreeAnalysisResultRow>();

  if (error) {
    throw new Error(`무료 분석 결과를 조회하지 못했습니다: ${error.message}`);
  }

  return data ? toRecord(data) : null;
}

export type FreeAnalysisResultSummary = {
  profileId: string;
  status: FreeAnalysisResultStatus;
  profileFingerprint: string;
  // Read from the stored content in the same query; "failed" means the row is
  // complete but its AI main analysis still needs a retry.
  mainAnalysisStatus?: "completed" | "failed" | null;
};

export async function listUserFreeAnalysisResults(
  userId: string,
): Promise<FreeAnalysisResultSummary[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("free_analysis_results")
    .select(
      "profile_id, status, profile_fingerprint, main_analysis_status:content->generationMeta->>mainAnalysisStatus",
    )
    .eq("user_id", userId);

  if (error) {
    throw new Error(`무료 분석 결과 목록을 조회하지 못했습니다: ${error.message}`);
  }

  return (data ?? []).map((row: {
    profile_id: string;
    status: FreeAnalysisResultStatus;
    profile_fingerprint: string;
    main_analysis_status: string | null;
  }) => ({
    profileId: row.profile_id,
    status: row.status,
    profileFingerprint: row.profile_fingerprint,
    mainAnalysisStatus:
      row.main_analysis_status === "failed" || row.main_analysis_status === "completed"
        ? row.main_analysis_status
        : null,
  }));
}

/**
 * "stale" means the stored result was generated from birth inputs the Profile no
 * longer has, which is exactly what GET /api/free-analysis/[profileId] answers
 * with 404. Listing it as completed would advertise a result that cannot open.
 * "needs_retry" is derived, never a stored status: the row stays "completed" and
 * only its AI main analysis has to be regenerated from the result screen.
 */
export type ProfileFreeAnalysisStatus =
  | FreeAnalysisResultStatus
  | "none"
  | "stale"
  | "needs_retry";

export function resolveProfileFreeAnalysisStatus(
  profile: ProfileDto,
  summaries: FreeAnalysisResultSummary[],
): ProfileFreeAnalysisStatus {
  const summary = summaries.find((item) => item.profileId === profile.id);

  if (!summary) return "none";
  if (summary.status !== "completed") return summary.status;

  if (summary.profileFingerprint === getProfileFingerprint(profile)) {
    return summary.mainAnalysisStatus === "failed" ? "needs_retry" : "completed";
  }

  return "stale";
}

export type FreeAnalysisResultClaim =
  | { state: "claimed"; record: FreeAnalysisResultRecord }
  | { state: "completed"; record: FreeAnalysisResultRecord }
  | { state: "generating"; record: FreeAnalysisResultRecord };

/**
 * A completed row whose main analysis failed and whose retry budget is gone:
 * the retry API can no longer fix it, so a fresh generation is the only way out.
 */
export function isMainAnalysisRetryExhausted(
  content: AnalyzeSuccessResponse | null,
): boolean {
  if (content?.generationMeta?.mainAnalysisStatus !== "failed") return false;

  return (content.generationMeta.mainAnalysisRetryCount ?? 0) >= MAX_MAIN_ANALYSIS_RETRY_COUNT;
}

export async function claimFreeAnalysisResult(input: {
  userId: string;
  profile: ProfileDto;
}): Promise<FreeAnalysisResultClaim> {
  const fingerprint = getProfileFingerprint(input.profile);
  const snapshot = toAnalyzeProfileMetadata(input.profile);
  const existing = await getFreeAnalysisResult(input.userId, input.profile.id);

  if (existing?.profileFingerprint !== undefined && existing.profileFingerprint !== fingerprint) {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("free_analysis_results")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", input.userId)
      .eq("profile_id", input.profile.id)
      .eq("profile_fingerprint", existing.profileFingerprint);

    if (error) {
      throw new Error(`오래된 무료 분석 결과를 정리하지 못했습니다: ${error.message}`);
    }
  } else if (existing?.status === "completed" && existing.content) {
    if (!isMainAnalysisRetryExhausted(existing.content)) {
      return { state: "completed", record: existing };
    }

    // The conditional UPDATE is the claim: the loser sees status "generating".
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("free_analysis_results")
      .update({ status: "generating" satisfies FreeAnalysisResultStatus, error_code: null })
      .eq("id", existing.id)
      .eq("user_id", input.userId)
      .eq("profile_id", input.profile.id)
      .eq("profile_fingerprint", fingerprint)
      .eq("status", "completed")
      .eq("content->generationMeta->>mainAnalysisStatus", "failed")
      .select("*")
      .maybeSingle<FreeAnalysisResultRow>();

    if (error) {
      throw new Error(`무료 분석 재생성을 시작하지 못했습니다: ${error.message}`);
    }

    return data
      ? { state: "claimed", record: toRecord(data) }
      : { state: "generating", record: existing };
  } else if (existing?.status === "generating") {
    const staleBefore = new Date(Date.now() - STALE_GENERATING_MS).toISOString();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("free_analysis_results")
      .update({ error_code: null })
      .eq("id", existing.id)
      .eq("status", "generating")
      .lt("updated_at", staleBefore)
      .select("*")
      .maybeSingle<FreeAnalysisResultRow>();

    if (error) {
      throw new Error(`무료 분석 생성 상태를 확인하지 못했습니다: ${error.message}`);
    }

    if (!data) return { state: "generating", record: existing };
    return { state: "claimed", record: toRecord(data) };
  } else if (existing?.status === "failed") {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("free_analysis_results")
      .update({ status: "generating", error_code: null })
      .eq("id", existing.id)
      .eq("status", "failed")
      .select("*")
      .maybeSingle<FreeAnalysisResultRow>();

    if (error) {
      throw new Error(`무료 분석 재시도를 시작하지 못했습니다: ${error.message}`);
    }

    if (data) return { state: "claimed", record: toRecord(data) };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("free_analysis_results")
    .upsert(
      {
        user_id: input.userId,
        profile_id: input.profile.id,
        profile_fingerprint: fingerprint,
        profile_snapshot: snapshot,
        status: "generating" satisfies FreeAnalysisResultStatus,
        content: null,
        error_code: null,
        completed_at: null,
      },
      { onConflict: "user_id,profile_id", ignoreDuplicates: true },
    )
    .select("*")
    .maybeSingle<FreeAnalysisResultRow>();

  if (error) {
    throw new Error(`무료 분석 생성을 시작하지 못했습니다: ${error.message}`);
  }

  if (data) return { state: "claimed", record: toRecord(data) };

  const current = await getFreeAnalysisResult(input.userId, input.profile.id);
  if (!current) throw new Error("무료 분석 생성 상태를 확인하지 못했습니다.");
  return current.status === "completed" && current.content
    ? { state: "completed", record: current }
    : { state: "generating", record: current };
}

export async function completeFreeAnalysisResult(input: {
  record: FreeAnalysisResultRecord;
  content: AnalyzeSuccessResponse;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("free_analysis_results")
    .update({
      status: "completed" satisfies FreeAnalysisResultStatus,
      content: input.content,
      error_code: null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.record.id)
    .eq("user_id", input.record.userId)
    .eq("profile_id", input.record.profileId)
    .eq("profile_fingerprint", input.record.profileFingerprint)
    .eq("status", "generating");

  if (error) {
    throw new Error(`무료 분석 결과를 저장하지 못했습니다: ${error.message}`);
  }
}

export async function failFreeAnalysisResult(input: {
  record: FreeAnalysisResultRecord;
  errorCode: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("free_analysis_results")
    .update({ status: "failed", error_code: input.errorCode })
    .eq("id", input.record.id)
    .eq("user_id", input.record.userId)
    .eq("profile_id", input.record.profileId)
    .eq("profile_fingerprint", input.record.profileFingerprint)
    .eq("status", "generating");

  if (error) {
    throw new Error(`무료 분석 실패 상태를 저장하지 못했습니다: ${error.message}`);
  }
}

/**
 * Atomically claims the right to retry main-analysis for a completed row whose
 * generationMeta.mainAnalysisStatus is "failed". The single conditional UPDATE
 * itself is the claim: it only affects a row whose retry lock is missing,
 * "idle", or a stale "generating" lock left over from a crashed attempt.
 * Also enforces MAX_MAIN_ANALYSIS_RETRY_COUNT and advances the count in the
 * same update, so a claim win and "1 retry attempt used" are the same event.
 */
export type MainAnalysisRetryClaimResult<TRecord = FreeAnalysisResultRecord> =
  | { state: "claimed"; record: TRecord }
  | { state: "in_progress" }
  | { state: "limit_exceeded" };

export async function claimMainAnalysisRetry(
  record: FreeAnalysisResultRecord,
): Promise<MainAnalysisRetryClaimResult> {
  if (record.status !== "completed" || !record.content) return { state: "in_progress" };
  if (record.content.generationMeta?.mainAnalysisStatus !== "failed") return { state: "in_progress" };

  const retryCount = record.content.generationMeta?.mainAnalysisRetryCount ?? 0;
  if (retryCount >= MAX_MAIN_ANALYSIS_RETRY_COUNT) {
    return { state: "limit_exceeded" };
  }

  const nextContent: AnalyzeSuccessResponse = {
    ...record.content,
    generationMeta: {
      ...record.content.generationMeta,
      mainAnalysisRetryStatus: "generating",
      mainAnalysisRetryCount: retryCount + 1,
    },
  };
  const staleBefore = new Date(Date.now() - STALE_RETRY_LOCK_MS).toISOString();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("free_analysis_results")
    .update({ content: nextContent })
    .eq("id", record.id)
    .eq("user_id", record.userId)
    .eq("profile_id", record.profileId)
    .eq("status", "completed")
    .eq("content->generationMeta->>mainAnalysisStatus", "failed")
    .or(
      `content->generationMeta->>mainAnalysisRetryStatus.is.null,content->generationMeta->>mainAnalysisRetryStatus.eq.idle,and(content->generationMeta->>mainAnalysisRetryStatus.eq.generating,updated_at.lt.${staleBefore})`,
    )
    .select("*")
    .maybeSingle<FreeAnalysisResultRow>();

  if (error) {
    throw new Error(`AI 해석 재생성을 시작하지 못했습니다: ${error.message}`);
  }

  return data ? { state: "claimed", record: toRecord(data) } : { state: "in_progress" };
}

/**
 * Writes back only `result` and `generationMeta` after a retry attempt,
 * preserving every other stored field (saju/profile/freeAnalysis/etc.) and
 * releasing the retry lock regardless of outcome.
 */
export async function completeMainAnalysisRetry(input: {
  record: FreeAnalysisResultRecord;
  result: string;
  mainAnalysisStatus: "completed" | "failed";
}): Promise<AnalyzeSuccessResponse> {
  if (!input.record.content) {
    throw new Error("재생성할 기존 분석 결과가 없습니다.");
  }

  const nextContent: AnalyzeSuccessResponse = {
    ...input.record.content,
    result: input.mainAnalysisStatus === "completed" ? input.result : input.record.content.result,
    generationMeta: {
      ...input.record.content.generationMeta,
      mainAnalysisStatus: input.mainAnalysisStatus,
      mainAnalysisRetryStatus: "idle",
    },
  };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("free_analysis_results")
    .update({ content: nextContent })
    .eq("id", input.record.id)
    .eq("user_id", input.record.userId)
    .eq("profile_id", input.record.profileId)
    .eq("content->generationMeta->>mainAnalysisRetryStatus", "generating");

  if (error) {
    throw new Error(`AI 해석 재생성 결과를 저장하지 못했습니다: ${error.message}`);
  }

  return nextContent;
}