import PaidAnalysisDetailV2Client from "../PaidAnalysisDetailV2Client";
import Link from "next/link";
import ReportAccessGate from "./ReportAccessGate";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
type PaidAnalysisReportPageProps = {
  params: Promise<{
    productId: string;
  }>;
  searchParams: Promise<{ profileId?: string }>;
};


export default async function PaidAnalysisReportPage({
  params,
  searchParams,
}: PaidAnalysisReportPageProps) {
  const { productId } = await params;
  const { profileId } = await searchParams;

const product = getPremiumProduct(productId);

  if (!product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] px-6">
        <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-stone-900">
            존재하지 않는 심층 분석입니다.
          </h1>

          <Link
            href="/result"
            className="mt-5 inline-flex text-sm font-semibold text-stone-700 underline"
          >
            결과로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  return (
      <main className="min-h-screen bg-[#f7f3ea] text-stone-900">
    <ReportAccessGate productId={productId} profileId={profileId}>
      <PaidAnalysisDetailV2Client productId={productId} profileId={profileId} />
    </ReportAccessGate>
  </main>
);
}