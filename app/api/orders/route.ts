import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { ensureAccountLifecycle } from "@/app/lib/accounts/server";
import { resolveLaunchPurchasableProduct } from "@/app/lib/purchases/products";
import { AlreadyOwnedError, AnalysisEditionUnavailableError, createPendingOrder } from "@/app/lib/purchases/server";
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

  const account = await ensureAccountLifecycle(user.id);
  if (account.status !== "ACTIVE") {
    return NextResponse.json({ error: "계정을 사용할 수 없습니다." }, { status: 403 });
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
    if (error instanceof AlreadyOwnedError) {
      return NextResponse.json(
        { error: "이미 보유하고 있는 분석입니다. 구매한 분석에서 확인해 주세요.", code: "ALREADY_OWNED" },
        { status: 409 },
      );
    }

    if (error instanceof AnalysisEditionUnavailableError) {
      return NextResponse.json(
        { error: "지금은 이 분석을 준비할 수 없습니다. 잠시 후 다시 시도해 주세요.", code: "ANALYSIS_EDITION_UNAVAILABLE" },
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
