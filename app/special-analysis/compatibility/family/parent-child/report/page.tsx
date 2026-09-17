import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import CompatibilityPaidReportPreparing from "@/app/components/CompatibilityPaidReportPreparing";
import FamilyParentChildPaidReportView from "@/app/components/FamilyParentChildPaidReportView";
import AiConsultingEntryCard from "@/app/paid-analysis/[productId]/report/AiConsultingEntryCard";
import { isStoredFamilyParentChildReport } from "@/app/lib/familyCompatibilityPaidAnalysis";
import { getPaidReport } from "@/app/lib/paidReports/server";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import { listUserEntitlements } from "@/app/lib/purchases/server";
import { PAID_ANALYSIS_RESOURCE_TYPE } from "@/app/lib/purchases/types";
import { COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID } from "@/app/lib/specialAnalysisProducts";
import { getCurrentUser } from "@/app/lib/supabase/auth";

type Props = {
  searchParams: Promise<{ profileId?: string; edition?: string }>;
};

export default async function FamilyParentChildPurchasedReportPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?returnTo=/purchased-analyses");

  const { profileId, edition } = await searchParams;
  if (!profileId || !isProfileId(profileId)) notFound();
  const profile = await getUserProfile(profileId, user.id);
  if (!profile) notFound();

  const entitlements = (await listUserEntitlements(user.id))
    .filter((item) => item.profileId === profileId
      && item.resourceId === COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID
      && item.resourceType === PAID_ANALYSIS_RESOURCE_TYPE
      && item.analysisEditionKey)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const entitlement = edition
    ? entitlements.find((item) => item.analysisEditionKey === edition)
    : entitlements[0];

  if (!entitlement?.analysisEditionKey) {
    redirect("/special-analysis/compatibility/family/parent-child");
  }

  const report = await getPaidReport(
    user.id,
    profileId,
    COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID,
    entitlement.analysisEditionKey,
  );

  const completed = report?.status === "completed" && isStoredFamilyParentChildReport(report.content as unknown);

  return (
    <AppShell activeProfileId={profileId}>
      <main className="min-h-screen bg-[#fbfbfa] px-5 py-8 text-stone-900 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/purchased-analyses" className="text-sm font-semibold text-stone-600 underline decoration-stone-300 underline-offset-4">← 구매한 분석</Link>
            <span className="text-xs text-stone-500">{profile.label}님의 구매 리포트</span>
          </div>
          {completed ? (
            <>
              <FamilyParentChildPaidReportView content={report!.content as unknown as import("@/app/lib/familyCompatibilityPaidAnalysis").StoredFamilyParentChildReport} />
              <AiConsultingEntryCard
                productId={COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID}
                profileId={profileId}
                edition={entitlement.analysisEditionKey}
              />
            </>
          ) : (
            <CompatibilityPaidReportPreparing failed={report?.status === "failed"} />
          )}
        </div>
      </main>
    </AppShell>
  );
}
