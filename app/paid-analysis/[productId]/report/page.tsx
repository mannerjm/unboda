import PaidAnalysisDetailV2Client from "../PaidAnalysisDetailV2Client";
import Link from "next/link";
import { redirect } from "next/navigation";
import ReportAccessGate from "./ReportAccessGate";
import AiConsultingEntryCard from "./AiConsultingEntryCard";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import {
  isCompatibilityFamilyOtherProductId,
  isCompatibilityFamilyParentChildProductId,
  isCompatibilityFamilySiblingProductId,
  isCompatibilityRomanticProductId,
} from "@/app/lib/specialAnalysisProducts";

type PaidAnalysisReportPageProps = {
  params: Promise<{
    productId: string;
  }>;
  searchParams: Promise<{ profileId?: string; edition?: string }>;
};

function compatibilityReportHref(productId: string, profileId: string, edition?: string): string | null {
  const editionQuery = edition ? `&edition=${encodeURIComponent(edition)}` : "";
  const profileQuery = `?profileId=${encodeURIComponent(profileId)}${editionQuery}`;

  if (isCompatibilityRomanticProductId(productId)) {
    return `/special-analysis/compatibility/report${profileQuery}`;
  }
  if (isCompatibilityFamilyParentChildProductId(productId)) {
    return `/special-analysis/compatibility/family/parent-child/report${profileQuery}`;
  }
  if (isCompatibilityFamilySiblingProductId(productId)) {
    return `/special-analysis/compatibility/family/siblings/report${profileQuery}`;
  }
  if (isCompatibilityFamilyOtherProductId(productId)) {
    return `/special-analysis/compatibility/family/other/report${profileQuery}`;
  }
  return null;
}

export default async function PaidAnalysisReportPage({
  params,
  searchParams,
}: PaidAnalysisReportPageProps) {
  const { productId } = await params;
  const { profileId, edition } = await searchParams;

  if (profileId) {
    const compatibilityHref = compatibilityReportHref(productId, profileId, edition);
    if (compatibilityHref) redirect(compatibilityHref);
  }

  const product = getPremiumProduct(productId);

  if (!product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fc] px-6">
        <div className="rounded-3xl border border-[#dce1ef] bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-[#11162d]">
            존재하지 않는 심층 분석입니다.
          </h1>

          <Link
            href="/result"
            className="mt-5 inline-flex text-sm font-semibold text-slate-700 underline"
          >
            결과로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fc] text-[#11162d]">
      <ReportAccessGate productId={productId} profileId={profileId} edition={edition}>
        <PaidAnalysisDetailV2Client productId={productId} profileId={profileId} edition={edition} />
        <AiConsultingEntryCard productId={productId} profileId={profileId} edition={edition} />
      </ReportAccessGate>
    </main>
  );
}
