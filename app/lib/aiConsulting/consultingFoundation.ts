import { assertPaidPurchaseEligibility, PaidPurchaseEligibilityError } from "../accounts/server";
import { getActiveProfile } from "../profiles/activeServer";
import { getUserProfile } from "../profiles/server";
import { getFreeAnalysisResult, getProfileFingerprint, type FreeAnalysisResultRecord } from "../freeAnalysisResults/server";
import { buildSajuResponse } from "../buildSajuResponse";
import { getSaju } from "../manse";
import type { ProfileDto } from "../profiles/types";

/** Missing/stale/failed records never qualify, even if a credit balance exists. */
export function hasVerifiedConsultingFoundation(profile: ProfileDto, free: FreeAnalysisResultRecord | null): free is FreeAnalysisResultRecord & { content: NonNullable<FreeAnalysisResultRecord["content"]> } {
  return Boolean(free && free.profileId === profile.id && free.status === "completed" &&
    free.profileFingerprint === getProfileFingerprint(profile) && free.content?.saju?.yearPillarHanja &&
    free.content.saju.monthPillarHanja && free.content.saju.dayPillarHanja &&
    free.content.profile?.id === profile.id);
}

export async function requireConsultingFoundation(userId: string, profileId: string) {
  const [profile, activeProfile, free] = await Promise.all([
    getUserProfile(profileId, userId), getActiveProfile(userId), getFreeAnalysisResult(userId, profileId),
  ]);
  if (!profile || activeProfile?.id !== profile.id) throw new Error("AI_CONSULTING_PROFILE_BOUNDARY_MISMATCH");
  if (!hasVerifiedConsultingFoundation(profile, free) || free.userId !== userId) throw new Error("AI_CONSULTING_FREE_ANALYSIS_REQUIRED");
  return { profile, free };
}

export async function requireConsultingAdult(userId: string) {
  const { account } = await assertPaidPurchaseEligibility(userId);
  if (account.paidEligibilityStatus !== "VERIFIED_ADULT") {
    throw new PaidPurchaseEligibilityError(account.paidEligibilityStatus === "REVOKED" ? "PAID_ELIGIBILITY_REVOKED" : "PAID_ELIGIBILITY_UNVERIFIED");
  }
}

/** Same canonical engine as the free result, evaluated for today's Korean date.
 * Never use client birth data or infer an unknown birth hour. */
export function buildVerifiedConsultingChart(profile: ProfileDto) {
  return buildSajuResponse(getSaju(profile.birthDate, profile.birthTime, profile.calendarType,
    profile.isLeapMonth ? "윤달" : "평달", profile.gender, undefined, profile.birthTimeKnown ?? null));
}
