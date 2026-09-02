import { randomUUID } from "node:crypto";
import { getAccountLifecycle } from "../accounts/server";
import { generatePaidAnalysisDetailV2 } from "../paidAnalysisDetailService";
import { buildPaidAnalysisInputFromProfile } from "../paidAnalysisProfileInput";
import { parseAnalysisInputSnapshot, InvalidAnalysisInputSnapshotError } from "../analysisInputSnapshot";
import { getActiveEntitlementForProfileEdition, getPurchaseById } from "../purchases/server";
import { getUserProfile } from "../profiles/server";
import type { ProfileDto } from "../profiles/types";
import {
  claimPaidReport,
  completePaidReport,
  failPaidReport,
  type PaidReportClaim,
} from "./server";

export type PaidReportGenerationInput = {
  userId: string;
  profileId: string;
  productId: string;
  purchaseId: string | null;
  analysisEditionKey: string;
};

export async function preparePaidReportGeneration(
  input: PaidReportGenerationInput,
): Promise<PaidReportClaim> {
  return claimPaidReport(input);
}

/**
 * Runs only an already-claimed exact-edition report. Financial completion does
 * not await this work; exact entitlement and account state are rechecked so a
 * refund or account closure cannot publish a report after revocation.
 */
export async function runPaidReportGeneration(
  input: PaidReportGenerationInput,
  claim: Extract<PaidReportClaim, { state: "claimed" }>,
) {
  const [account, entitlement] = await Promise.all([
    getAccountLifecycle(input.userId),
    getActiveEntitlementForProfileEdition(
      input.userId,
      input.profileId,
      input.productId,
      input.analysisEditionKey,
    ),
  ]);

  if (account?.status !== "ACTIVE" || !entitlement) {
    return { state: "skipped" as const };
  }

  const telemetryAttemptId = randomUUID();

  try {
    const [profile, purchase] = await Promise.all([
      getUserProfile(input.profileId, input.userId),
      input.purchaseId ? getPurchaseById(input.purchaseId) : null,
    ]);

    if (!profile || !purchase) {
      throw new Error("유료 분석 생성에 필요한 구매 정보를 확인하지 못했습니다.");
    }

    const referenceSnapshot = purchase.analysisReferenceSnapshot as { anchorDate?: string } | null;
    let generationProfile: ProfileDto = profile;

    if (purchase.analysisInputSnapshot) {
      generationProfile = {
        ...profile,
        ...parseAnalysisInputSnapshot(purchase.analysisInputSnapshot).birthData,
      };
    }

    const paidInput = buildPaidAnalysisInputFromProfile(
      generationProfile,
      input.productId,
      referenceSnapshot?.anchorDate,
    );
    const detail = await generatePaidAnalysisDetailV2(paidInput, {
      attemptId: telemetryAttemptId,
      reportId: claim.report.id,
      generationId: claim.report.id,
    });

    // Recheck after the expensive operation before publication.
    const entitlementBeforePublish = await getActiveEntitlementForProfileEdition(
      input.userId,
      input.profileId,
      input.productId,
      input.analysisEditionKey,
    );
    const accountBeforePublish = await getAccountLifecycle(input.userId);
    if (!entitlementBeforePublish || accountBeforePublish?.status !== "ACTIVE") {
      return { state: "skipped" as const };
    }

    const report = await completePaidReport({
      reportId: claim.report.id,
      userId: input.userId,
      profileId: input.profileId,
      productId: input.productId,
      content: detail,
    });
    return { state: "completed" as const, report };
  } catch (error) {
    if (error instanceof InvalidAnalysisInputSnapshotError) {
      await failPaidReport({
        reportId: claim.report.id,
        userId: input.userId,
        profileId: input.profileId,
        productId: input.productId,
        errorCode: "analysis_input_snapshot_invalid",
      });
      return { state: "failed" as const };
    }

    await failPaidReport({
      reportId: claim.report.id,
      userId: input.userId,
      profileId: input.profileId,
      productId: input.productId,
      errorCode: "generation_failed",
    });
    return { state: "failed" as const };
  }
}
