import type { PaidAnalysisDetailOutputV3 } from "../paidAnalysisDetailOutput";
import { createAdminClient } from "../supabase/admin";

export type PaidReportStatus = "generating" | "completed" | "failed";

export type PaidReportRecord = {
  id: string;
  userId: string;
  profileId: string;
  productId: string;
  purchaseId: string | null;
  status: PaidReportStatus;
  content: PaidAnalysisDetailOutputV3 | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

type PaidReportRow = {
  id: string;
  user_id: string;
  profile_id: string;
  product_id: string;
  purchase_id: string | null;
  status: PaidReportStatus;
  content: PaidAnalysisDetailOutputV3 | null;
  error_code: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

const STALE_GENERATING_MS = 5 * 60 * 1000;

function toPaidReportRecord(row: PaidReportRow): PaidReportRecord {
  return {
    id: row.id,
    userId: row.user_id,
    profileId: row.profile_id,
    productId: row.product_id,
    purchaseId: row.purchase_id,
    status: row.status,
    content: row.content,
    errorCode: row.error_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

export async function getPaidReport(
  userId: string,
  profileId: string,
  productId: string,
): Promise<PaidReportRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("paid_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("profile_id", profileId)
    .eq("product_id", productId)
    .maybeSingle<PaidReportRow>();

  if (error) {
    throw new Error(`유료 분석 결과를 조회하지 못했습니다: ${error.message}`);
  }

  return data ? toPaidReportRecord(data) : null;
}

export type PaidReportClaim =
  | { state: "claimed"; report: PaidReportRecord }
  | { state: "completed"; report: PaidReportRecord }
  | { state: "generating"; report: PaidReportRecord };

export async function claimPaidReport(input: {
  userId: string;
  profileId: string;
  productId: string;
  purchaseId: string | null;
}): Promise<PaidReportClaim> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("paid_reports")
    .upsert(
      {
        user_id: input.userId,
        profile_id: input.profileId,
        product_id: input.productId,
        purchase_id: input.purchaseId,
        status: "generating" satisfies PaidReportStatus,
        content: null,
        error_code: null,
        completed_at: null,
      },
      {
        onConflict: "user_id,profile_id,product_id",
        ignoreDuplicates: true,
      },
    )
    .select("*")
    .maybeSingle<PaidReportRow>();

  if (error) {
    throw new Error(`유료 분석 결과 생성을 시작하지 못했습니다: ${error.message}`);
  }

  if (data) {
    return { state: "claimed", report: toPaidReportRecord(data) };
  }

  const existing = await getPaidReport(input.userId, input.profileId, input.productId);

  if (!existing) {
    throw new Error("유료 분석 생성 상태를 확인하지 못했습니다.");
  }

  if (existing.status === "completed") {
    return { state: "completed", report: existing };
  }

  const staleBefore = new Date(Date.now() - STALE_GENERATING_MS).toISOString();
  const retryableStatus = existing.status === "failed" ? "failed" : "generating";
  const retryQuery = supabase
    .from("paid_reports")
    .update({
      status: "generating" satisfies PaidReportStatus,
      purchase_id: input.purchaseId,
      content: null,
      error_code: null,
      completed_at: null,
    })
    .eq("user_id", input.userId)
    .eq("profile_id", input.profileId)
    .eq("product_id", input.productId)
    .eq("status", retryableStatus);

  const { data: reclaimed, error: reclaimError } = existing.status === "generating"
    ? await retryQuery.lt("updated_at", staleBefore).select("*").maybeSingle<PaidReportRow>()
    : await retryQuery.select("*").maybeSingle<PaidReportRow>();

  if (reclaimError) {
    throw new Error(`유료 분석 재시도를 시작하지 못했습니다: ${reclaimError.message}`);
  }

  if (reclaimed) {
    return { state: "claimed", report: toPaidReportRecord(reclaimed) };
  }

  const current = await getPaidReport(input.userId, input.profileId, input.productId);

  if (!current) {
    throw new Error("유료 분석 생성 상태를 다시 확인하지 못했습니다.");
  }

  return current.status === "completed"
    ? { state: "completed", report: current }
    : { state: "generating", report: current };
}

export async function completePaidReport(input: {
  reportId: string;
  userId: string;
  profileId: string;
  productId: string;
  content: PaidAnalysisDetailOutputV3;
}): Promise<PaidReportRecord> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("paid_reports")
    .update({
      status: "completed" satisfies PaidReportStatus,
      content: input.content,
      error_code: null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.reportId)
    .eq("user_id", input.userId)
    .eq("profile_id", input.profileId)
    .eq("product_id", input.productId)
    .eq("status", "generating")
    .select("*")
    .single<PaidReportRow>();

  if (error || !data) {
    throw new Error(`유료 분석 결과를 저장하지 못했습니다: ${error?.message ?? "unknown"}`);
  }

  return toPaidReportRecord(data);
}

export async function failPaidReport(input: {
  reportId: string;
  userId: string;
  profileId: string;
  productId: string;
  errorCode: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("paid_reports")
    .update({
      status: "failed" satisfies PaidReportStatus,
      error_code: input.errorCode,
    })
    .eq("id", input.reportId)
    .eq("user_id", input.userId)
    .eq("profile_id", input.profileId)
    .eq("product_id", input.productId)
    .eq("status", "generating");

  if (error) {
    throw new Error(`유료 분석 실패 상태를 저장하지 못했습니다: ${error.message}`);
  }
}
