import { NextResponse } from "next/server";
import { OperationalFailureError, getOperationalFailureQueue, getOperationalFailureSummary } from "@/app/lib/operators/failureVisibilityServer";
import { OperatorAuthorizationError } from "@/app/lib/operators/server";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  if (error instanceof OperatorAuthorizationError) return NextResponse.json({ error: error.code === "UNAUTHENTICATED" ? "로그인이 필요합니다." : "운영자 권한이 필요합니다." }, { status: error.code === "UNAUTHENTICATED" ? 401 : 403, headers: { "Cache-Control": "no-store" } });
  if (error instanceof OperationalFailureError) return NextResponse.json({ error: error.code === "INVALID_CATEGORY" ? "유효한 운영 확인 항목이 필요합니다." : "운영 현황을 조회하지 못했습니다." }, { status: error.code === "INVALID_CATEGORY" ? 400 : error.code === "AUDIT_FAILED" ? 503 : 500, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ error: "운영 현황을 조회하지 못했습니다." }, { status: 500, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  try {
    const category = new URL(request.url).searchParams.get("category");
    return NextResponse.json(category ? { queue: await getOperationalFailureQueue(category) } : { summary: await getOperationalFailureSummary() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}