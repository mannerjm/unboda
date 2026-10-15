import { NextResponse } from "next/server";
import { isAuthorizedSchedulerRequest } from "@/app/lib/internal/schedulerAuth";
import { recordJobHeartbeat } from "@/app/lib/operators/heartbeat";
import { recoverOnePaidReport } from "@/app/lib/operators/paidReportRecovery";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isAuthorizedSchedulerRequest(request)) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }
  try {
    const result = await recoverOnePaidReport();
    await recordJobHeartbeat("paid_report_recovery", true);
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    try {
      await recordJobHeartbeat("paid_report_recovery", false, "REPORT_RECOVERY_WORKER_FAILED");
    } catch { /* Health route will turn stale when DB unavailable. */ }
    return NextResponse.json({ ok: false, error: "REPORT_RECOVERY_WORKER_FAILED" }, { status: 500 });
  }
}
