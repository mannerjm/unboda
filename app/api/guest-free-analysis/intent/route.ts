import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCanonicalPremiumProductId, getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import {
  hashGuestAnalysisSecret,
  parseGuestAnalysisCredential,
  GUEST_ANALYSIS_COOKIE_NAME,
} from "@/app/lib/guestFreeAnalyses/cookie";
import {
  getGuestFreeAnalysis,
  isUsableGuestFreeAnalysis,
  setGuestSelectedProduct,
} from "@/app/lib/guestFreeAnalyses/server";

export async function POST(request: Request) {
  let body: { productId?: unknown };
  try { body = await request.json() as { productId?: unknown }; } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  if (typeof body.productId !== "string") {
    return NextResponse.json({ error: "유효한 상품을 선택해 주세요." }, { status: 400 });
  }

  const productId = getCanonicalPremiumProductId(body.productId);
  if (!getPremiumProduct(productId)) {
    return NextResponse.json({ error: "유효한 상품을 선택해 주세요." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const credential = parseGuestAnalysisCredential(cookieStore.get(GUEST_ANALYSIS_COOKIE_NAME)?.value);
  if (!credential) return NextResponse.json({ error: "비회원 분석 결과를 찾을 수 없습니다." }, { status: 404 });

  try {
    const record = await getGuestFreeAnalysis(credential.analysisId, hashGuestAnalysisSecret(credential.secret));
    if (!record || !isUsableGuestFreeAnalysis(record) || record.status !== "completed") {
      return NextResponse.json({ error: "비회원 분석 결과를 찾을 수 없습니다." }, { status: 404 });
    }

    await setGuestSelectedProduct(record, productId);
    return NextResponse.json({ productId });
  } catch (error) {
    console.error("[guest-free-analysis] intent failed", error);
    return NextResponse.json({ error: "비회원 선택 상품을 저장하지 못했습니다." }, { status: 500 });
  }
}