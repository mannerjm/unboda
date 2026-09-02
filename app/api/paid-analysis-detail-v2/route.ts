import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  generatePaidAnalysisDetailV2,
} from "@/app/lib/paidAnalysisDetailService";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { resolvePurchasableProduct } from "@/app/lib/purchases/products";
import { getActiveEntitlementForProfile, getPurchaseById } from "@/app/lib/purchases/server";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import {
  claimPaidReport,
  completePaidReport,
  failPaidReport,
} from "@/app/lib/paidReports/server";
import { buildPaidAnalysisInputFromProfile } from "@/app/lib/paidAnalysisProfileInput";
import { markPaidGenerationPersistenceFailure } from "@/app/lib/paidGenerationTelemetryServer";
import { parseAnalysisInputSnapshot, InvalidAnalysisInputSnapshotError } from "@/app/lib/analysisInputSnapshot";
import type { ProfileDto } from "@/app/lib/profiles/types";

type PaidAnalysisDetailRequest = {
  productId?: unknown;
  profileId?: unknown;
};

export async function POST(request: Request) {
  // Auth + entitlement must resolve BEFORE any OpenAI call is made.
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  let input: PaidAnalysisDetailRequest;

  try {
    input = (await request.json()) as PaidAnalysisDetailRequest;
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

  if (!isProfileId(input.profileId)) {
    return NextResponse.json(
      { error: "유효한 프로필을 선택해 주세요." },
      { status: 400 },
    );
  }

  let profile;

  try {
    profile = await getUserProfile(input.profileId, user.id);
  } catch (error) {
    console.error("[paid-analysis-detail-v2] profile lookup failed", error);

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

  let entitlement;

  try {
    entitlement = await getActiveEntitlementForProfile(
      user.id,
      profile.id,
      resolved.productId,
    );
  } catch (error) {
    console.error("[paid-analysis-detail-v2] entitlement check failed", error);

    return NextResponse.json(
      { error: "구매 권한을 확인하지 못했습니다." },
      { status: 500 },
    );
  }

  if (!entitlement) {
    return NextResponse.json(
      { error: "이 심층 분석의 구매 권한이 없습니다." },
      { status: 403 },
    );
  }

  if (!entitlement.analysisEditionKey) {
    return NextResponse.json(
      { error: "분석 에디션을 확인하지 못했습니다." },
      { status: 409 },
    );
  }

  let claim;

  try {
    claim = await claimPaidReport({
      userId: user.id,
      profileId: profile.id,
      productId: resolved.productId,
      purchaseId: entitlement.purchaseId,
      analysisEditionKey: entitlement.analysisEditionKey,
    });
  } catch (error) {
    console.error("[paid-analysis-detail-v2] report claim failed", error);

    return NextResponse.json(
      { error: "유료 분석 생성 상태를 준비하지 못했습니다." },
      { status: 500 },
    );
  }

  if (claim.state === "completed" && claim.report.content) {
    return NextResponse.json(claim.report.content);
  }

  if (claim.state === "generating") {
    return NextResponse.json(
      { status: "generating" },
      { status: 202 },
    );
  }

  const telemetryAttemptId = randomUUID();

  try {
    // Frozen at order creation; never recomputed from "now" for a delayed worker.
    const purchase = entitlement.purchaseId ? await getPurchaseById(entitlement.purchaseId) : null;
    const referenceSnapshot = purchase?.analysisReferenceSnapshot as { anchorDate?: string } | null;

    // The purchased profile's birth data must never drift from what was frozen
    // at order time, even if the profile is edited before generation completes.
    let generationProfile: ProfileDto = profile;

    if (purchase?.analysisInputSnapshot) {
      let inputSnapshot;

      try {
        inputSnapshot = parseAnalysisInputSnapshot(purchase.analysisInputSnapshot);
      } catch (error) {
        if (error instanceof InvalidAnalysisInputSnapshotError) {
          console.error("[paid-analysis-detail-v2] frozen input snapshot invalid", error);

          return NextResponse.json(
            { error: "분석 입력 정보를 확인하지 못했습니다.", code: "ANALYSIS_INPUT_SNAPSHOT_INVALID" },
            { status: 409 },
          );
        }

        throw error;
      }

      generationProfile = { ...profile, ...inputSnapshot.birthData };
    }

    const paidInput = buildPaidAnalysisInputFromProfile(generationProfile, resolved.productId, referenceSnapshot?.anchorDate);
    const detail = await generatePaidAnalysisDetailV2(paidInput, {
      attemptId: telemetryAttemptId,
      reportId: claim.report.id,
      generationId: claim.report.id,
    });
    await completePaidReport({
      reportId: claim.report.id,
      userId: user.id,
      profileId: profile.id,
      productId: resolved.productId,
      content: detail,
    });

    return NextResponse.json(detail);
  } catch (error) {
    const reportPersistenceFailure = error instanceof Error
      && error.message.includes("유료 분석 결과를 저장하지 못했습니다");

    if (reportPersistenceFailure) {
      try {
        await markPaidGenerationPersistenceFailure({
          attemptId: telemetryAttemptId,
          failureStage: "persistence",
        });
      } catch (telemetryError) {
        console.error("[paid-analysis-detail-v2] persistence telemetry update failed", telemetryError);
      }
    }

    try {
      await failPaidReport({
        reportId: claim.report.id,
        userId: user.id,
        profileId: profile.id,
        productId: resolved.productId,
        errorCode: "generation_failed",
      });
    } catch (persistenceError) {
      console.error("[paid-analysis-detail-v2] report failure persistence failed", persistenceError);
    }

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