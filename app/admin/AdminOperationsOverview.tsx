import Link from "next/link";

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
    <div className="border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-stone-950">{value}</p>
      <p className="mt-2 text-xs leading-5 text-stone-500">{note}</p>
    </div>
  );
}

export default function AdminOperationsOverview({
  failureSummary,
  aiOperations,
  aiQuality,
  operatorAlertConfigured,
}: {
  failureSummary: FailureSummary | null;
  aiOperations: AiOperationsSnapshot | null;
  aiQuality: AiQualitySnapshot | null;
  operatorAlertConfigured: boolean;
}) {
  const operationalAttention = failureSummary
    ? Object.values(failureSummary).reduce((sum, count) => sum + count, 0)
    : null;
  const ownerAttention = failureSummary
    ? failureSummary.PAYMENT_RECONCILIATION
      + failureSummary.REFUND_OWNER_REVIEW
      + failureSummary.REPORT_FAILED
      + failureSummary.CLOSURE_OWNER_REVIEW
      + (aiOperations?.chargeIntegrityIssueCount ?? 0)
    : null;
  const recoveryQueue = failureSummary
    ? failureSummary.REFUND_RETRY + failureSummary.REPORT_STALE + failureSummary.CLOSURE_RETRY
    : null;
  const unavailable = failureSummary === null || aiOperations === null || aiQuality === null;
  const allClear = !unavailable
    && operatorAlertConfigured
    && (operationalAttention ?? 0) === 0
    && (aiOperations?.chargeIntegrityIssueCount ?? 0) === 0;
  const bannerText = !operatorAlertConfigured
    ? "대표 예외 이메일 알림 설정 필요"
    : allClear
      ? "현재 확인된 운영 이상 없음"
      : unavailable
        ? "일부 운영 현황 조회 불가"
        : "확인이 필요한 항목이 있습니다";

  return (
    <section className="border-b border-stone-200 pb-8" aria-labelledby="operator-overview-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">SOLO OPERATOR</p>
          <h1 id="operator-overview-heading" className="mt-3 text-3xl font-bold">운영 대시보드</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
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
          note="결제·환불·분석·계정 종료 큐 전체"
        />
        <Stat
          label="대표 직접 확인 우선"
          value={ownerAttention === null ? "-" : `${number(ownerAttention)}건`}
          note="금전 상태 불일치·환불 수동확인·분석 실패·탈퇴 수동확인·AI 차감 무결성"
        />
        <Stat
          label="자동 복구/대기"
          value={recoveryQueue === null ? "-" : `${number(recoveryQueue)}건`}
          note="재시도 또는 지연 상태. 즉시 DB를 수정하지 않습니다."
        />
        <Stat
          label="AI 상담 성공률"
          value={aiOperations ? percent(aiOperations.successRate) : "-"}
          note={aiOperations ? `최근 24시간 시도 ${number(aiOperations.attempts)}건 · 실패 ${number(aiOperations.failed + aiOperations.timedOut)}건` : "AI 운영 현황을 읽지 못했습니다."}
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        <div className={`border p-4 ${operatorAlertConfigured ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <p className="text-xs font-semibold text-stone-600">대표 예외 이메일 알림</p>
          <p className="mt-2 text-lg font-bold">{operatorAlertConfigured ? "설정됨" : "설정 필요"}</p>
          <p className="mt-2 text-xs leading-5 text-stone-600">자동 복구 건은 알리지 않고, 대표 판단이 필요한 예외가 생길 때만 활성 운영자에게 알립니다.</p>
        </div>
        <div className="border border-stone-200 bg-white p-4">
          <p className="text-xs font-semibold text-stone-500">AI 질문권 무결성</p>
          <p className="mt-2 text-lg font-bold">{aiOperations ? `${number(aiOperations.chargeIntegrityIssueCount)}건` : "-"}</p>
          <p className="mt-2 text-xs leading-5 text-stone-500">0이 아니면 차감과 답변 기록이 어긋난 사례가 있어 우선 확인해야 합니다.</p>
        </div>
        <div className="border border-stone-200 bg-white p-4">
          <p className="text-xs font-semibold text-stone-500">AI 답변 구조 검사</p>
          <p className="mt-2 text-lg font-bold">{aiQuality ? percent(aiQuality.formatPassRate) : "-"}</p>
          <p className="mt-2 text-xs leading-5 text-stone-500">최근 완료 답변 {aiQuality ? number(aiQuality.successfulAnswers) : "-"}건 표본 기준</p>
        </div>
        <div className="border border-stone-200 bg-white p-4">
          <p className="text-xs font-semibold text-stone-500">AI 답변당 API 원가 추정</p>
          <p className="mt-2 text-lg font-bold">{aiQuality ? usd(aiQuality.estimatedAverageCostUsd) : "-"}</p>
          <p className="mt-2 text-xs leading-5 text-stone-500">토큰 기록 완전성 {aiQuality ? percent(aiQuality.telemetryPassRate) : "-"}</p>
        </div>
      </div>

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="운영자 바로가기">
        <Link href="/admin/guide" className="border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800">대표 운영 가이드</Link>
        <Link href="/admin/ai-consulting/operations" className="border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800">AI 상담 운영</Link>
        <Link href="/admin/ai-consulting" className="border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800">AI 품질·비용</Link>
      </nav>
    </section>
  );
}
