"use client";

import type { AdminRefundClosureDashboard } from "@/app/lib/analytics/server";

type ProductLabel = { productId: string; label: string };

function number(value: number): string {
  return value.toLocaleString("ko-KR");
}

function won(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function time(value: string | null): string {
  return value
    ? new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
    : "-";
}

function refundStatus(status: string): string {
  const labels: Record<string, string> = {
    REFUND_REQUESTED: "환불 요청",
    REFUND_PROCESSING: "환불 처리 중",
    REFUND_FAILED_RETRYING: "환불 재시도 중",
    REFUND_COMPLETED: "환불 완료",
    OWNER_REVIEW_REQUIRED: "대표 확인 필요",
  };
  return labels[status] ?? status;
}

function closureStatus(item: AdminRefundClosureDashboard["recentClosures"][number]): string {
  if (item.finalizedAt || item.status === "CLOSED") return "탈퇴 완료";
  if (item.ownerReviewRequired) return "대표 확인 필요";
  if (item.status === "DELETION_REQUESTED" && item.finalizationStartedAt) return "탈퇴 처리 중";
  if (item.status === "DELETION_REQUESTED") return "탈퇴 요청";
  if (item.canceledAt) return "탈퇴 요청 취소";
  return item.status;
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-stone-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-stone-950">{value}</p>
      <p className="mt-2 text-xs leading-5 text-stone-500">{note}</p>
    </div>
  );
}

export default function AdminRefundClosureOverview({
  report,
  productLabels,
}: {
  report: AdminRefundClosureDashboard;
  productLabels: ProductLabel[];
}) {
  const labels = new Map(productLabels.map((item) => [item.productId, item.label]));
  const today = report.periods.today;
  const week = report.periods.week;
  const month = report.periods.month;
  const totals = report.totals;

  return (
    <section className="border-b border-stone-200 py-10" aria-labelledby="refund-closure-heading">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">REFUNDS & ACCOUNT CLOSURES</p>
        <h2 id="refund-closure-heading" className="mt-3 text-2xl font-bold">환불·회원 탈퇴 현황</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
          환불 금액은 실제 환불 완료 건만 집계합니다. 탈퇴 요청과 취소는 실제 계정 상태 전환 시점부터 기록하고,
          탈퇴 완료는 계정 최종 종료 시각을 기준으로 집계합니다. 모든 날짜는 한국시간(KST) 기준입니다.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="오늘 환불 완료" value={`${number(today.refundCompleted)}건 · ${won(today.refundAmountKrw)}`} note="실제 REFUND_COMPLETED 기준" />
        <MetricCard label="이번 주 환불 완료" value={`${number(week.refundCompleted)}건 · ${won(week.refundAmountKrw)}`} note={`${week.startDate} ~ ${week.endDate}`} />
        <MetricCard label="이번 달 환불 완료" value={`${number(month.refundCompleted)}건 · ${won(month.refundAmountKrw)}`} note={`${month.startDate} ~ ${month.endDate}`} />
        <MetricCard label="누적 환불 완료" value={`${number(totals.refundCompleted)}건 · ${won(totals.refundAmountKrw)}`} note="서비스 DB의 실제 완료 환불 누적" />
        <MetricCard label="오늘 탈퇴 요청" value={`${number(today.closureRequested)}명`} note={`취소 ${number(today.closureCanceled)}명 · 완료 ${number(today.closureCompleted)}명`} />
        <MetricCard label="이번 주 탈퇴" value={`요청 ${number(week.closureRequested)} · 완료 ${number(week.closureCompleted)}`} note={`요청 취소 ${number(week.closureCanceled)}명`} />
        <MetricCard label="이번 달 탈퇴" value={`요청 ${number(month.closureRequested)} · 완료 ${number(month.closureCompleted)}`} note={`요청 취소 ${number(month.closureCanceled)}명`} />
        <MetricCard label="현재 탈퇴 처리 중" value={`${number(totals.currentClosurePending)}명`} note={`대표 확인 필요 ${number(totals.closureOwnerReview)}명`} />
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-2">
        <div className="border border-stone-200 bg-white p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold">최근 환불 내역</h3>
              <p className="mt-1 text-xs text-stone-500">최근 요청 순 · 진행 중/완료/대표 확인 상태 모두 표시</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                  <th className="py-2 pr-3">주문</th><th className="py-2 pr-3">상품</th><th className="py-2 pr-3 text-right">환불액</th><th className="py-2 pr-3">상태</th><th className="py-2 pr-3">요청일</th><th className="py-2">완료일</th>
                </tr>
              </thead>
              <tbody>
                {report.recentRefunds.length > 0 ? report.recentRefunds.map((item) => (
                  <tr key={`${item.orderId}-${item.requestedAt}`} className="border-b border-stone-100 last:border-0">
                    <td className="py-2.5 pr-3 font-mono text-xs" title={item.orderId}>…{item.orderId.slice(-8)}</td>
                    <td className="py-2.5 pr-3 font-medium">{labels.get(item.productId) ?? item.productId}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold">{won(item.requestedAmountKrw)}</td>
                    <td className="py-2.5 pr-3">{refundStatus(item.status)}</td>
                    <td className="py-2.5 pr-3 text-xs">{time(item.requestedAt)}</td>
                    <td className="py-2.5 text-xs">{time(item.completedAt)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="py-8 text-center text-sm text-stone-500">환불 내역이 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border border-stone-200 bg-white p-5">
          <div>
            <h3 className="text-lg font-bold">최근 회원 탈퇴 내역</h3>
            <p className="mt-1 text-xs text-stone-500">요청·처리 중·취소·완료 상태를 구분합니다.</p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                  <th className="py-2 pr-3">계정 참조</th><th className="py-2 pr-3">상태</th><th className="py-2 pr-3">요청일</th><th className="py-2 pr-3">취소일</th><th className="py-2">완료일</th>
                </tr>
              </thead>
              <tbody>
                {report.recentClosures.length > 0 ? report.recentClosures.map((item) => (
                  <tr key={`${item.accountUserId}-${item.generation}`} className="border-b border-stone-100 last:border-0">
                    <td className="py-2.5 pr-3 font-mono text-xs" title={item.accountUserId}>…{item.accountUserId.slice(-8)}</td>
                    <td className="py-2.5 pr-3 font-medium">{closureStatus(item)}</td>
                    <td className="py-2.5 pr-3 text-xs">{item.requestedAt ? time(item.requestedAt) : item.finalizedAt ? "기록 도입 전" : "-"}</td>
                    <td className="py-2.5 pr-3 text-xs">{time(item.canceledAt)}</td>
                    <td className="py-2.5 text-xs">{time(item.finalizedAt)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="py-8 text-center text-sm text-stone-500">회원 탈퇴 내역이 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs leading-5 text-stone-500">
            누적 탈퇴 요청은 이 기능 적용 이후의 상태 전환부터 정확히 기록합니다. 기존 완료 계정은 완료 건수에는 포함되지만 과거 요청일을 임의 생성하지 않습니다.
          </p>
        </div>
      </div>
    </section>
  );
}
