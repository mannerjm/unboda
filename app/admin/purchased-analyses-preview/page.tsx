import Link from "next/link";
import { redirect } from "next/navigation";
import PurchasedAnalysesListMultiEdition from "@/app/components/PurchasedAnalysesListMultiEdition";
import type { PurchasedAnalysisProductGroup } from "@/app/lib/purchasedAnalysesGrouping";
import { OperatorAuthorizationError, requireOperator } from "@/app/lib/operators/server";

export const dynamic = "force-dynamic";

const PREVIEW_GROUPS: PurchasedAnalysisProductGroup[] = [
  {
    profileId: "00000000-0000-4000-8000-000000000001",
    productId: "wealth",
    productName: "재물·수입 안정성 심층 분석",
    latestAcquiredAt: "2026-09-17T05:20:00.000Z",
    editions: [
      {
        analysisEditionKey: "YEAR:2026",
        reportStatus: "completed",
        editionLabel: "2026년 분석",
        isLatest: true,
        acquiredAt: "2026-09-17T05:20:00.000Z",
        acquisitionSource: "purchase",
      },
      {
        analysisEditionKey: "YEAR:2025",
        reportStatus: "completed",
        editionLabel: "2025년 분석",
        isLatest: false,
        acquiredAt: "2025-11-28T03:10:00.000Z",
        acquisitionSource: "purchase",
      },
    ],
  },
  {
    profileId: "00000000-0000-4000-8000-000000000001",
    productId: "career-workplace-relationships",
    productName: "직장 협업 관계 분석",
    latestAcquiredAt: "2026-09-13T08:45:00.000Z",
    editions: [
      {
        analysisEditionKey: "YEAR:2026",
        reportStatus: "generating",
        editionLabel: "2026년 분석",
        isLatest: true,
        acquiredAt: "2026-09-13T08:45:00.000Z",
        acquisitionSource: "purchase",
      },
    ],
  },
  {
    profileId: "00000000-0000-4000-8000-000000000001",
    productId: "compatibility-romantic",
    productName: "연인·배우자 궁합 분석",
    latestAcquiredAt: "2026-08-22T11:30:00.000Z",
    editions: [
      {
        analysisEditionKey: "PAIR_YEAR:2026:0123456789abcdef",
        reportStatus: "completed",
        editionLabel: "구매한 분석",
        isLatest: true,
        acquiredAt: "2026-08-22T11:30:00.000Z",
        acquisitionSource: "purchase",
      },
    ],
  },
  {
    profileId: "00000000-0000-4000-8000-000000000001",
    productId: "relationship-current",
    productName: "현재 연애 관계의 지속성과 조정",
    latestAcquiredAt: "2026-08-03T02:00:00.000Z",
    editions: [
      {
        analysisEditionKey: "YEAR:2026",
        reportStatus: "failed",
        editionLabel: "2026년 분석",
        isLatest: true,
        acquiredAt: "2026-08-03T02:00:00.000Z",
        acquisitionSource: "purchase",
      },
    ],
  },
];

export default async function AdminPurchasedAnalysesPreviewPage() {
  try {
    await requireOperator();
  } catch (error) {
    if (error instanceof OperatorAuthorizationError && error.code === "UNAUTHENTICATED") {
      redirect("/auth/login?returnTo=/admin/purchased-analyses-preview");
    }

    return (
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-14 text-slate-900">
        <div className="mx-auto w-full max-w-xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">LIBRARY PREVIEW</p>
          <h1 className="mt-3 text-3xl font-bold">접근 권한 없음</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">이 미리보기는 승인된 운영자만 사용할 수 있습니다.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fc] px-4 py-7 text-[#11162d] sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-5xl">
        <section className="rounded-[2rem] border border-[#dce1ef] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-[#6f5ce7]">ADMIN DESIGN PREVIEW</p>
              <h1 className="mt-2 text-2xl font-black tracking-[-0.03em]">Phase 8 구매한 분석 보관함 미리보기</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                실제 구매·entitlement·리포트 상태를 만들지 않는 샘플 화면입니다. 버튼은 Phase 6/7 미리보기로 연결됩니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/report-preview" className="rounded-full border border-[#dce1ef] bg-[#f7f8fc] px-4 py-2 text-sm font-semibold text-slate-700">
                리포트 미리보기
              </Link>
              <Link href="/admin/ai-consulting-preview" className="rounded-full border border-[#dce1ef] bg-[#f7f8fc] px-4 py-2 text-sm font-semibold text-slate-700">
                AI 상담 미리보기
              </Link>
              <Link href="/admin" className="rounded-full border border-[#dce1ef] bg-[#f7f8fc] px-4 py-2 text-sm font-semibold text-slate-700">
                관리자 페이지
              </Link>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#d8d3ff] bg-[#f3f1ff] px-3 py-2 text-sm font-bold text-[#5e4bd1]">현재 분석 대상 · 본인</span>
            <span className="rounded-full bg-[#eef0f6] px-3 py-2 text-xs font-semibold text-slate-600">샘플 데이터</span>
          </div>
        </section>

        <PurchasedAnalysesListMultiEdition
          groups={PREVIEW_GROUPS}
          profileId="00000000-0000-4000-8000-000000000001"
          previewMode
        />
      </div>
    </main>
  );
}
