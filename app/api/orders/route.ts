import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { PaidPurchaseEligibilityError } from "@/app/lib/accounts/server";
import { resolveLaunchPurchasableProduct } from "@/app/lib/purchases/products";
import {
  ActiveEditionOrderAlreadyPaidError,
  AlreadyOwnedError,
  AnalysisEditionUnavailableError,
  createPendingOrder,
} from "@/app/lib/purchases/server";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import { emitPaymentEvent } from "@/app/lib/payments/observability";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  const requestBody = body as {
    productId?: unknown;
    profileId?: unknown;
  } | null;
  const rawProductId = requestBody?.productId;
  const rawProfileId = requestBody?.profileId;
  const resolved = resolveLaunchPurchasableProduct(rawProductId);

  if (!resolved.ok) {
    return NextResponse.json(
      { error: "유효하지 않은 분석 상품입니다." },
      { status: 400 },
    );
  }

  if (!isProfileId(rawProfileId)) {
    return NextResponse.json(
      { error: "유효한 프로필을 선택해 주세요." },
      { status: 400 },
    );
  }

  let profile;

  try {
    profile = await getUserProfile(rawProfileId, user.id);
  } catch (error) {
    console.error("[orders] profile lookup failed", error);

    return NextResponse.json(
      { error: "프로필을 조회하지 못했습니다." },
      { status: 500 },
    );
  }

  if (!profile) {
    return NextResponse.json(
      { error: "프로필을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  try {
    // amount comes from the server-side pricing source, never from the client
    const order = await createPendingOrder({
      userId: user.id,
      profileId: profile.id,
      productId: resolved.productId,
      paymentProvider: "toss",
    });
    emitPaymentEvent("order_created", {
      operationalClass: "NORMAL",
      orderId: order.id,
      profileId: order.profileId,
      productId: order.productId,
    });

    return NextResponse.json({ order }, { status: 201 });
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

    if (error instanceof AlreadyOwnedError) {
      return NextResponse.json(
        { error: "현재 분석을 이미 보유하고 있습니다. 구매한 분석에서 확인해 주세요.", code: "ALREADY_OWNED" },
        { status: 409 },
      );
    }

    if (error instanceof AnalysisEditionUnavailableError) {
      return NextResponse.json(
        { error: "지금은 이 분석을 준비할 수 없습니다. 잠시 후 다시 시도해 주세요.", code: "ANALYSIS_EDITION_UNAVAILABLE" },
        { status: 409 },
      );
    }

    if (error instanceof ActiveEditionOrderAlreadyPaidError) {
      return NextResponse.json(
        { error: "동일한 분석 에디션의 결제가 이미 완료되었습니다.", code: "EDITION_ALREADY_PAID" },
        { status: 409 },
      );
    }

    console.error("[orders] create order failed", error);

    return NextResponse.json(
      { error: "주문을 생성하지 못했습니다." },
      { status: 500 },
    );
  }
}
