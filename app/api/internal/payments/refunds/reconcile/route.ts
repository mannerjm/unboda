import { NextResponse } from "next/server";
import { reconcileRefundsBatch } from "@/app/lib/refunds/server";

export const dynamic = "force-dynamic";

async function reconcile(request: Request) {
  const expected = process.env.PAYMENT_RECONCILIATION_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expected || authorization !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(await reconcileRefundsBatch(), { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) { return reconcile(request); }
export async function POST(request: Request) { return reconcile(request); }