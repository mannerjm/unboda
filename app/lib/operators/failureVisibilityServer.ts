import "server-only";

import { formatAnalysisEditionLabel } from "@/app/lib/analysisEditionLabel";
import { PAID_REPORT_STALE_GENERATING_MS } from "@/app/lib/paidReports/server";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { recordOperatorAuditEvent, requireOperator } from "./server";

const QUEUE_LIMIT = 20;

export const OPERATIONAL_FAILURE_CATEGORIES = [
  "PAYMENT_RECONCILIATION",
  "REFUND_RETRY",
  "REFUND_OWNER_REVIEW",
  "REPORT_FAILED",
  "REPORT_STALE",
  "CLOSURE_RETRY",
  "CLOSURE_OWNER_REVIEW",
] as const;

export type OperationalFailureCategory = (typeof OPERATIONAL_FAILURE_CATEGORIES)[number];

export class OperationalFailureError extends Error {
  constructor(readonly code: "INVALID_CATEGORY" | "AUDIT_FAILED" | "LOOKUP_FAILED") {
    super(code);
    this.name = "OperationalFailureError";
  }
}

export type OperationalFailureSummary = Record<OperationalFailureCategory, number>;
export type OperationalFailureQueueItem = {
  referenceId: string;
  productLabel: string | null;
  editionLabel: string | null;
  status: string;
  retryCount: number | null;
  nextRetryAt: string | null;
  failureCode: string | null;
  updatedAt: string;
};

function isCategory(value: unknown): value is OperationalFailureCategory {
  return typeof value === "string" && OPERATIONAL_FAILURE_CATEGORIES.includes(value as OperationalFailureCategory);
}

async function auditOrFail(category: string, outcome: "SUCCESS" | "ERROR"): Promise<void> {
  try {
    await recordOperatorAuditEvent({ action: "FAILURE_QUEUE_VIEW", targetType: "FAILURE_QUEUE", targetReference: category, outcome });
  } catch {
    throw new OperationalFailureError("AUDIT_FAILED");
  }
}

function toItem(row: { id?: string; order_id?: string; user_id?: string; product_id?: string; analysis_edition_key?: string | null; status?: string; reconciliation_status?: string; retry_count?: number; next_retry_at?: string | null; last_provider_error_code?: string | null; error_code?: string | null; closure_last_error_code?: string | null; updated_at?: string; created_at?: string }): OperationalFailureQueueItem {
  const product = row.product_id ? getPremiumProduct(row.product_id) : null;
  return {
    referenceId: row.order_id ?? row.id ?? row.user_id ?? "",
    productLabel: product?.title ?? row.product_id ?? null,
    editionLabel: row.analysis_edition_key ? formatAnalysisEditionLabel(row.analysis_edition_key) : null,
    status: row.status ?? row.reconciliation_status ?? "UNKNOWN",
    retryCount: row.retry_count ?? null,
    nextRetryAt: row.next_retry_at ?? null,
    failureCode: row.last_provider_error_code ?? row.error_code ?? row.closure_last_error_code ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? "",
  };
}

export async function getOperationalFailureSummary(): Promise<OperationalFailureSummary> {
  await requireOperator();
  const supabase = createAdminClient();
  const staleBefore = new Date(Date.now() - PAID_REPORT_STALE_GENERATING_MS).toISOString();
  try {
    const results = await Promise.all([
      supabase.from("toss_payment_records").select("id", { count: "exact", head: true }).in("reconciliation_status", ["reconciliation_required", "reconciliation_failed", "terminal_mismatch"]),
      supabase.from("refund_workflows").select("id", { count: "exact", head: true }).eq("status", "REFUND_FAILED_RETRYING"),
      supabase.from("refund_workflows").select("id", { count: "exact", head: true }).eq("status", "OWNER_REVIEW_REQUIRED"),
      supabase.from("paid_reports").select("id", { count: "exact", head: true }).eq("status", "failed"),
      supabase.from("paid_reports").select("id", { count: "exact", head: true }).eq("status", "generating").lt("updated_at", staleBefore),
      supabase.from("account_lifecycles").select("id", { count: "exact", head: true }).eq("status", "DELETION_REQUESTED").eq("closure_owner_review_required", false).not("closure_next_retry_at", "is", null),
      supabase.from("account_lifecycles").select("id", { count: "exact", head: true }).eq("status", "DELETION_REQUESTED").eq("closure_owner_review_required", true),
    ]);
    if (results.some((result) => result.error)) throw new Error("failure summary unavailable");
    await auditOrFail("SUMMARY", "SUCCESS");
    return Object.fromEntries(OPERATIONAL_FAILURE_CATEGORIES.map((category, index) => [category, results[index].count ?? 0])) as OperationalFailureSummary;
  } catch (error) {
    if (error instanceof OperationalFailureError) throw error;
    await auditOrFail("SUMMARY", "ERROR");
    throw new OperationalFailureError("LOOKUP_FAILED");
  }
}

