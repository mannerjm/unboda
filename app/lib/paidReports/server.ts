import type { PaidAnalysisDetailOutputV3 } from "../paidAnalysisDetailOutput";
import {
  getCanonicalPremiumProductId,
  getPremiumProduct,
} from "../premiumProductRegistry";
import { listUserEntitlements } from "../purchases/server";
import { PAID_ANALYSIS_RESOURCE_TYPE } from "../purchases/types";
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
  /** STEP 57D-48F-B foundation column; null/LEGACY/LIFETIME until report identity becomes edition-scoped. */
  analysisEditionKey: string | null;
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
  analysis_edition_key: string | null;
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
    analysisEditionKey: row.analysis_edition_key,
  };
}

export async function getPaidReport(
  userId: string,
  profileId: string,
  productId: string,
  analysisEditionKey: string,
): Promise<PaidReportRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("paid_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("profile_id", profileId)
    .eq("product_id", productId)
    .eq("analysis_edition_key", analysisEditionKey)
    .maybeSingle<PaidReportRow>();

  if (error) {
    throw new Error(`유료 분석 결과를 조회하지 못했습니다: ${error.message}`);
  }

  return data ? toPaidReportRecord(data) : null;
}

export type PaidReportSummary = {
  profileId: string;
  productId: string;
  status: PaidReportStatus;
};

export async function listUserPaidReports(userId: string): Promise<PaidReportSummary[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("paid_reports")
    .select("profile_id, product_id, status")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`유료 분석 결과 목록을 조회하지 못했습니다: ${error.message}`);
  }

  return (data ?? []).map((row: {
    profile_id: string;
    product_id: string;
    status: PaidReportStatus;
  }) => ({
    profileId: row.profile_id,
    productId: row.product_id,
    status: row.status,
  }));
}

export type PaidAnalysisSummary = {
  profileId: string;
  productId: string;
  productName: string;
  reportStatus: PaidReportStatus | "none";
};

function paidReportKey(profileId: string, productId: string): string {
  return `${profileId}|${productId}`;
}

/**
 * Active entitlements decide what the account may open; paid_reports only adds
 * the generation state. Two queries total, regardless of profile count.
 */
export async function listUserPaidAnalysisSummaries(
  userId: string,
): Promise<PaidAnalysisSummary[]> {
  const [entitlements, reports] = await Promise.all([
    listUserEntitlements(userId),
    listUserPaidReports(userId),
  ]);

  const statusByKey = new Map<string, PaidReportStatus>();
  for (const report of reports) {
    statusByKey.set(
      paidReportKey(report.profileId, getCanonicalPremiumProductId(report.productId)),
      report.status,
    );
  }

  return entitlements
    .filter((entitlement) => entitlement.resourceType === PAID_ANALYSIS_RESOURCE_TYPE)
    .map((entitlement) => {
      const productId = getCanonicalPremiumProductId(entitlement.resourceId);
      const product = getPremiumProduct(productId);

      return {
        profileId: entitlement.profileId,
        productId,
        productName: product?.title ?? productId,
        reportStatus: statusByKey.get(paidReportKey(entitlement.profileId, productId)) ?? "none",
      };
    });
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
  analysisEditionKey: string;
}): Promise<PaidReportClaim> {
  if (!input.analysisEditionKey) {
    throw new Error("분석 에디션을 확인하지 못했습니다.");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("paid_reports")
    .upsert(
      {
        user_id: input.userId,
        profile_id: input.profileId,
        product_id: input.productId,
        purchase_id: input.purchaseId,
        analysis_edition_key: input.analysisEditionKey,
        status: "generating" satisfies PaidReportStatus,
        content: null,
        error_code: null,
        completed_at: null,
      },
      {
        onConflict: "user_id,profile_id,product_id,analysis_edition_key",
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

  const existing = await getPaidReport(input.userId, input.profileId, input.productId, input.analysisEditionKey);

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
    .eq("analysis_edition_key", input.analysisEditionKey)
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

  const current = await getPaidReport(input.userId, input.profileId, input.productId, input.analysisEditionKey);

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
