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
import {
  getProfileFreeAnalysisFoundationStatus,
  isFreeAnalysisFoundationReady,
} from "@/app/lib/freeAnalysisEligibility";
import { isProfileId } from "@/app/lib/profiles/types";
import { emitPaymentEvent } from "@/app/lib/payments/observability";
import { getTossConfig } from "@/app/lib/toss/config";
import {
  buildPartnerCompatibilitySnapshot,
  buildProfileCompatibilitySnapshot,
  validateCompatibilityPartnerInput,
} from "@/app/lib/compatibilityCustomerInput";
import { buildCompatibilityPaidInputSnapshot } from "@/app/lib/compatibilityPaidAnalysis";
import { createCompatibilityPendingOrder } from "@/app/lib/compatibilityPurchases";
import { buildFamilyParentChildPaidInputSnapshot } from "@/app/lib/familyCompatibilityPaidAnalysis";
import { createFamilyParentChildPendingOrder } from "@/app/lib/familyCompatibilityPurchases";
import type { FamilyParentChildRole } from "@/app/lib/familyCompatibilityParentChild";
import {
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID,
  COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  isCompatibilityFamilyParentChildProductId,
  isCompatibilityRomanticProductId,
} from "@/app/lib/specialAnalysisProducts";

function koreaDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function isFamilyRole(value: unknown): value is FamilyParentChildRole {
  return value === "parent" || value === "child";
}

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
    immediateGenerationAcknowledged?: unknown;
    compatibilityPartner?: unknown;
    familyParentChild?: unknown;
  } | null;
  const rawProductId = requestBody?.productId;
  const rawProfileId = requestBody?.profileId;
  if (requestBody?.immediateGenerationAcknowledged !== true) {
    return NextResponse.json(
      { error: "개인화 분석 생성 안내 확인이 필요합니다.", code: "IMMEDIATE_GENERATION_ACKNOWLEDGEMENT_REQUIRED" },
      { status: 400 },
    );
  }
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

  const freeAnalysisStatus = await getProfileFreeAnalysisFoundationStatus(user.id, profile);
  if (!isFreeAnalysisFoundationReady(freeAnalysisStatus)) {
    return NextResponse.json(
      {
        error: "유료 분석을 결제하기 전에 현재 프로필의 무료 사주를 먼저 확인해 주세요.",
        code: "FREE_ANALYSIS_REQUIRED",
        freeAnalysisStatus,
      },
      { status: 409 },
    );
  }

  let compatibilitySnapshot: ReturnType<typeof buildCompatibilityPaidInputSnapshot> | null = null;
  if (isCompatibilityRomanticProductId(resolved.productId)) {
    const validation = validateCompatibilityPartnerInput(requestBody?.compatibilityPartner);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error, code: "COMPATIBILITY_PARTNER_REQUIRED" }, { status: 400 });
    }

    const evaluationDate = koreaDate();
    const evaluationYear = Number(evaluationDate.slice(0, 4));
    try {
      const mine = buildProfileCompatibilitySnapshot(profile, evaluationDate);
      const partner = buildPartnerCompatibilitySnapshot(validation.value, evaluationDate);
      compatibilitySnapshot = buildCompatibilityPaidInputSnapshot({
        evaluationDate,
        evaluationYear,
        myProfileLabel: profile.label,
        partnerLabel: validation.value.label,
        partnerBirthTimeKnown: validation.value.birthTimeKnown,
        mine,
        partner,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "궁합 계산 입력을 확인하지 못했습니다.";
      return NextResponse.json({ error: message, code: "COMPATIBILITY_INPUT_UNAVAILABLE" }, { status: 422 });
    }
  }

  let familyParentChildSnapshot: ReturnType<typeof buildFamilyParentChildPaidInputSnapshot> | null = null;
  if (isCompatibilityFamilyParentChildProductId(resolved.productId)) {
    const rawFamily = requestBody?.familyParentChild;
    if (!rawFamily || typeof rawFamily !== "object" || Array.isArray(rawFamily)) {
      return NextResponse.json({ error: "부모·자녀 관계 정보를 다시 입력해 주세요.", code: "FAMILY_PARENT_CHILD_INPUT_REQUIRED" }, { status: 400 });
    }
    const row = rawFamily as { userRole?: unknown; familyMember?: unknown };
    if (!isFamilyRole(row.userRole)) {
      return NextResponse.json({ error: "이 관계에서 내가 부모인지 자녀인지 선택해 주세요.", code: "FAMILY_PARENT_CHILD_ROLE_REQUIRED" }, { status: 400 });
    }
    const validation = validateCompatibilityPartnerInput(row.familyMember);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error, code: "FAMILY_PARENT_CHILD_MEMBER_REQUIRED" }, { status: 400 });
    }

    const evaluationDate = koreaDate();
    const evaluationYear = Number(evaluationDate.slice(0, 4));
    try {
      const mine = buildProfileCompatibilitySnapshot(profile, evaluationDate);
      const familyMember = buildPartnerCompatibilitySnapshot(validation.value, evaluationDate);
      familyParentChildSnapshot = buildFamilyParentChildPaidInputSnapshot({
        evaluationDate,
        evaluationYear,
        myProfileLabel: profile.label,
        familyMemberLabel: validation.value.label,
        userRole: row.userRole,
        familyMemberBirthTimeKnown: validation.value.birthTimeKnown,
        mine,
        familyMember,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "부모·자녀 궁합 계산 입력을 확인하지 못했습니다.";
      return NextResponse.json({ error: message, code: "FAMILY_PARENT_CHILD_INPUT_UNAVAILABLE" }, { status: 422 });
    }
  }

  try {
    getTossConfig();
  } catch {
    return NextResponse.json(
      { error: "결제 기능이 아직 준비되지 않았습니다.", code: "PAYMENT_PROVIDER_NOT_READY" },
      { status: 503 },
    );
  }

  try {
    // amount comes from the server-side pricing source, never from the client
    const order = resolved.productId === COMPATIBILITY_ROMANTIC_PRODUCT_ID && compatibilitySnapshot
      ? await createCompatibilityPendingOrder({
          userId: user.id,
          profile,
          snapshot: compatibilitySnapshot,
          paymentProvider: "toss",
        })
      : resolved.productId === COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID && familyParentChildSnapshot
        ? await createFamilyParentChildPendingOrder({
            userId: user.id,
            profile,
            snapshot: familyParentChildSnapshot,
            paymentProvider: "toss",
          })
        : await createPendingOrder({
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
