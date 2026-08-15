import "server-only";

import type { AnalyzeSuccessResponse } from "../analyzeApiTypes";
import {
  getProfileFingerprint,
  toAnalyzeProfileMetadata,
} from "../freeAnalysisResults/server";
import type { ProfileDto, ProfileInput } from "../profiles/types";
import { createAdminClient } from "../supabase/admin";

export type GuestFreeAnalysisStatus = "generating" | "completed" | "failed";

export type GuestFreeAnalysisRecord = {
  id: string;
  secretHash: string;
  status: GuestFreeAnalysisStatus;
  profileInput: ProfileInput;
  profileFingerprint: string;
  content: AnalyzeSuccessResponse | null;
  selectedProductId: string | null;
  expiresAt: string;
  consumedAt: string | null;
  transferredUserId: string | null;
  resolvedProfileId: string | null;
};

type GuestFreeAnalysisRow = {
  id: string;
  secret_hash: string;
  status: GuestFreeAnalysisStatus;
  profile_input: ProfileInput;
  profile_fingerprint: string;
  content: AnalyzeSuccessResponse | null;
  selected_product_id: string | null;
  expires_at: string;
  consumed_at: string | null;
  transferred_user_id: string | null;
  resolved_profile_id: string | null;
};

function profileForFingerprint(input: ProfileInput): ProfileDto {
  return {
    ...input,
    id: "00000000-0000-4000-8000-000000000000",
    createdAt: "",
    updatedAt: "",
  };
}

export function getGuestProfileFingerprint(input: ProfileInput): string {
  return getProfileFingerprint(profileForFingerprint(input));
}

export function toGuestAnalyzeProfile(input: ProfileInput, analysisId: string) {
  return {
    ...toAnalyzeProfileMetadata({ ...profileForFingerprint(input), id: analysisId }),
  };
}

function toRecord(row: GuestFreeAnalysisRow): GuestFreeAnalysisRecord {
  return {
    id: row.id,
    secretHash: row.secret_hash,
    status: row.status,
    profileInput: row.profile_input,
    profileFingerprint: row.profile_fingerprint,
    content: row.content,
    selectedProductId: row.selected_product_id,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
    transferredUserId: row.transferred_user_id,
    resolvedProfileId: row.resolved_profile_id,
  };
}

export async function createGuestFreeAnalysis(input: {
  secretHash: string;
  profileInput: ProfileInput;
}): Promise<GuestFreeAnalysisRecord> {
  const supabase = createAdminClient();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("guest_free_analyses")
    .insert({
      secret_hash: input.secretHash,
      profile_input: input.profileInput,
      profile_fingerprint: getGuestProfileFingerprint(input.profileInput),
      status: "generating" satisfies GuestFreeAnalysisStatus,
      expires_at: expiresAt,
    })
    .select("*")
    .single<GuestFreeAnalysisRow>();

  if (error || !data) {
    throw new Error(`비회원 무료 분석 생성을 시작하지 못했습니다: ${error?.message ?? "unknown"}`);
  }

  return toRecord(data);
}

export async function getGuestFreeAnalysis(
  analysisId: string,
  secretHash: string,
): Promise<GuestFreeAnalysisRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guest_free_analyses")
    .select("*")
    .eq("id", analysisId)
    .eq("secret_hash", secretHash)
    .maybeSingle<GuestFreeAnalysisRow>();

  if (error) {
    throw new Error(`비회원 무료 분석 결과를 조회하지 못했습니다: ${error.message}`);
  }

  return data ? toRecord(data) : null;
}

export function isUsableGuestFreeAnalysis(record: GuestFreeAnalysisRecord): boolean {
  return !record.consumedAt && new Date(record.expiresAt).getTime() > Date.now();
}

export async function completeGuestFreeAnalysis(
  record: GuestFreeAnalysisRecord,
  content: AnalyzeSuccessResponse,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("guest_free_analyses")
    .update({ status: "completed", content })
    .eq("id", record.id)
    .eq("secret_hash", record.secretHash)
    .eq("status", "generating");

  if (error) throw new Error(`비회원 무료 분석 결과를 저장하지 못했습니다: ${error.message}`);
}

export async function failGuestFreeAnalysis(record: GuestFreeAnalysisRecord): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("guest_free_analyses")
    .update({ status: "failed" })
    .eq("id", record.id)
    .eq("secret_hash", record.secretHash)
    .eq("status", "generating");

  if (error) throw new Error(`비회원 무료 분석 실패 상태를 저장하지 못했습니다: ${error.message}`);
}

export async function setGuestSelectedProduct(
  record: GuestFreeAnalysisRecord,
  productId: string,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("guest_free_analyses")
    .update({ selected_product_id: productId })
    .eq("id", record.id)
    .eq("secret_hash", record.secretHash)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString());

  if (error) throw new Error(`비회원 선택 상품을 저장하지 못했습니다: ${error.message}`);
}

export type GuestTransferResult = {
  resolvedProfileId: string;
  selectedProductId: string | null;
  transferStatus: string;
};

export async function transferGuestFreeAnalysisToUser(input: {
  record: GuestFreeAnalysisRecord;
  userId: string;
}): Promise<GuestTransferResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("complete_guest_analysis_transfer", {
    p_guest_analysis_id: input.record.id,
    p_secret_hash: input.record.secretHash,
    p_user_id: input.userId,
    p_profile_fingerprint: input.record.profileFingerprint,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.resolved_profile_id) throw new Error("비회원 분석 이전 결과를 확인하지 못했습니다.");

  return {
    resolvedProfileId: row.resolved_profile_id,
    selectedProductId: row.selected_product_id ?? null,
    transferStatus: row.transfer_status,
  };
}