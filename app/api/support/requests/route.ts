import { NextResponse } from "next/server";
import {
  createSupportRequest,
  listCurrentUserSupportRequests,
  SupportRequestError,
} from "@/app/lib/support/server";
import { dispatchSupportNotificationDeliveries } from "@/app/lib/support/notifications";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  if (error instanceof SupportRequestError) {
    const status = error.code === "UNAUTHENTICATED"
      ? 401
      : error.code === "INVALID_INPUT"
        ? 400
        : error.code === "ORDER_NOT_FOUND"
          ? 404
          : error.code === "TOO_MANY_ACTIVE"
            ? 409
            : 500;
    const message = error.code === "UNAUTHENTICATED"
      ? "로그인이 필요합니다."
      : error.code === "INVALID_INPUT"
        ? "문의 내용을 다시 확인해 주세요."
        : error.code === "ORDER_NOT_FOUND"
          ? "내 계정의 주문을 확인할 수 없습니다."
          : error.code === "TOO_MANY_ACTIVE"
            ? "진행 중인 문의가 3건입니다. 기존 문의의 답변을 확인한 뒤 다시 접수해 주세요."
            : "문의 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ error: "문의 요청을 처리하지 못했습니다." }, { status: 500, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  try {
    return NextResponse.json(
      { requests: await listCurrentUserSupportRequests() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { category?: unknown; message?: unknown; orderId?: unknown } | null;
    if (!body) throw new SupportRequestError("INVALID_INPUT");
    const created = await createSupportRequest({
      category: body.category,
      message: body.message,
      orderId: body.orderId,
    });

    try {
      const notification = await dispatchSupportNotificationDeliveries({ requestId: created.id, batchLimit: 2 });
      console.info("[support-email]", { trigger: "customer_intake", requestId: created.id, ...notification });
    } catch {
      console.error("[support-email]", { trigger: "customer_intake", requestId: created.id, status: "worker_failed" });
    }

    return NextResponse.json({ request: created }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
