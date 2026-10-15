import "server-only";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { preparePaidReportGeneration, runPaidReportGeneration } from "@/app/lib/paidReports/generation";

type DueReport = {
  report_id: string; user_id: string; profile_id: string; product_id: string;
  purchase_id: string; analysis_edition_key: string; attempt_count: number;
};

export type PaidReportRecoveryResult = {
  claimed: number; completed: number; failed: number; skipped: number;
};

/** At most one eligible report per run; DB lock, active entitlement and 3-attempt
 * budget guard all precede generation. No order/entitlement is ever created here.
 */
export async function recoverOnePaidReport(): Promise<PaidReportRecoveryResult> {
  const db = createAdminClient();
  const { data, error } = await db.rpc("claim_due_paid_report_recovery", { p_limit: 1 });
  if (error) throw new Error("REPORT_RECOVERY_CLAIM_FAILED");
  const rows = (data ?? []) as DueReport[];
  const summary: PaidReportRecoveryResult = { claimed: rows.length, completed: 0, failed: 0, skipped: 0 };
  for (const row of rows) {
    const input = {
      userId: row.user_id, profileId: row.profile_id, productId: row.product_id,
      purchaseId: row.purchase_id, analysisEditionKey: row.analysis_edition_key,
    };
    let outcome = "SKIPPED";
    try {
      const claim = await preparePaidReportGeneration(input);
      if (claim.state === "claimed") {
        const result = await runPaidReportGeneration(input, claim);
        outcome = result.state.toUpperCase();
      } else {
        outcome = claim.state.toUpperCase();
      }
      if (outcome === "COMPLETED") summary.completed += 1;
      else if (outcome === "FAILED") summary.failed += 1;
      else summary.skipped += 1;
    } catch {
      summary.failed += 1;
      outcome = "FAILED";
    }
    const { error: statusError } = await db.from("paid_report_recovery_attempts")
      .update({ last_outcome: outcome, updated_at: new Date().toISOString() })
      .eq("report_id", row.report_id).eq("attempt_count", row.attempt_count);
    if (statusError) throw new Error("REPORT_RECOVERY_OUTCOME_SAVE_FAILED");
  }
  return summary;
}
