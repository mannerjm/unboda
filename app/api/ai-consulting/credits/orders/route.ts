import { NextResponse } from "next/server";
import { PaidPurchaseEligibilityError } from "@/app/lib/accounts/server";
import {
  createPendingAiConsultingCreditOrder,
  isAiConsultingCreditCheckoutEnabled,
} from "@/app/lib/aiConsulting/creditCheckout";
import {
  getAiConsultingCreditBundle,
  type AiConsultingCreditBundleId,
} from "@/app/lib/aiConsulting/commercialPolicy";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getTossConfig } from "@/app/lib/toss/config";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!isAiConsultingCreditCheckoutEnabled()) {
    return NextResponse.json(
      { error: "AI 질문권 결제는 아직 준비 중입니다.", code: "AI_CREDIT_CHECKOUT_DISABLED" },
      { status: 503 },
    );
  }

  try {
    getTossConfig();
  } catch {
    return NextResponse.json(
      { error: "결제 기능이 아직 준비되지 않았습니다.", code: "PAYMENT_PROVIDER_NOT_READY" },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null) as {
    profileId?: unknown;
    bundleId?: unknown;
    productId?: unknown;
    edition?: unknown;
  } | null;

  const profileId = body?.profileId;
  const bundleId = typeof body?.bundleId === "string" ? body.bundleId.trim() : "";
  const productId = typeof body?.productId === "string" ? body.productId.trim() : "";
  const edition = typeof body?.edition === "string" ? body.edition.trim() : "";
  const bundle = getAiConsultingCreditBundle(bundleId);

  if (!isProfileId(profileId)) {
    return NextResponse.json({ error: "유효한 프로필을 선택해 주세요." }, { status: 400 });
  }
  if (!bundle || !productId || !edition) {
    return NextResponse.json({ error: "AI 질문권 구매 정보가 올바르지 않습니다." }, { status: 400 });
  }

  const profile = await getUserProfile(profileId, user.id).catch(() => null);
  if (!profile) {
    return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const order = await createPendingAiConsultingCreditOrder({
      userId: user.id,
      profileId: profile.id,
      bundleId: bundle.id as AiConsultingCreditBundleId,
      productId,
      analysisEditionKey: edition,
    });

    return NextResponse.json(
      {
        order,
        bundle: {
          id: bundle.id,
          questions: bundle.questions,
          priceKrw: bundle.priceKrw,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PaidPurchaseEligibilityError) {
      const messages = {
        AUTHENTICATION_REQUIRED: "로그인이 필요합니다.",
        ACCOUNT_NOT_ACTIVE: "현재 계정에서는 결제를 진행할 수 없습니다.",
        ACCOUNT_DELETED: "현재 계정에서는 결제를 진행할 수 없습니다.",
        EMAIL_NOT_VERIFIED: "이메일 인증이 필요합니다.",
        PAID_ELIGIBILITY_UNVERIFIED: "결제 전에 성인 인증을 완료해 주세요.",
        PAID_ELIGIBILITY_REVOKED: "현재 성인 인증 상태로는 결제를 진행할 수 없습니다.",
        UNKNOWN_ERROR: "계정 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      } as const;
      const status = error.reason === "AUTHENTICATION_REQUIRED" ? 401 : 403;
      return NextResponse.json({ error: messages[error.reason], code: error.reason }, { status });
    }

    const message = error instanceof Error ? error.message : "AI_CONSULTING_CREDIT_ORDER_FAILED";
    if (message.includes("BASE_ENTITLEMENT_REQUIRED")) {
      return NextResponse.json(
        { error: "구매한 심층 분석에서만 AI 질문권을 구매할 수 있습니다." },
        { status: 403 },
      );
    }
    if (message.includes("PAID_REPORT_UNAVAILABLE")) {
      return NextResponse.json(
        { error: "심층 분석이 완성된 뒤 AI 질문권을 구매할 수 있습니다." },
        { status: 409 },
      );
    }

    console.error("[ai-consulting-credit-orders] create failed", error);
    return NextResponse.json({ error: "AI 질문권 주문을 생성하지 못했습니다." }, { status: 500 });
  }
}
