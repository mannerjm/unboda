import { NextResponse } from "next/server";
import { OperatorAuthorizationError } from "@/app/lib/operators/server";
import {
  listSupportRequestsForOperator,
  OperatorSupportError,
} from "@/app/lib/support/operatorServer";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  if (error instanceof OperatorAuthorizationError) {
    const status = error.code === "UNAUTHENTICATED" ? 401 : 403;
    return NextResponse.json({ error: status === 401 ? "로그인이 필요합니다." : "운영자 권한이 필요합니다." }, { status, headers: { "Cache-Control": "no-store" } });
  }
  if (error instanceof OperatorSupportError) {
    const status = error.code === "INVALID_INPUT" ? 400 : error.code === "AUDIT_FAILED" ? 503 : 500;
    return NextResponse.json({ error: error.code === "INVALID_INPUT" ? "유효한 문의 상태가 필요합니다." : "고객지원 요청을 조회하지 못했습니다." }, { status, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ error: "고객지원 요청을 조회하지 못했습니다." }, { status: 500, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  try {
    const status = new URL(request.url).searchParams.get("status");
    const requests = await listSupportRequestsForOperator(status);
    return NextResponse.json({ requests }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}