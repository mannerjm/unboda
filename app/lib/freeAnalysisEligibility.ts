import type { ProfileDto } from "./profiles/types";
import {
  listUserFreeAnalysisResults,
  resolveProfileFreeAnalysisStatus,
  type ProfileFreeAnalysisStatus,
} from "./freeAnalysisResults/server";

export function isFreeAnalysisFoundationReady(status: ProfileFreeAnalysisStatus | null | undefined): boolean {
  return status === "completed" || status === "needs_retry";
}

export async function getProfileFreeAnalysisFoundationStatus(
  userId: string,
  profile: ProfileDto,
): Promise<ProfileFreeAnalysisStatus> {
  const summaries = await listUserFreeAnalysisResults(userId);
  // Commercial readiness is tied to the current profile birth inputs, not to
  // monthly free-result freshness. A changed birth input becomes stale and must
  // be re-run, while a later calendar month alone does not re-lock purchases.
  return resolveProfileFreeAnalysisStatus(profile, summaries);
}
