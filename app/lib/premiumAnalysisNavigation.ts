export type PremiumAnalysisProductState =
  | "not_purchased"
  | "none"
  | "generating"
  | "completed"
  | "failed";

export function getPremiumAnalysisHref(
  productId: string,
  state: PremiumAnalysisProductState,
  profileId?: string,
): string | null {
  if (state === "none" || state === "generating") return null;

  const query = profileId ? `?profileId=${encodeURIComponent(profileId)}` : "";
  return state === "not_purchased"
    ? `/checkout/${productId}${query}`
    : `/paid-analysis/${productId}/report${query}`;
}

export function toPremiumAnalysisProductState(
  reportStatus: PremiumAnalysisProductState | undefined,
): PremiumAnalysisProductState {
  return reportStatus ?? "not_purchased";
}