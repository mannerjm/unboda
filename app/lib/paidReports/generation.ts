import { randomUUID } from "node:crypto";
import { getAccountLifecycle } from "../accounts/server";
import { generatePaidAnalysisDetailV2 } from "../paidAnalysisDetailService";
import { buildPaidAnalysisInputFromProfile } from "../paidAnalysisProfileInput";
import { parseAnalysisInputSnapshot, InvalidAnalysisInputSnapshotError } from "../analysisInputSnapshot";
import { getActiveEntitlementForProfileEdition, getPurchaseById } from "../purchases/server";
import { getUserProfile } from "../profiles/server";
import type { ProfileDto } from "../profiles/types";
import { buildCompatibilityTiming } from "../compatibilityTiming";
import { buildCompatibilityPairPerspectives } from "../compatibilityPairPerspective";
import {
  COMPATIBILITY_PAID_REPORT_VERSION,
  parseCompatibilityPaidInputSnapshot,
  type StoredCompatibilityReport,
} from "../compatibilityPaidAnalysis";
import { generateCompatibilityReport } from "../compatibilityReportService";
import { buildFamilyParentChildCompatibility } from "../familyCompatibilityParentChild";
import {
  buildFamilyParentChildDirectionCard,
  FAMILY_PARENT_CHILD_PAID_REPORT_VERSION,
  parseFamilyParentChildPaidInputSnapshot,
  type StoredFamilyParentChildReport,
} from "../familyCompatibilityPaidAnalysis";
import { generateFamilyParentChildReport } from "../familyCompatibilityParentChildReportService";
import {
  isCompatibilityFamilyParentChildProductId,
  isCompatibilityRomanticProductId,
} from "../specialAnalysisProducts";
import type { StoredPaidAnalysisDetail } from "../paidAnalysisDetailOutput";
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

async function canPublish(input: PaidReportGenerationInput): Promise<boolean> {
  const [account, entitlement] = await Promise.all([
    getAccountLifecycle(input.userId),
    getActiveEntitlementForProfileEdition(
      input.userId,
      input.profileId,
      input.productId,
      input.analysisEditionKey,
    ),
  ]);
  return account?.status === "ACTIVE" && Boolean(entitlement);
}

async function runCompatibilityPaidReportGeneration(
  input: PaidReportGenerationInput,
  claim: Extract<PaidReportClaim, { state: "claimed" }>,
) {
  const purchase = input.purchaseId ? await getPurchaseById(input.purchaseId) : null;
  if (!purchase) {
    throw new Error("궁합 분석 생성에 필요한 구매 정보를 확인하지 못했습니다.");
  }

  const snapshot = parseCompatibilityPaidInputSnapshot(purchase.analysisReferenceSnapshot);
  const timingResult = buildCompatibilityTiming(
    snapshot.mine.person,
    snapshot.partner.person,
    {
      evaluationYear: snapshot.evaluationYear,
      A: snapshot.mine.timing,
      B: snapshot.partner.timing,
    },
  );
  const generated = await generateCompatibilityReport(timingResult);
  const perspectives = buildCompatibilityPairPerspectives(timingResult);

  if (!(await canPublish(input))) {
    return { state: "skipped" as const };
  }

  const content: StoredCompatibilityReport = {
    schemaVersion: COMPATIBILITY_PAID_REPORT_VERSION,
    report: generated.report,
    perspectives,
    meta: {
      evaluationYear: snapshot.evaluationYear,
      myProfileLabel: snapshot.myProfileLabel,
      partnerLabel: snapshot.partnerLabel,
      partnerBirthTimeKnown: snapshot.partnerBirthTimeKnown,
      natalDataQuality: generated.context.natalDataQuality,
      timingDataQuality: generated.context.timingDataQuality,
    },
  };

  const report = await completePaidReport({
    reportId: claim.report.id,
    userId: input.userId,
    profileId: input.profileId,
    productId: input.productId,
    content: content as unknown as StoredPaidAnalysisDetail,
  });
  return { state: "completed" as const, report };
}

async function runFamilyParentChildPaidReportGeneration(
  input: PaidReportGenerationInput,
  claim: Extract<PaidReportClaim, { state: "claimed" }>,
) {
  const purchase = input.purchaseId ? await getPurchaseById(input.purchaseId) : null;
  if (!purchase) {
    throw new Error("부모·자녀 궁합 생성에 필요한 구매 정보를 확인하지 못했습니다.");
  }

  const snapshot = parseFamilyParentChildPaidInputSnapshot(purchase.analysisReferenceSnapshot);
  const timingResult = buildCompatibilityTiming(
    snapshot.mine.person,
    snapshot.familyMember.person,
    {
      evaluationYear: snapshot.evaluationYear,
      A: snapshot.mine.timing,
      B: snapshot.familyMember.timing,
    },
  );
  const familyResult = buildFamilyParentChildCompatibility(timingResult, snapshot.userRole);
  const parentLabel = snapshot.userRole === "parent" ? snapshot.myProfileLabel : snapshot.familyMemberLabel;
  const childLabel = snapshot.userRole === "child" ? snapshot.myProfileLabel : snapshot.familyMemberLabel;
  const generated = await generateFamilyParentChildReport(familyResult, { parentLabel, childLabel });

  if (!(await canPublish(input))) {
    return { state: "skipped" as const };
  }

  const content: StoredFamilyParentChildReport = {
    schemaVersion: FAMILY_PARENT_CHILD_PAID_REPORT_VERSION,
    report: generated.report,
    directions: {
      parentToChild: buildFamilyParentChildDirectionCard(familyResult.directions.parentToChild, parentLabel, childLabel),
      childToParent: buildFamilyParentChildDirectionCard(familyResult.directions.childToParent, childLabel, parentLabel),
    },
    meta: {
      evaluationYear: snapshot.evaluationYear,
      myProfileLabel: snapshot.myProfileLabel,
      familyMemberLabel: snapshot.familyMemberLabel,
      userRole: snapshot.userRole,
      familyMemberRole: snapshot.familyMemberRole,
      familyMemberBirthTimeKnown: snapshot.familyMemberBirthTimeKnown,
    },
  };

  const report = await completePaidReport({
    reportId: claim.report.id,
    userId: input.userId,
    profileId: input.profileId,
    productId: input.productId,
    content: content as unknown as StoredPaidAnalysisDetail,
  });
  return { state: "completed" as const, report };
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
  if (!(await canPublish(input))) {
    return { state: "skipped" as const };
  }

  if (isCompatibilityRomanticProductId(input.productId)) {
    try {
      return await runCompatibilityPaidReportGeneration(input, claim);
    } catch {
      await failPaidReport({
        reportId: claim.report.id,
        userId: input.userId,
        profileId: input.profileId,
        productId: input.productId,
        errorCode: "compatibility_generation_failed",
      });
      return { state: "failed" as const };
    }
  }

  if (isCompatibilityFamilyParentChildProductId(input.productId)) {
    try {
      return await runFamilyParentChildPaidReportGeneration(input, claim);
    } catch {
      await failPaidReport({
        reportId: claim.report.id,
        userId: input.userId,
        profileId: input.profileId,
        productId: input.productId,
        errorCode: "family_parent_child_generation_failed",
      });
      return { state: "failed" as const };
    }
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

    if (!(await canPublish(input))) {
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
