import { NextRequest, NextResponse } from "next/server";
import { moderateReview } from "@/app/lib/reviews/server";
import { OperatorAuthorizationError } from "@/app/lib/operators/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  const { reviewId } = await params;
  try {
    const body = await request.json();
    await moderateReview({
      reviewId,
      status: body.status,
      reason: body.reason,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof OperatorAuthorizationError) {
      return NextResponse.json({ error: "운영자 권한이 필요합니다." }, { status: error.code === "UNAUTHENTICATED" ? 401 : 403 });
    }
    const code = error instanceof Error ? error.message : "";
    if (code === "REVIEW_MODERATION_INVALID") {
      return NextResponse.json({ error: "검수 입력을 확인해 주세요." }, { status: 400 });
    }
    if (code === "REVIEW_NOT_FOUND") {
      return NextResponse.json({ error: "후기를 찾지 못했습니다." }, { status: 404 });
    }
    console.error("[admin-reviews] moderation failed", error);
    return NextResponse.json({ error: "후기 상태를 변경하지 못했습니다." }, { status: 500 });
  }
}
