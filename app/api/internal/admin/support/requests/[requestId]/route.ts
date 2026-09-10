import { NextResponse } from "next/server";
import { OperatorAuthorizationError } from "@/app/lib/operators/server";
import {
  OperatorSupportError,
  updateSupportRequestForOperator,
} from "@/app/lib/support/operatorServer";
import { dispatchSupportNotificationDeliveries } from "@/app/lib/support/notifications";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  if (error instanceof OperatorAuthorizationError) {
    const status = error.code === "UNAUTHENTICATED" ? 401 : 403;
    return NextResponse.json({ error: status === 401 ? "로그인이 필요합니다." : "운영자 권한이 필요합니다." }, { status, headers: { "Cache-Control": "no-store" } });
  }
  if (error instanceof OperatorSupportError) {
    const status = error.code === "INVALID_INPUT" ? 400 : error.code === "NOT_FOUND" ? 404 : 500;
    const message = error.code === "INVALID_INPUT"
      ? "문의 상태와 답변을 다시 확인해 주세요."
      : error.code === "NOT_FOUND"
        ? "문의 요청을 찾을 수 없습니다."
        : "문의 요청을 업데이트하지 못했습니다.";
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ error: "문의 요청을 업데이트하지 못했습니다." }, { status: 500, headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request, context: { params: Promise<{ requestId: string }> }) {
  try {
    const { requestId } = await context.params;
    const body = await request.json().catch(() => null) as { status?: unknown; response?: unknown } | null;
    if (!body) throw new OperatorSupportError("INVALID_INPUT");
    const updated = await updateSupportRequestForOperator({
      requestId,
      status: body.status,
      response: body.response,
    });

    try {
      const notification = await dispatchSupportNotificationDeliveries({ requestId, batchLimit: 3 });
      console.info("[support-email]", { trigger: "operator_reply", requestId, ...notification });
    } catch {
      console.error("[support-email]", { trigger: "operator_reply", requestId, status: "worker_failed" });
    }

    return NextResponse.json({ request: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
