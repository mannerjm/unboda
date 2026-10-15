import { NextResponse } from "next/server";
import { readJobHeartbeats, summarizeHeartbeat } from "@/app/lib/operators/heartbeat";

export const dynamic = "force-dynamic";

/** Public status contains NO emails, customer identifiers, tokens or transaction details.
 * A separate uptime monitor can detect cron, DB and email-worker failure.
 */
export async function GET() {
  try {
    const rows = await readJobHeartbeats();
    const core = summarizeHeartbeat(rows, "reconcile");
    const reports = summarizeHeartbeat(rows, "paid_report_recovery");
    const healthy = core.state === "healthy" && reports.state === "healthy";
    return NextResponse.json(
      { status: healthy ? "healthy" : "unhealthy", scheduler: core.state, reportRecovery: reports.state },
      { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ status: "unhealthy", scheduler: "unavailable", reportRecovery: "unavailable" }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
