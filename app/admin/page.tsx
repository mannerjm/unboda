import { redirect } from "next/navigation";
import { getAdminGrowthDashboard } from "@/app/lib/analytics/server";
import { getAiConsultingCreditBundle } from "@/app/lib/aiConsulting/commercialPolicy";
import { getAiConsultingOperationsReport } from "@/app/lib/aiConsulting/operations";
import { getAiConsultingQualityCostReport } from "@/app/lib/aiConsulting/qualityCost";
import { getOperationalFailureSummary } from "@/app/lib/operators/failureVisibilityServer";
import { OperatorAuthorizationError, requireOperator } from "@/app/lib/operators/server";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import { getActiveSupportRequestCount } from "@/app/lib/support/operatorServer";
import AdminGrowthOverview from "./AdminGrowthOverview";
import AdminLookupConsole from "./AdminLookupConsole";
import AdminOperationsOverview from "./AdminOperationsOverview";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  try {
    await requireOperator();
  } catch (error) {
    if (error instanceof OperatorAuthorizationError && error.code === "UNAUTHENTICATED") {
      redirect("/auth/login?returnTo=/admin");
    }

    return (
      <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
        <div className="mx-auto w-full max-w-xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">CS CONSOLE</p>
          <h1 className="mt-3 text-3xl font-bold">접근 권한 없음</h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">이 화면은 승인된 운영자만 사용할 수 있습니다.</p>
        </div>
      </main>
    );
  }

  const [growthResult, failureResult, operationsResult, qualityResult, supportResult] = await Promise.allSettled([
    getAdminGrowthDashboard(30),
    getOperationalFailureSummary(),
    getAiConsultingOperationsReport(24),
    getAiConsultingQualityCostReport(100),
    getActiveSupportRequestCount(),
  ]);

  const growth = growthResult.status === "fulfilled" ? growthResult.value : null;
  const failureSummary = failureResult.status === "fulfilled" ? failureResult.value : null;
  const operations = operationsResult.status === "fulfilled" ? operationsResult.value : null;
  const quality = qualityResult.status === "fulfilled" ? qualityResult.value : null;
  const supportQueueCount = supportResult.status === "fulfilled" ? supportResult.value : null;

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

  const productLabels = growth?.topProducts.map((item) => {
    const premium = getPremiumProduct(item.productId);
    if (premium) return { productId: item.productId, label: premium.title };
    const credit = getAiConsultingCreditBundle(item.productId);
    if (credit) return { productId: item.productId, label: `AI 질문권 ${credit.questions}회` };
    return { productId: item.productId, label: item.productId };
  }) ?? [];

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-10 text-stone-900 sm:px-8 sm:py-14">
      <div className="mx-auto w-full max-w-6xl">
        {growth ? (
          <AdminGrowthOverview report={growth} productLabels={productLabels} />
        ) : (
          <section className="border-b border-stone-200 pb-8">
            <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">GROWTH & REVENUE</p>
            <h1 className="mt-3 text-3xl font-bold">서비스 성장·매출 현황</h1>
            <div className="mt-5 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              성장·매출 지표를 불러오지 못했습니다. 아래 운영 상태는 계속 확인할 수 있습니다.
            </div>
          </section>
        )}

        <div className="pt-10">
          <AdminOperationsOverview
            failureSummary={failureSummary}
            aiOperations={aiOperations}
            aiQuality={aiQuality}
            operatorAlertConfigured={Boolean(process.env.RESEND_API_KEY?.trim())}
            supportQueueCount={supportQueueCount}
          />
        </div>
        <AdminLookupConsole initialFailureSummary={failureSummary} />
      </div>
    </main>
  );
}
