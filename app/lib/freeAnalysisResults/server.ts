import { createHash } from "node:crypto";
import type {
  AnalyzeProfileMetadata,
  AnalyzeSuccessResponse,
} from "../analyzeApiTypes";
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
};

export async function listUserFreeAnalysisResults(
  userId: string,
): Promise<FreeAnalysisResultSummary[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("free_analysis_results")
    .select("profile_id, status")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`무료 분석 결과 목록을 조회하지 못했습니다: ${error.message}`);
  }

  return (data ?? []).map((row: { profile_id: string; status: FreeAnalysisResultStatus }) => ({
    profileId: row.profile_id,
    status: row.status,
  }));
}

export type FreeAnalysisResultClaim =
  | { state: "claimed"; record: FreeAnalysisResultRecord }
  | { state: "completed"; record: FreeAnalysisResultRecord }
  | { state: "generating"; record: FreeAnalysisResultRecord };

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
    return { state: "completed", record: existing };
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