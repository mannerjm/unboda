import { NextResponse } from "next/server";
import { generateCalibrationProduct } from "@/app/lib/paidAnalysisV4CalibrationHarness";

export const dynamic = "force-dynamic";

const SMOKE_PRODUCT_ID = "career-job-change";
const CONFIRM_VALUE = "run-one-v4-smoke";

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("confirm") !== CONFIRM_VALUE) {
    return NextResponse.json(
      { error: "Explicit smoke confirmation is required." },
      { status: 400 },
    );
  }

  const artifact = await generateCalibrationProduct(SMOKE_PRODUCT_ID);
  return NextResponse.json(artifact, {
    status: artifact.status === "completed" ? 200 : 500,
    headers: { "Cache-Control": "no-store" },
  });
}
