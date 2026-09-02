import PremiumProductDetail from "@/app/components/PremiumProductDetail";
import {
  getCanonicalPremiumProductId,
  getPremiumProduct,
} from "@/app/lib/premiumProductRegistry";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import { getCurrentEditionEntitlementForProfile } from "@/app/lib/purchases/server";
import { getPaidReport } from "@/app/lib/paidReports/server";
import { isProductSaved } from "@/app/lib/interestedAnalyses/server";

type PaidAnalysisAccessPanelProps = {
  productId: string;
  profileId?: string;
};

export default async function PaidAnalysisAccessPanel({
  productId,
  profileId,
}: PaidAnalysisAccessPanelProps) {
  const canonicalProductId = getCanonicalPremiumProductId(productId);

  const user = await getCurrentUser();

  if (!profileId || !isProfileId(profileId)) {
    notFound();
  }

  const profile = user ? await getUserProfile(profileId, user.id) : null;

  if (user && !profile) {
    notFound();
  }

  const currentEditionOwnership = user && profile
    ? await getCurrentEditionEntitlementForProfile({
      userId: user.id,
      profile,
      productId: canonicalProductId,
    })
    : null;
  const entitlement = currentEditionOwnership?.entitlement ?? null;
  const hasAccess = entitlement !== null;
  const product = getPremiumProduct(canonicalProductId);

  if (!product) {
    notFound();
  }

  const report = hasAccess && user && profile && currentEditionOwnership
    ? await getPaidReport(user.id, profile.id, canonicalProductId, currentEditionOwnership.analysisEditionKey)
    : null;
  const state = hasAccess ? report?.status ?? "none" : "not_purchased";
  const isSaved = user ? await isProductSaved(user.id, canonicalProductId) : false;

  return <PremiumProductDetail product={product} state={state} profileId={profileId} isSaved={isSaved} />;
}