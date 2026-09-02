import { getUserProfile } from "./profiles/server";
import type { ProfileDto } from "./profiles/types";
import { getSaju } from "./manse";
import { buildFreeAnalysis } from "./buildFreeAnalysis";
import { getCanonicalPremiumProductId } from "./premiumProductRegistry";
import { getAnalysisEditionPolicy } from "./analysisEditionPolicy";
import { getServerAnchorDate } from "./analysisReferencePeriod";
import {
  buildAnalysisInputSnapshot,
  type AnalysisInputSnapshot,
} from "./analysisInputSnapshot";
import {
  computeAnalysisEditionKey,
  UnresolvableEditionPolicyError,
} from "./analysisEditionKey";

export type ResolveAnalysisEditionForOrderInput = {
  userId: string;
  profileId: string;
  productId: string;
  anchorDate?: string;
  /** Trusted server-fetched profile used by batched read-only callers. */
  profile?: ProfileDto;
};

export type AnalysisReferenceSnapshot = {
  anchorDate: string;
  fortune?: {
    daeunOrder?: number;
    daeunGanji?: string;
    seunGanji?: string;
  };
};

export type ResolvedAnalysisEditionForOrder = {
  editionKey: string;
  /**
   * Frozen alongside editionKey so a delayed report generation reuses the
   * exact same evaluation date/fortune instead of drifting to a later "now".
   * LIFETIME policy has no meaningful anchor and is omitted (null).
   */
  referenceSnapshot: AnalysisReferenceSnapshot | null;
  /** Immutable birth-data snapshot; report generation must consume this, never the live profile. */
  inputSnapshot: AnalysisInputSnapshot;
};

/**
 * Order-creation boundary for computeAnalysisEditionKey(): resolves the
 * profile's own fortune context server-side only when the product's policy
 * actually needs it (DAEUN), reusing the same getSaju()/buildFreeAnalysis()
 * pair paid report generation already uses instead of a second saju path.
 * Client input is never trusted for any part of this computation.
 *
 * Always fetches (ownership-checked) and freezes the profile's canonical
 * birth-data input, regardless of edition policy: a later profile edit must
 * never change what a delayed/retried report generation produces.
 */
export async function resolveAnalysisEditionForOrder(
  input: ResolveAnalysisEditionForOrderInput,
): Promise<ResolvedAnalysisEditionForOrder> {
  const canonicalProductId = getCanonicalPremiumProductId(input.productId);

  if (!canonicalProductId) {
    throw new UnresolvableEditionPolicyError(input.productId);
  }

  const policy = getAnalysisEditionPolicy(canonicalProductId);

  // Ownership-checked: only the requesting user's own profile is ever read.
  const profile = input.profile ?? await getUserProfile(input.profileId, input.userId);

  if (!profile || profile.id !== input.profileId) {
    throw new UnresolvableEditionPolicyError(canonicalProductId);
  }

  const inputSnapshot = buildAnalysisInputSnapshot(profile);

  if (policy === "LIFETIME") {
    return {
      editionKey: computeAnalysisEditionKey({ productId: canonicalProductId }),
      referenceSnapshot: null,
      inputSnapshot,
    };
  }

  const anchorDate = input.anchorDate ?? getServerAnchorDate();

  if (policy !== "DAEUN") {
    return {
      editionKey: computeAnalysisEditionKey({ productId: canonicalProductId, anchorDate }),
      referenceSnapshot: { anchorDate },
      inputSnapshot,
    };
  }

  const saju = getSaju(
    profile.birthDate,
    profile.birthTime,
    profile.calendarType,
    profile.isLeapMonth ? "윤달" : "평달",
    profile.gender,
    anchorDate,
  );
  const freeAnalysis = buildFreeAnalysis(saju);
  const fortune = {
    daeunOrder: freeAnalysis.currentDaeun?.order,
    daeunGanji: freeAnalysis.currentDaeun?.ganji,
    seunGanji: freeAnalysis.currentSeun?.ganji,
  };

  return {
    editionKey: computeAnalysisEditionKey({ productId: canonicalProductId, anchorDate, fortune }),
    referenceSnapshot: { anchorDate, fortune },
    inputSnapshot,
  };
}

