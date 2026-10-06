import { NextRequest, NextResponse } from "next/server";
import {
  deleteVerifiedReview,
  getPublicProductReviewSummary,
  getVerifiedReviewContext,
  isReviewableProduct,
  saveVerifiedReview,
} from "@/app/lib/reviews/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId");
  if (!isReviewableProduct(productId)) {
    return NextResponse.json({ error: "상품을 확인해 주세요." }, { status: 400 });
  }

  try {
    const summary = await getPublicProductReviewSummary(productId);
    const profileId = request.nextUrl.searchParams.get("profileId");
    const edition = request.nextUrl.searchParams.get("edition");
    const user = profileId && edition ? await getCurrentUser() : null;
    const context = user && profileId && edition
      ? await getVerifiedReviewContext({
          userId: user.id,
          profileId,
          productId,
          analysisEditionKey: edition,
        })
      : null;

    return NextResponse.json(
      { summary, context },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("[reviews] GET failed", error);
    return NextResponse.json({ error: "후기를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const body = await request.json();
    const review = await saveVerifiedReview({
      userId: user.id,
      profileId: body.profileId,
      productId: body.productId,
      analysisEditionKey: body.edition,
      rating: body.rating,
      easyToUnderstand: body.easyToUnderstand,
      helpfulness: body.helpfulness,
      aiConsultingHelpfulness: body.aiConsultingHelpfulness,
      body: body.body,
    });
    return NextResponse.json({ review });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "REVIEW_NOT_ELIGIBLE") {
      return NextResponse.json({ error: "완료된 구매 리포트를 확인한 뒤 후기를 남길 수 있습니다." }, { status: 403 });
    }
    if (code === "REVIEW_INPUT_INVALID") {
      return NextResponse.json({ error: "후기 내용을 다시 확인해 주세요." }, { status: 400 });
    }
    console.error("[reviews] POST failed", error);
    return NextResponse.json({ error: "후기를 저장하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const body = await request.json();
    await deleteVerifiedReview({
      userId: user.id,
      profileId: body.profileId,
      productId: body.productId,
      analysisEditionKey: body.edition,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "REVIEW_INPUT_INVALID") {
      return NextResponse.json({ error: "후기 정보를 다시 확인해 주세요." }, { status: 400 });
    }
    console.error("[reviews] DELETE failed", error);
    return NextResponse.json({ error: "후기를 삭제하지 못했습니다." }, { status: 500 });
  }
}
