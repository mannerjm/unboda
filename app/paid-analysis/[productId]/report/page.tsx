import PremiumReportContent from "./PremiumReportContent";
import Link from "next/link";
import ReportAccessGate from "./ReportAccessGate";
import { paidAnalysisProducts } from "@/app/lib/paidAnalysisProducts";
type PaidAnalysisReportPageProps = {
  params: Promise<{
    productId: string;
  }>;
};


export default async function PaidAnalysisReportPage({
  params,
}: PaidAnalysisReportPageProps) {
  const { productId } = await params;

  const product =
  paidAnalysisProducts[
    productId as keyof typeof paidAnalysisProducts
  ];

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
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href={`/paid-analysis/${productId}`}
          className="text-sm font-semibold text-stone-600 transition hover:text-stone-900"
        >
          ← 상품 설명으로 돌아가기
        </Link>

        <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-stone-500">
          PREMIUM REPORT
        </p>

        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          {product.title}
        </h1>

        <p className="mt-5 text-sm leading-7 text-stone-600">
          구매 권한이 확인된 사용자에게 제공되는 심층 분석 결과 페이지입니다.
        </p>
     <ReportAccessGate productId={productId}>
  <PremiumReportContent productId={productId} />
</ReportAccessGate>
      </div>
    </main>
  );
}