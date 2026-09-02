import { NextResponse } from "next/server";
import { CsLookupError, lookupCustomerByExactEmail } from "@/app/lib/operators/csLookupServer";
import { OperatorAuthorizationError } from "@/app/lib/operators/server";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  if (error instanceof OperatorAuthorizationError) {
    return NextResponse.json({ error: error.code === "UNAUTHENTICATED" ? "로그인이 필요합니다." : "운영자 권한이 필요합니다." }, { status: error.code === "UNAUTHENTICATED" ? 401 : 403, headers: { "Cache-Control": "no-store" } });
  }
  if (error instanceof CsLookupError) {
    const status = error.code === "INVALID_INPUT" ? 400 : error.code === "NOT_FOUND" ? 404 : error.code === "AUDIT_FAILED" ? 503 : 500;
    const message = error.code === "INVALID_INPUT" ? "정확한 이메일 주소를 입력해 주세요." : error.code === "NOT_FOUND" ? "일치하는 고객을 찾을 수 없습니다." : "고객 조회를 완료하지 못했습니다.";
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ error: "고객 조회를 완료하지 못했습니다." }, { status: 500, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const customer = await lookupCustomerByExactEmail({ email: url.searchParams.get("email"), reason: url.searchParams.get("reason") ?? undefined });
    return NextResponse.json({ customer }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}