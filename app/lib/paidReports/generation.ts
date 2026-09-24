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
  COMPATIBILITY_PAIR_PAID_REPORT_VERSION,
  parseCompatibilityPaidInputSnapshot,
  type StoredCompatibilityReport,
} from "../compatibilityPaidAnalysis";
import { generateCompatibilityReport } from "../compatibilityReportService";
import {
  buildFamilyOtherCompatibility,
  buildFamilySiblingCompatibility,
} from "../familyCompatibilityExtended";
import {
  buildFamilyExtendedDirectionCard,
  FAMILY_OTHER_PAID_REPORT_VERSION,
  FAMILY_SIBLING_PAID_REPORT_VERSION,
  parseFamilyOtherPaidInputSnapshot,
  parseFamilySiblingPaidInputSnapshot,
  type StoredFamilyOtherReport,
  type StoredFamilySiblingReport,
} from "../familyCompatibilityExtendedPaidAnalysis";
import {
  generateFamilyOtherReport,
  generateFamilySiblingReport,
} from "../familyCompatibilityExtendedReportService";
import { buildFamilyParentChildCompatibility } from "../familyCompatibilityParentChild";
import {
  buildFamilyParentChildDirectionCard,
  FAMILY_PARENT_CHILD_PAID_REPORT_VERSION,
  parseFamilyParentChildPaidInputSnapshot,
  type StoredFamilyParentChildReport,
} from "../familyCompatibilityPaidAnalysis";
import { generateFamilyParentChildReport } from "../familyCompatibilityParentChildReportService";
import {
  isCompatibilityFamilyOtherProductId,
  isCompatibilityFamilyParentChildProductId,
  isCompatibilityFamilySiblingProductId,
  isCompatibilityPairProductId,
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
  if (!purchase) throw new Error("궁합 분석 생성에 필요한 구매 정보를 확인하지 못했습니다.");

  const snapshot = parseCompatibilityPaidInputSnapshot(purchase.analysisReferenceSnapshot);
  if (snapshot.productId !== input.productId) {
    throw new Error("궁합 구매 상품과 생성 상품이 일치하지 않습니다.");
  }
  const timingResult = buildCompatibilityTiming(
    snapshot.mine.person,
    snapshot.partner.person,
    {
      evaluationYear: snapshot.evaluationYear,
      A: snapshot.mine.timing,
      B: snapshot.partner.timing,
    },
  );
  const generated = await generateCompatibilityReport(timingResult, snapshot.relationshipType, snapshot.workplaceRelation);
  const perspectives = buildCompatibilityPairPerspectives(timingResult);

  if (!(await canPublish(input))) return { state: "skipped" as const };

  const content: StoredCompatibilityReport = {
    schemaVersion: COMPATIBILITY_PAIR_PAID_REPORT_VERSION,
    report: generated.report,
    perspectives,
    meta: {
      evaluationYear: snapshot.evaluationYear,
      myProfileLabel: snapshot.myProfileLabel,
      partnerLabel: snapshot.partnerLabel,
      partnerBirthTimeKnown: snapshot.partnerBirthTimeKnown,
      productId: snapshot.productId,
      relationshipType: snapshot.relationshipType,
      ...(snapshot.workplaceRelation ? { workplaceRelation: snapshot.workplaceRelation } : {}),
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
  if (!purchase) throw new Error("부모·자녀 궁합 생성에 필요한 구매 정보를 확인하지 못했습니다.");

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

  if (!(await canPublish(input))) return { state: "skipped" as const };

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

async function runFamilySiblingPaidReportGeneration(
  input: PaidReportGenerationInput,
  claim: Extract<PaidReportClaim, { state: "claimed" }>,
) {
  const purchase = input.purchaseId ? await getPurchaseById(input.purchaseId) : null;
  if (!purchase) throw new Error("형제·자매 궁합 생성에 필요한 구매 정보를 확인하지 못했습니다.");

  const snapshot = parseFamilySiblingPaidInputSnapshot(purchase.analysisReferenceSnapshot);
  const timingResult = buildCompatibilityTiming(
    snapshot.mine.person,
    snapshot.familyMember.person,
    {
      evaluationYear: snapshot.evaluationYear,
      A: snapshot.mine.timing,
      B: snapshot.familyMember.timing,
    },
  );
  const familyResult = buildFamilySiblingCompatibility(timingResult);
  const generated = await generateFamilySiblingReport(familyResult, {
    userLabel: snapshot.myProfileLabel,
    siblingLabel: snapshot.familyMemberLabel,
  });

  if (!(await canPublish(input))) return { state: "skipped" as const };

  const content: StoredFamilySiblingReport = {
    schemaVersion: FAMILY_SIBLING_PAID_REPORT_VERSION,
    report: generated.report,
    directions: {
      userToSibling: buildFamilyExtendedDirectionCard(
        familyResult.directions.userToSibling,
        snapshot.myProfileLabel,
        snapshot.familyMemberLabel,
      ),
      siblingToUser: buildFamilyExtendedDirectionCard(
        familyResult.directions.siblingToUser,
        snapshot.familyMemberLabel,
        snapshot.myProfileLabel,
      ),
    },
    meta: {
      evaluationYear: snapshot.evaluationYear,
      myProfileLabel: snapshot.myProfileLabel,
      familyMemberLabel: snapshot.familyMemberLabel,
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

async function runFamilyOtherPaidReportGeneration(
  input: PaidReportGenerationInput,
  claim: Extract<PaidReportClaim, { state: "claimed" }>,
) {
  const purchase = input.purchaseId ? await getPurchaseById(input.purchaseId) : null;
  if (!purchase) throw new Error("기타 가족 궁합 생성에 필요한 구매 정보를 확인하지 못했습니다.");

  const snapshot = parseFamilyOtherPaidInputSnapshot(purchase.analysisReferenceSnapshot);
  const timingResult = buildCompatibilityTiming(
    snapshot.mine.person,
    snapshot.familyMember.person,
    {
      evaluationYear: snapshot.evaluationYear,
      A: snapshot.mine.timing,
      B: snapshot.familyMember.timing,
    },
  );
  const familyResult = buildFamilyOtherCompatibility(
    timingResult,
    snapshot.relationshipKind,
    { user: snapshot.userRole, familyMember: snapshot.familyMemberRole },
  );
  const generated = await generateFamilyOtherReport(familyResult, {
    userLabel: snapshot.myProfileLabel,
    familyLabel: snapshot.familyMemberLabel,
  });

  if (!(await canPublish(input))) return { state: "skipped" as const };

  const content: StoredFamilyOtherReport = {
    schemaVersion: FAMILY_OTHER_PAID_REPORT_VERSION,
    report: generated.report,
    directions: {
      userToFamily: buildFamilyExtendedDirectionCard(
        familyResult.directions.userToFamily,
        snapshot.myProfileLabel,
        snapshot.familyMemberLabel,
      ),
      familyToUser: buildFamilyExtendedDirectionCard(
        familyResult.directions.familyToUser,
        snapshot.familyMemberLabel,
        snapshot.myProfileLabel,
      ),
    },
    meta: {
      evaluationYear: snapshot.evaluationYear,
      myProfileLabel: snapshot.myProfileLabel,
      familyMemberLabel: snapshot.familyMemberLabel,
      familyMemberBirthTimeKnown: snapshot.familyMemberBirthTimeKnown,
      relationshipKind: snapshot.relationshipKind,
      userRole: snapshot.userRole,
      familyMemberRole: snapshot.familyMemberRole,
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

async function failCompatibilityReport(
  input: PaidReportGenerationInput,
  claim: Extract<PaidReportClaim, { state: "claimed" }>,
  errorCode: string,
) {
  await failPaidReport({
    reportId: claim.report.id,
    userId: input.userId,
    profileId: input.profileId,
    productId: input.productId,
    errorCode,
  });
  return { state: "failed" as const };
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
  if (!(await canPublish(input))) return { state: "skipped" as const };

  if (isCompatibilityPairProductId(input.productId)) {
    try {
      return await runCompatibilityPaidReportGeneration(input, claim);
    } catch {
      return failCompatibilityReport(input, claim, "compatibility_generation_failed");
    }
  }

  if (isCompatibilityFamilyParentChildProductId(input.productId)) {
    try {
      return await runFamilyParentChildPaidReportGeneration(input, claim);
    } catch {
      return failCompatibilityReport(input, claim, "family_parent_child_generation_failed");
    }
  }

  if (isCompatibilityFamilySiblingProductId(input.productId)) {
    try {
      return await runFamilySiblingPaidReportGeneration(input, claim);
    } catch {
      return failCompatibilityReport(input, claim, "family_sibling_generation_failed");
    }
  }

  if (isCompatibilityFamilyOtherProductId(input.productId)) {
    try {
      return await runFamilyOtherPaidReportGeneration(input, claim);
    } catch {
      return failCompatibilityReport(input, claim, "family_other_generation_failed");
    }
  }

  const telemetryAttemptId = randomUUID();

  try {
    const [profile, purchase] = await Promise.all([
      getUserProfile(input.profileId, input.userId),
      input.purchaseId ? getPurchaseById(input.purchaseId) : null,
    ]);

    if (!profile || !purchase) throw new Error("유료 분석 생성에 필요한 구매 정보를 확인하지 못했습니다.");

    const referenceSnapshot = purchase.analysisReferenceSnapshot as { anchorDate?: string } | null;
    let generationProfile: ProfileDto = profile;

    if (purchase.analysisInputSnapshot) {
      generationProfile = {
        ...profile,
        ...parseAnalysisInputSnapshot(purchase.analysisInputSnapshot).birthData,
        birthTimeKnown: parseAnalysisInputSnapshot(purchase.analysisInputSnapshot).birthData.birthTimeKnown ?? null,
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

    if (!(await canPublish(input))) return { state: "skipped" as const };

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
