import PremiumProductDetail from "@/app/components/PremiumProductDetail";
import {
  getCanonicalPremiumProductId,
  getPremiumProduct,
} from "@/app/lib/premiumProductRegistry";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import { hasActiveEntitlementForProfile } from "@/app/lib/purchases/server";
import { getPaidReport } from "@/app/lib/paidReports/server";

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

  const hasAccess = user && profile
    ? await hasActiveEntitlementForProfile(user.id, profile.id, canonicalProductId)
    : false;
  const product = getPremiumProduct(canonicalProductId);

  if (!product) {
    notFound();
  }

  const report = hasAccess && user && profile
    ? await getPaidReport(user.id, profile.id, canonicalProductId)
    : null;
  const state = hasAccess ? report?.status ?? "none" : "not_purchased";

  return <PremiumProductDetail product={product} state={state} profileId={profileId} />;
}