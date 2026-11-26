import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminGrowthDashboard, getAdminRefundClosureDashboard } from "@/app/lib/analytics/server";
import { getAdminCustomerJourneyDashboard } from "@/app/lib/analytics/customerJourney";
import { getAiConsultingCreditBundle } from "@/app/lib/aiConsulting/commercialPolicy";
import { getAiConsultingOperationsReport } from "@/app/lib/aiConsulting/operations";
import { getAiConsultingQualityCostReport } from "@/app/lib/aiConsulting/qualityCost";
import { getOperationalFailureSummary } from "@/app/lib/operators/failureVisibilityServer";
import { getSoloOperationsSnapshot } from "@/app/lib/operators/soloOperations";
import { OperatorAuthorizationError, requireOperator } from "@/app/lib/operators/server";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import { getSpecialAnalysisProduct } from "@/app/lib/specialAnalysisProducts";
import { getActiveSupportRequestCount } from "@/app/lib/support/operatorServer";
import { getAdminReviewDashboard } from "@/app/lib/reviews/server";
import AdminGrowthOverview from "../AdminGrowthOverview";
import AdminRefundClosureOverview from "../AdminRefundClosureOverview";
import AdminLookupConsole from "../AdminLookupConsole";
import AdminOperationsOverview from "../AdminOperationsOverview";
import AdminReviewOverview from "../AdminReviewOverview";
import AdminCustomerJourneyOverview from "../AdminCustomerJourneyOverview";
import DashboardShell, { parseDashboardView } from "./DashboardShell";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "운보다 관리자 대시보드", robots: { index: false, follow: false } };

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  try {
    await requireOperator();
  } catch (error) {
    if (error instanceof OperatorAuthorizationError && error.code === "UNAUTHENTICATED") {
      redirect("/auth/login?returnTo=/admin/dashboard");
    }

    return (
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-14 text-slate-900">
        <div className="mx-auto w-full max-w-xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">CS CONSOLE</p>
          <h1 className="mt-3 text-3xl font-bold">접근 권한 없음</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">이 화면은 승인된 운영자만 사용할 수 있습니다.</p>
        </div>
      </main>
    );
  }

  const view = parseDashboardView((await searchParams).view);
  const overview = view === "overview";
  const [growthResult, refundClosureResult, failureResult, operationsResult, qualityResult, supportResult, journeyResult, reviewResult, soloResult] = await Promise.allSettled([
    overview || view === "revenue" ? getAdminGrowthDashboard(30) : Promise.resolve(null),
    view === "refunds" ? getAdminRefundClosureDashboard(20) : Promise.resolve(null),
    overview || view === "support" ? getOperationalFailureSummary() : Promise.resolve(null),
    overview || view === "ai" ? getAiConsultingOperationsReport(24) : Promise.resolve(null),
    overview || view === "ai" ? getAiConsultingQualityCostReport(100) : Promise.resolve(null),
    overview || view === "system" || view === "ai" ? getActiveSupportRequestCount() : Promise.resolve(null),
    overview || view === "journey" || view === "reports" ? getAdminCustomerJourneyDashboard() : Promise.resolve(null),
    view === "reviews" ? getAdminReviewDashboard() : Promise.resolve(null),
    overview || view === "system" ? getSoloOperationsSnapshot() : Promise.resolve(null),
  ]);

  const growth = growthResult.status === "fulfilled" ? growthResult.value : null;
  const journey = journeyResult.status === "fulfilled" ? journeyResult.value : null;
  const refundClosure = refundClosureResult.status === "fulfilled" ? refundClosureResult.value : null;
  const failureSummary = failureResult.status === "fulfilled" ? failureResult.value : null;
  const operations = operationsResult.status === "fulfilled" ? operationsResult.value : null;
  const quality = qualityResult.status === "fulfilled" ? qualityResult.value : null;
  const supportQueueCount = supportResult.status === "fulfilled" ? supportResult.value : null;
  const reviewDashboard = reviewResult.status === "fulfilled" ? reviewResult.value : null;
  const soloOps = soloResult.status === "fulfilled" ? soloResult.value : null;

  const chargeIntegrityIssueCount = operations
    ? operations.chargeIntegrity.chargedWithoutAssistant
      + operations.chargeIntegrity.chargedWithoutConsume
      + operations.chargeIntegrity.assistantWithoutCharge
      + operations.chargeIntegrity.consumeWithoutCharge
      + operations.chargeIntegrity.staleReservations
      + operations.chargeIntegrity.releasedWithoutFailureTelemetry
    : 0;

  const aiOperations = operations ? {
    attempts: operations.attempts,
    succeeded: operations.succeeded,
    failed: operations.failed,
    timedOut: operations.timedOut,
    inFlight: operations.inFlight,
    successRate: operations.successRate,
    chargeIntegrityIssueCount,
  } : null;

  const aiQuality = quality ? {
    successfulAnswers: quality.successfulAnswers,
    formatPassRate: quality.successfulAnswers > 0 ? quality.formatPassCount / quality.successfulAnswers : null,
    telemetryPassRate: quality.successfulAnswers > 0 ? quality.telemetryCompleteCount / quality.successfulAnswers : null,
    estimatedAverageCostUsd: quality.estimatedAverageCostUsd,
  } : null;

  const productIds = new Set<string>([
    ...(growth?.topProducts.map((item) => item.productId) ?? []),
    ...(refundClosure?.recentRefunds.map((item) => item.productId) ?? []),
  ]);
  const productLabels = [...productIds].map((productId) => {
    const premium = getPremiumProduct(productId);
    if (premium) return { productId, label: premium.title };
    const special = getSpecialAnalysisProduct(productId);
    if (special) return { productId, label: special.title };
    const credit = getAiConsultingCreditBundle(productId);
    if (credit) return { productId, label: `AI 질문권 ${credit.questions}회` };
    // Keep the technical ID in the row tooltip, not in the customer-facing label.
    return { productId, label: "상품명 확인 필요" };
  });

  const operationProps = { failureSummary, aiOperations, aiQuality, operatorAlertConfigured: Boolean(process.env.RESEND_API_KEY?.trim()), supportQueueCount, reportPerformance: journey, soloOps };
  const fmt = (n: number | null | undefined, suffix: string) => n == null ? "조회 불가" : n.toLocaleString("ko-KR") + suffix;
  const link = (href: string, label: string) => <Link prefetch={false} href={href} className="inline-flex min-h-11 items-center rounded-xl border border-[#dcd5eb] bg-white px-4 py-2 text-sm font-bold text-[#5b398e] hover:bg-[#f5efff]">{label} →</Link>;
  const unavailable = (title: string) => <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{title} 조회에 실패했습니다. 0건으로 판단하지 마세요. 기존 관리자 화면에서 다시 확인할 수 있습니다.</div>;
  return (
    <DashboardShell view={view}>
      {view === "overview" ? <>
        <AdminOperationsOverview {...operationProps} view="summary" />
        <section className="mt-6" aria-label="오늘의 핵심 지표">
          <h2 className="mb-3 text-lg font-bold text-[#302146]">오늘의 핵심 지표</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "오늘 방문자", value: fmt(growth?.periods.today.visitors, "명"), target: "revenue" },
              { label: "오늘 순매출", value: fmt(growth?.periods.today.netRevenueKrw, "원"), target: "revenue" },
              { label: "리포트 최종 실패 (최근 30일)", value: fmt(journey?.reportsFailed30, "건"), target: "reports" },
              { label: "고객지원 요청", value: fmt(supportQueueCount, "건"), target: "support" },
            ].map(item => <Link prefetch={false} key={item.label} href={"/admin/dashboard?view="+item.target} className="rounded-2xl border border-[#e0d7ed] bg-white p-5 shadow-sm hover:border-[#a78bce]"><p className="text-xs font-semibold text-slate-600">{item.label}</p><p className="mt-2 text-2xl font-bold">{item.value}</p><p className="mt-3 text-xs font-semibold text-[#69439b]">상세 확인 →</p></Link>)}
          </div>
        </section>
        <p className="mt-4 text-xs leading-5 text-slate-500">지표는 기존 운영 집계 기준을 그대로 사용합니다. TEST 거래 포함 여부 등 집계 기준은 변경하지 않았습니다.</p>
      </> : null}
      {view === "reports" ? <>
        <AdminOperationsOverview {...operationProps} view="reports" />
        <div className="mt-5 flex flex-wrap gap-3">{link("/admin/dashboard?view=support#failure-summary-heading", "분석 실패·지연 확인")}{link("/admin/customer-journey", "생성·고객 행동 상세")}</div>
      </> : null}
      {view === "revenue" ? (growth ? <AdminGrowthOverview report={growth} productLabels={productLabels} journey={null} showJourney={false} /> : unavailable("성장·매출 지표")) : null}
      {view === "journey" ? <AdminCustomerJourneyOverview report={journey} /> : null}
      {view === "ai" ? <>
        <AdminOperationsOverview {...operationProps} view="ai" />
        <div className="mt-5 flex flex-wrap gap-3">{link("/admin/ai-consulting/operations", "상담 운영 상세")}{link("/admin/ai-consulting", "품질·비용 상세")}</div>
      </> : null}
      {view === "support" ? <>
        <div className="flex flex-wrap gap-3">{link("/admin/support", "고객 문의 처리")}{link("#failure-summary-heading", "운영 예외 확인")}</div>
        <AdminLookupConsole initialFailureSummary={failureSummary} />
      </> : null}
      {view === "refunds" ? <>
        {refundClosure ? <AdminRefundClosureOverview report={refundClosure} productLabels={productLabels} /> : unavailable("환불·회원 탈퇴 현황")}
        <div className="mt-6 rounded-2xl border border-[#dce1ef] bg-white p-5">
          <h2 className="text-lg font-bold">AI 질문권 환불 예외</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">일반 카드 취소는 자동으로 처리하고, 재확인 또는 수동 환불이 필요한 건만 살펴봅니다.</p>
          <div className="mt-4 flex flex-wrap gap-3">{link("/admin/credit-refunds", "질문권 환불 예외 확인")}{link("/admin/mfa", "관리자 인증 앱(MFA) 등록·추가 인증")}{link("/admin/dashboard?view=support#failure-summary-heading", "결제·환불·탈퇴 예외 확인")}</div>
        </div>
      </> : null}
      {view === "reviews" ? <AdminReviewOverview report={reviewDashboard} /> : null}
      {view === "system" ? <>
        <AdminOperationsOverview {...operationProps} view="system" />
        <div className="mt-5 flex flex-wrap gap-3">{link("/admin/guide", "대표 운영 가이드")}{link("/admin/mfa", "관리자 인증 앱(MFA)")}{link("/admin", "기존 전체 관리자 화면")}</div>
      </> : null}
    </DashboardShell>
  );
}
