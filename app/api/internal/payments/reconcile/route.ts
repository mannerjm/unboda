import { NextResponse } from "next/server";
import { reconcilePaymentsBatch } from "@/app/lib/purchases/server";

export const dynamic = "force-dynamic";

async function reconcile(request: Request) {
  const expectedSecret = process.env.PAYMENT_RECONCILIATION_SECRET;
  const suppliedSecret = request.headers.get("x-reconciliation-secret");
  const cronSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expectedSecret || (suppliedSecret !== expectedSecret && cronSecret !== expectedSecret)) {
    return NextResponse.json(
      { error: "인증되지 않은 요청입니다." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const summary = await reconcilePaymentsBatch();
    return NextResponse.json(summary, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "결제 reconciliation을 실행하지 못했습니다." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET(request: Request) {
  return reconcile(request);
}

export async function POST(request: Request) {
  return reconcile(request);
}