export async function getOperationalFailureQueue(category: unknown): Promise<OperationalFailureQueueItem[]> {
  await requireOperator();
  if (!isCategory(category)) {
    await auditOrFail("INVALID_CATEGORY", "ERROR");
    throw new OperationalFailureError("INVALID_CATEGORY");
  }
  const supabase = createAdminClient();
  const staleBefore = new Date(Date.now() - PAID_REPORT_STALE_GENERATING_MS).toISOString();
  let result;
  try {
    switch (category) {
      case "PAYMENT_RECONCILIATION": result = await supabase.from("toss_payment_records").select("order_id,reconciliation_status,retry_count,next_retry_at,last_provider_error_code,updated_at").in("reconciliation_status", ["reconciliation_required", "reconciliation_failed", "terminal_mismatch"]).order("updated_at", { ascending: true }).limit(QUEUE_LIMIT); break;
      case "REFUND_RETRY": result = await supabase.from("refund_workflows").select("order_id,product_id,status,retry_count,next_retry_at,last_provider_error_code,updated_at").eq("status", "REFUND_FAILED_RETRYING").order("updated_at", { ascending: true }).limit(QUEUE_LIMIT); break;
      case "REFUND_OWNER_REVIEW": result = await supabase.from("refund_workflows").select("order_id,product_id,status,retry_count,next_retry_at,last_provider_error_code,updated_at").eq("status", "OWNER_REVIEW_REQUIRED").order("updated_at", { ascending: true }).limit(QUEUE_LIMIT); break;
      case "REPORT_FAILED": result = await supabase.from("paid_reports").select("id,product_id,analysis_edition_key,status,error_code,updated_at").eq("status", "failed").order("updated_at", { ascending: true }).limit(QUEUE_LIMIT); break;
      case "REPORT_STALE": result = await supabase.from("paid_reports").select("id,product_id,analysis_edition_key,status,updated_at").eq("status", "generating").lt("updated_at", staleBefore).order("updated_at", { ascending: true }).limit(QUEUE_LIMIT); break;
      case "CLOSURE_RETRY": result = await supabase.from("account_lifecycles").select("user_id,status,closure_retry_count,closure_next_retry_at,closure_last_error_code,updated_at").eq("status", "DELETION_REQUESTED").eq("closure_owner_review_required", false).not("closure_next_retry_at", "is", null).order("updated_at", { ascending: true }).limit(QUEUE_LIMIT); break;
      case "CLOSURE_OWNER_REVIEW": result = await supabase.from("account_lifecycles").select("user_id,status,closure_retry_count,closure_next_retry_at,closure_last_error_code,updated_at").eq("status", "DELETION_REQUESTED").eq("closure_owner_review_required", true).order("updated_at", { ascending: true }).limit(QUEUE_LIMIT); break;
    }
    if (!result || result.error) throw new Error("failure queue unavailable");
    await auditOrFail(category, "SUCCESS");
    return (result.data ?? []).map((row) => toItem(row));
  } catch (error) {
    if (error instanceof OperationalFailureError) throw error;
    await auditOrFail(category, "ERROR");
    throw new OperationalFailureError("LOOKUP_FAILED");
  }
}