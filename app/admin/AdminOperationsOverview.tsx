import Link from "next/link";
import type { CustomerJourneyDashboard } from "@/app/lib/analytics/customerJourney";
import type { SoloOperationsSnapshot } from "@/app/lib/operators/soloOperations";

type FailureCategory =
  | "PAYMENT_RECONCILIATION"
  | "REFUND_RETRY"
  | "REFUND_OWNER_REVIEW"
  | "REPORT_FAILED"
  | "REPORT_STALE"
  | "CLOSURE_RETRY"
  | "CLOSURE_OWNER_REVIEW";

type FailureSummary = Record<FailureCategory, number>;

type AiOperationsSnapshot = {
  attempts: number;
  succeeded: number;
  failed: number;
  timedOut: number;
  inFlight: number;
  successRate: number | null;
  chargeIntegrityIssueCount: number;
};

type AiQualitySnapshot = {
  successfulAnswers: number;
  formatPassRate: number | null;
  telemetryPassRate: number | null;
  estimatedAverageCostUsd: number | null;
};

function number(value: number): string {
  return value.toLocaleString("ko-KR");
}

function percent(value: number | null): string {
  if (value === null) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function usd(value: number | null): string {
  if (value === null) return "-";
  if (value < 0.01) return `$${value.toFixed(5)}`;
  return `$${value.toFixed(3)}`;
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-[#dce1ef] bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p>
    </div>
  );
}

export default function AdminOperationsOverview({
  failureSummary,
  aiOperations,
  aiQuality,
  operatorAlertConfigured,
  supportQueueCount,
  reportPerformance,
  soloOps,
}: {
  failureSummary: FailureSummary | null;
  aiOperations: AiOperationsSnapshot | null;
  aiQuality: AiQualitySnapshot | null;
  operatorAlertConfigured: boolean;
  supportQueueCount: number | null;
  reportPerformance: CustomerJourneyDashboard | null;
  soloOps: SoloOperationsSnapshot | null;
}) {
  const systemHealthy = soloOps?.scheduler === "healthy" && soloOps?.reportRecovery === "healthy";
  const ownerAttention = failureSummary && soloOps
    ? failureSummary.PAYMENT_RECONCILIATION + failureSummary.REFUND_OWNER_REVIEW
      + failureSummary.CLOSURE_OWNER_REVIEW
      + Math.min(failureSummary.REPORT_FAILED, soloOps.reportRecoveryExhausted)
      + (aiOperations?.chargeIntegrityIssueCount ?? 0)
      + soloOps.supportActive + soloOps.reviewsPending + soloOps.creditRefundManual
      + soloOps.failedOwnerEmails + soloOps.failedSupportEmails
      + (soloOps.aiAnomaly ? 1 : 0) + (systemHealthy ? 0 : 1)
    : null;
  const recoveryQueue = failureSummary && soloOps
    ? failureSummary.REFUND_RETRY + failureSummary.REPORT_STALE + failureSummary.CLOSURE_RETRY
      + Math.max(0, failureSummary.REPORT_FAILED - soloOps.reportRecoveryExhausted)
      + soloOps.creditRefundRecovering
    : null;
  const operationalAttention = ownerAttention !== null && recoveryQueue !== null
    ? ownerAttention + recoveryQueue : null;
  const unavailable = failureSummary === null || aiOperations === null || aiQuality === null || soloOps === null;
  const allClear = !unavailable && operatorAlertConfigured && systemHealthy && operationalAttention === 0;
  const bannerText = !operatorAlertConfigured
    ? "대표 예외 이메일 알림 설정 필요"
    : unavailable ? "일부 운영 현황 조회 불가"
    : !systemHealthy ? "자동 작업 상태 확인 필요"
    : allClear ? "현재 확인된 운영 이상 없음" : "확인이 필요한 항목이 있습니다";
  const actionTasks = failureSummary && soloOps ? [
    { title: "결제 상태 확인", count: failureSummary.PAYMENT_RECONCILIATION, href: "#failure-summary-heading", action: "토스 대조" },
    { title: "환불 수동 확인", count: failureSummary.REFUND_OWNER_REVIEW, href: "#failure-summary-heading", action: "환불 기록 대조" },
    { title: "리포트 최종 실패", count: Math.min(failureSummary.REPORT_FAILED, soloOps.reportRecoveryExhausted), href: "#failure-summary-heading", action: "자동 재시도 완료 후 확인" },
    { title: "회원탈퇴 수동 확인", count: failureSummary.CLOSURE_OWNER_REVIEW, href: "#failure-summary-heading", action: "금전 상태 확인" },
    { title: "AI 질문권 무결성", count: aiOperations?.chargeIntegrityIssueCount ?? 0, href: "/admin/ai-consulting/operations", action: "차감·답변 대조" },
    { title: "고객 문의 응답", count: soloOps.supportActive, href: "/admin/support", action: "문의 답변" },
    { title: "구매 후기 검수", count: soloOps.reviewsPending, href: "/admin/reviews", action: "후기 공개 기준 검토" },
    { title: "질문권 환불 수동 확인", count: soloOps.creditRefundManual, href: "/admin/credit-refunds", action: "토스 환불 여부 확인" },
    { title: "중요 이메일 최종 발송 실패", count: soloOps.failedOwnerEmails + soloOps.failedSupportEmails, href: "/admin/guide", action: "Resend 상태 확인" },
    { title: "AI 상담 운영 이상", count: soloOps.aiAnomaly ? 1 : 0, href: "/admin/ai-consulting", action: "실패·원가 확인" },
    { title: "자동 작업 생존 감시 이상", count: systemHealthy ? 0 : 1, href: "/admin/guide", action: "자동 작업 상태 확인" },
  ].filter((task) => task.count > 0) : [];

  return (
    <section className="border-b border-slate-200 pb-8" aria-labelledby="operator-overview-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">SOLO OPERATOR</p>
          <h1 id="operator-overview-heading" className="mt-3 text-3xl font-bold">1인 통합 운영 업무함</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            정상 항목은 시스템이 자동 처리합니다. 숫자가 0이면 손대지 않아도 됩니다. 대표 확인이 필요한 예외만 아래에서 확인하세요.
          </p>
        </div>
        <div className={`border px-4 py-3 text-sm font-bold ${allClear ? "border-emerald-200 bg-emerald-50 text-emerald-800" : unavailable || !operatorAlertConfigured ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {bannerText}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="운영 확인 필요"
          value={operationalAttention === null ? "-" : `${number(operationalAttention)}건`}
          note="대표 조치와 자동 복구 · 고객문의·후기·이메일 장애 포함"
        />
        <Stat
          label="대표 직접 확인 우선"
          value={ownerAttention === null ? "-" : `${number(ownerAttention)}건`}
          note="고객문의·후기·수동환불·금전 예외·이메일 실패·AI 이상"
        />
        <Stat
          label="자동 복구/대기"
          value={recoveryQueue === null ? "-" : `${number(recoveryQueue)}건`}
          note="환불·리포트·탈퇴 자동 재시도 · 직접 DB 수정 금지"
        />
        <Stat
          label="AI 상담 성공률"
          value={aiOperations ? percent(aiOperations.successRate) : "-"}
          note={aiOperations ? `최근 24시간 시도 ${number(aiOperations.attempts)}건 · 실패 ${number(aiOperations.failed + aiOperations.timedOut)}건` : "AI 운영 현황을 읽지 못했습니다."}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-[#dce1ef] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">대표가 직접 처리할 업무</h2>
          <span className="text-sm font-bold text-slate-600">{ownerAttention === null ? "조회 불가" : `${number(ownerAttention)}건`}</span>
        </div>
        {unavailable ? (
          <p className="mt-3 text-sm font-semibold text-amber-800">일부 업무를 읽지 못했습니다. 0건으로 판단하지 마세요.</p>
        ) : actionTasks.length === 0 ? (
          <p className="mt-3 text-sm text-emerald-800">현재 직접 처리할 업무가 없습니다. 정상 거래는 자동 처리합니다.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {actionTasks.map((task) => (
              <li key={task.title} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span className="font-semibold text-slate-900">{task.title} · {number(task.count)}건</span>
                <span className="text-slate-500">{task.action}</span>
                <Link href={task.href} className="font-bold text-[#5143b0] underline">확인 →</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="자동 작업" value={!soloOps ? "조회 불가" : systemHealthy ? "정상" : "확인 필요"}
          note={soloOps ? `결제·환불: ${soloOps.scheduler} · 리포트 복구: ${soloOps.reportRecovery}` : "자동 작업 실행 상태 확인 실패"}/>
        <Stat label="고객문의 / 후기" value={soloOps ? `${number(soloOps.supportActive)}건 / ${number(soloOps.reviewsPending)}건` : "조회 불가"}
          note={soloOps ? `24시간 지난 문의 ${soloOps.supportOverdue}건 · 48시간 지난 후기 ${soloOps.reviewsOverdue}건` : "업무함 조회 실패"}/>
        <Stat label="AI 질문권 환불 예외" value={soloOps ? `${number(soloOps.creditRefundManual)}건` : "조회 불가"}
          note={soloOps ? `재확인 대기 ${soloOps.creditRefundRecovering}건 · 실카드 자동 취소는 심사 중 비활성` : "환불 상태 조회 실패"}/>
        <Stat label="중요 알림 발송 실패" value={soloOps ? `${number(soloOps.failedOwnerEmails + soloOps.failedSupportEmails)}건` : "조회 불가"}
          note={soloOps ? `AI 이상 ${soloOps.aiAnomaly ?? "없음"} · 24시간 상담 원가 추정 ${soloOps.aiEstimatedCost24hUsd.toFixed(3)}` : "AI·이메일 감시 조회 실패"}/>
      </div>
      <nav className="mt-4 flex flex-wrap gap-3 text-sm" aria-label="통합 운영 업무">
        <Link href="/admin/support" className="font-bold text-[#5143b0] underline">고객지원 처리 →</Link>
        <Link href="/admin/reviews" className="font-bold text-[#5143b0] underline">후기 검수 →</Link>
        <Link href="/admin/credit-refunds" className="font-bold text-[#5143b0] underline">질문권 환불 확인 →</Link>
      </nav>
      <div className="mt-7 rounded-2xl border border-[#dce1ef] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">유료 리포트 생성 현황</h2>
            <p className="mt-1 text-xs text-slate-500">최근 30일에 생성 시작한 구매 리포트 기준 · 생성 중 제외한 완료/실패 비율입니다.</p>
          </div>
          <Link href="/admin/customer-journey" className="text-sm font-semibold text-[#5e4bd1] underline underline-offset-4">생성·고객 행동 상세 →</Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="리포트 생성 성공률"
            value={reportPerformance && reportPerformance.reportsCompleted30 + reportPerformance.reportsFailed30 > 0
              ? percent(reportPerformance.reportsCompleted30 / (reportPerformance.reportsCompleted30 + reportPerformance.reportsFailed30)) : "—"}
            note={reportPerformance ? "완료 " + number(reportPerformance.reportsCompleted30) + "건 · 실패 " + number(reportPerformance.reportsFailed30) + "건" : "집계 조회 불가"}/>
          <Stat label="평균 생성 완료 시간"
            value={reportPerformance?.reportAverageSeconds30 == null ? "—" : number(reportPerformance.reportAverageSeconds30) + "초"}
            note="등록부터 완료까지 · 대기·재시도 시간 포함"/>
          <Stat label="생성 실패"
            value={reportPerformance ? number(reportPerformance.reportsFailed30) + "건" : "—"}
            note="최종 리포트 실패 상태 · 기존 실패/지연 조회 유지"/>
          <Stat label="생성 재시도"
            value={reportPerformance ? number(reportPerformance.generationRetries30) + "회" : "—"}
            note="생성 시도 기록의 재시도 횟수 · 리포트 건수 아님"/>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-5">
        <div className={`border p-4 ${supportQueueCount === 0 ? "border-emerald-200 bg-emerald-50" : supportQueueCount === null ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
          <p className="text-xs font-semibold text-slate-600">고객지원 요청</p>
          <p className="mt-2 text-lg font-bold">{supportQueueCount === null ? "-" : `${number(supportQueueCount)}건`}</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">자동 해결 안내로 해결되지 않아 접수된 진행 중 문의입니다.</p>
        </div>
        <div className={`border p-4 ${operatorAlertConfigured ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <p className="text-xs font-semibold text-slate-600">대표 예외 이메일 알림</p>
          <p className="mt-2 text-lg font-bold">{operatorAlertConfigured ? "설정됨" : "설정 필요"}</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">자동 복구 건은 알리지 않고, 대표 판단이 필요한 예외가 생길 때만 활성 운영자에게 알립니다.</p>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">AI 질문권 무결성</p>
          <p className="mt-2 text-lg font-bold">{aiOperations ? `${number(aiOperations.chargeIntegrityIssueCount)}건` : "-"}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">0이 아니면 차감과 답변 기록이 어긋난 사례가 있어 우선 확인해야 합니다.</p>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">AI 답변 구조 검사</p>
          <p className="mt-2 text-lg font-bold">{aiQuality ? percent(aiQuality.formatPassRate) : "-"}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">최근 완료 답변 {aiQuality ? number(aiQuality.successfulAnswers) : "-"}건 표본 기준</p>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">AI 답변당 API 원가 추정</p>
          <p className="mt-2 text-lg font-bold">{aiQuality ? usd(aiQuality.estimatedAverageCostUsd) : "-"}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">토큰 기록 완전성 {aiQuality ? percent(aiQuality.telemetryPassRate) : "-"}</p>
        </div>
      </div>

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="운영자 바로가기">
        <Link href="/admin/support" className="border border-slate-900 bg-[#171a3d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#242957]">고객지원 요청 {supportQueueCount === null ? "-" : `${number(supportQueueCount)}건`}</Link>
        <Link href="/admin/guide" className="border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800">대표 운영 가이드</Link>
        <Link href="/admin/ai-consulting/operations" className="border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800">AI 상담 운영</Link>
        <Link href="/admin/ai-consulting" className="border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800">AI 품질·비용</Link>
      </nav>
    </section>
  );
}