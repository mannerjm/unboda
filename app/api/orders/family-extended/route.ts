import { NextResponse } from "next/server";
import { PaidPurchaseEligibilityError } from "@/app/lib/accounts/server";
import {
  buildPartnerCompatibilitySnapshot,
  buildProfileCompatibilitySnapshot,
  validateCompatibilityPartnerInput,
} from "@/app/lib/compatibilityCustomerInput";
import {
  FAMILY_OTHER_RELATIONSHIP_KINDS,
  resolveFamilyOtherRolePair,
  type FamilyOtherRelationshipKind,
  type FamilyOtherRole,
} from "@/app/lib/familyCompatibilityExtended";
import {
  buildFamilyOtherPaidInputSnapshot,
  buildFamilySiblingPaidInputSnapshot,
} from "@/app/lib/familyCompatibilityExtendedPaidAnalysis";
import {
  createFamilyOtherPendingOrder,
  createFamilySiblingPendingOrder,
} from "@/app/lib/familyCompatibilityExtendedPurchases";
import { emitPaymentEvent } from "@/app/lib/payments/observability";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import {
  ActiveEditionOrderAlreadyPaidError,
  AlreadyOwnedError,
  AnalysisEditionUnavailableError,
} from "@/app/lib/purchases/server";
import {
  isCompatibilityFamilyOtherProductId,
  isCompatibilityFamilySiblingProductId,
} from "@/app/lib/specialAnalysisProducts";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getTossConfig } from "@/app/lib/toss/config";

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

function isOtherRelationshipKind(value: unknown): value is FamilyOtherRelationshipKind {
  return typeof value === "string"
    && (FAMILY_OTHER_RELATIONSHIP_KINDS as readonly string[]).includes(value);
}

function isOtherRole(value: unknown): value is FamilyOtherRole {
  return value === "grandparent"
    || value === "grandchild"
    || value === "aunt_uncle"
    || value === "niece_nephew"
    || value === "cousin"
    || value === "in_law"
    || value === "relative";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const requestBody = body as {
    productId?: unknown;
    profileId?: unknown;
    immediateGenerationAcknowledged?: unknown;
    familyPayload?: unknown;
  } | null;

  if (requestBody?.immediateGenerationAcknowledged !== true) {
    return NextResponse.json(
      { error: "개인화 분석 생성 안내 확인이 필요합니다.", code: "IMMEDIATE_GENERATION_ACKNOWLEDGEMENT_REQUIRED" },
      { status: 400 },
    );
  }

  const productId = typeof requestBody?.productId === "string" ? requestBody.productId : null;
  const isSibling = isCompatibilityFamilySiblingProductId(productId);
  const isOther = isCompatibilityFamilyOtherProductId(productId);
  if (!isSibling && !isOther) {
    return NextResponse.json({ error: "유효하지 않은 가족 궁합 상품입니다." }, { status: 400 });
  }

  const profileId = requestBody?.profileId;
  if (!isProfileId(profileId)) {
    return NextResponse.json({ error: "유효한 프로필을 선택해 주세요." }, { status: 400 });
  }

  let profile;
  try {
    profile = await getUserProfile(profileId, user.id);
  } catch (error) {
    console.error("[family-extended-orders] profile lookup failed", error);
    return NextResponse.json({ error: "프로필을 조회하지 못했습니다." }, { status: 500 });
  }
  if (!profile) return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });

  const rawPayload = requestBody?.familyPayload;
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return NextResponse.json({ error: "가족 관계 정보를 다시 입력해 주세요.", code: "FAMILY_INPUT_REQUIRED" }, { status: 400 });
  }
  const payload = rawPayload as {
    familyMember?: unknown;
    relationshipKind?: unknown;
    userRole?: unknown;
  };

  const memberValidation = validateCompatibilityPartnerInput(payload.familyMember);
  if (!memberValidation.valid) {
    return NextResponse.json({ error: memberValidation.error, code: "FAMILY_MEMBER_REQUIRED" }, { status: 400 });
  }

  const evaluationDate = koreaDate();
  const evaluationYear = Number(evaluationDate.slice(0, 4));

  try {
    getTossConfig();
  } catch {
    return NextResponse.json(
      { error: "결제 기능이 아직 준비되지 않았습니다.", code: "PAYMENT_PROVIDER_NOT_READY" },
      { status: 503 },
    );
  }

  try {
    const mine = buildProfileCompatibilitySnapshot(profile, evaluationDate);
    const familyMember = buildPartnerCompatibilitySnapshot(memberValidation.value, evaluationDate);

    const order = isSibling
      ? await createFamilySiblingPendingOrder({
          userId: user.id,
          profile,
          snapshot: buildFamilySiblingPaidInputSnapshot({
            evaluationDate,
            evaluationYear,
            myProfileLabel: profile.label,
            familyMemberLabel: memberValidation.value.label,
            familyMemberBirthTimeKnown: memberValidation.value.birthTimeKnown,
            mine,
            familyMember,
          }),
          paymentProvider: "toss",
        })
      : await (async () => {
          if (!isOtherRelationshipKind(payload.relationshipKind) || !isOtherRole(payload.userRole)) {
            throw new FamilyInputError("기타 가족 관계와 내 역할을 다시 선택해 주세요.", "FAMILY_OTHER_RELATIONSHIP_REQUIRED");
          }
          const roles = resolveFamilyOtherRolePair(payload.relationshipKind, payload.userRole);
          if (!roles) {
            throw new FamilyInputError("선택한 가족 관계와 역할이 맞지 않습니다.", "FAMILY_OTHER_ROLE_INVALID");
          }
          return createFamilyOtherPendingOrder({
            userId: user.id,
            profile,
            snapshot: buildFamilyOtherPaidInputSnapshot({
              relationshipKind: payload.relationshipKind,
              userRole: roles.user,
              familyMemberRole: roles.familyMember,
              evaluationDate,
              evaluationYear,
              myProfileLabel: profile.label,
              familyMemberLabel: memberValidation.value.label,
              familyMemberBirthTimeKnown: memberValidation.value.birthTimeKnown,
              mine,
              familyMember,
            }),
            paymentProvider: "toss",
          });
        })();

    emitPaymentEvent("order_created", {
      operationalClass: "NORMAL",
      orderId: order.id,
      profileId: order.profileId,
      productId: order.productId,
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof FamilyInputError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
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
    const message = error instanceof Error ? error.message : "가족 궁합 계산 입력을 확인하지 못했습니다.";
    if (message.includes("출생시간") || message.includes("궁합")) {
      return NextResponse.json({ error: message, code: "FAMILY_INPUT_UNAVAILABLE" }, { status: 422 });
    }
    console.error("[family-extended-orders] create order failed", error);
    return NextResponse.json({ error: "주문을 생성하지 못했습니다." }, { status: 500 });
  }
}

class FamilyInputError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}
