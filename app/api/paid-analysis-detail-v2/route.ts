import { NextResponse } from "next/server";
import {
  generatePaidAnalysisDetailV2,
} from "@/app/lib/paidAnalysisDetailService";
import type {
  PaidAnalysisDetailPromptInput,
} from "@/app/lib/paidAnalysisDetailPrompt";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { resolvePurchasableProduct } from "@/app/lib/purchases/products";
import { hasActiveEntitlement } from "@/app/lib/purchases/server";

export async function POST(request: Request) {
  // Auth + entitlement must resolve BEFORE any OpenAI call is made.
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  let input: PaidAnalysisDetailPromptInput;

  try {
    input = (await request.json()) as PaidAnalysisDetailPromptInput;
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  const resolved = resolvePurchasableProduct(input.productId);

  if (!resolved.ok) {
    return NextResponse.json(
      { error: "유효하지 않은 분석 상품입니다." },
      { status: 400 },
    );
  }

  let entitled = false;

  try {
    entitled = await hasActiveEntitlement(user.id, resolved.productId);
  } catch (error) {
    console.error("[paid-analysis-detail-v2] entitlement check failed", error);

    return NextResponse.json(
      { error: "구매 권한을 확인하지 못했습니다." },
      { status: 500 },
    );
  }

  if (!entitled) {
    return NextResponse.json(
      { error: "이 심층 분석의 구매 권한이 없습니다." },
      { status: 403 },
    );
  }

  try {
    const detail = await generatePaidAnalysisDetailV2({
      ...input,
      productId: resolved.productId,
    });

    return NextResponse.json(detail);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "심층 분석 생성 중 알 수 없는 오류가 발생했습니다.";

    console.error("[paid-analysis-detail-v2] route error", error);

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}