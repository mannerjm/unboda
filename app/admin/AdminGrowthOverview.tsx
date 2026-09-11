"use client";

import { useMemo, useState } from "react";
import type { AdminGrowthDashboard } from "@/app/lib/analytics/server";

type ProductLabel = { productId: string; label: string };

function number(value: number): string {
  return value.toLocaleString("ko-KR");
}

function won(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function percent(numerator: number, denominator: number): string {
  if (denominator <= 0) return "-";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function shortDate(value: string): string {
  const [, month, day] = value.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-stone-950">{value}</p>
      <p className="mt-2 text-xs leading-5 text-stone-500">{note}</p>
    </div>
  );
}

export default function AdminGrowthOverview({
  report,
  productLabels,
}: {
  report: AdminGrowthDashboard;
  productLabels: ProductLabel[];
}) {
  const [trendDays, setTrendDays] = useState<7 | 30>(7);
  const productLabelMap = useMemo(
    () => new Map(productLabels.map((item) => [item.productId, item.label])),
    [productLabels],
  );
  const trend = report.daily.slice(-trendDays);
  const today = report.periods.today;
  const week = report.periods.week;
  const month = report.periods.month;
  const totals = report.totals;

  const funnel = [
    { label: "방문", value: today.visitors, rate: "기준" },
    { label: "무료분석 완료", value: today.freeAnalysisCompleted, rate: percent(today.freeAnalysisCompleted, today.visitors) },
    { label: "회원가입", value: today.signups, rate: percent(today.signups, today.freeAnalysisCompleted) },
    { label: "성인인증", value: today.adultVerified, rate: percent(today.adultVerified, today.signups) },
    { label: "구매 고객", value: today.payingCustomers, rate: percent(today.payingCustomers, today.adultVerified) },
  ];

  return (
    <section className="border-b border-stone-200 pb-10" aria-labelledby="growth-overview-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">GROWTH & REVENUE</p>
          <h1 id="growth-overview-heading" className="mt-3 text-3xl font-bold">서비스 성장·매출 현황</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
            모든 날짜는 한국시간(KST) 기준입니다. 방문자는 관리자 화면을 제외한 브라우저별 하루 순방문이며,
            매출·환불·성인인증은 실제 저장된 운영 상태를 기준으로 계산합니다.
          </p>
        </div>
        <div className="border border-stone-200 bg-white px-4 py-3 text-xs leading-5 text-stone-600">
          통계 수집 시작: {totals.dataSince ? new Date(totals.dataSince).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "첫 사용자 이벤트부터"}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="오늘 방문자" value={`${number(today.visitors)}명`} note="브라우저 기준 일 순방문" />
        <StatCard label="오늘 무료분석 완료" value={`${number(today.freeAnalysisCompleted)}건`} note={`시작 ${number(today.freeAnalysisStarted)}건`} />
        <StatCard label="오늘 신규 회원가입" value={`${number(today.signups)}명`} note="신규 계정 생성 + 가입 정책 완료" />
        <StatCard label="오늘 성인인증 완료" value={`${number(today.adultVerified)}명`} note="paid_eligible_at 기준" />
        <StatCard label="오늘 구매 고객" value={`${number(today.payingCustomers)}명`} note={`결제 성공 ${number(today.paidOrders)}건`} />
        <StatCard label="오늘 순매출" value={won(today.netRevenueKrw)} note={`결제 ${won(today.grossRevenueKrw)} · 환불 ${won(today.refundAmountKrw)}`} />
        <StatCard label="이번 달 순매출" value={won(month.netRevenueKrw)} note={`${month.startDate} ~ ${month.endDate}`} />
        <StatCard label="누적 순매출" value={won(totals.netRevenueKrw)} note={`누적 결제 ${won(totals.grossRevenueKrw)} · 환불 ${won(totals.refundAmountKrw)}`} />
      </div>

      <div className="mt-7 border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">오늘 전환 흐름</h2>
            <p className="mt-1 text-xs leading-5 text-stone-500">같은 날의 단계별 운영량 비율입니다. 코호트 전환율이 아니라 당일 퍼널 상태를 빠르게 보는 지표입니다.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-5">
          {funnel.map((item, index) => (
            <div key={item.label} className="relative border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold text-stone-500">{index + 1}. {item.label}</p>
              <p className="mt-2 text-xl font-bold">{number(item.value)}</p>
              <p className="mt-2 text-xs text-stone-600">이전 단계 대비 {item.rate}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-7 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="border border-stone-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">최근 추이</h2>
              <p className="mt-1 text-xs text-stone-500">일별 방문·무료분석·가입·인증·구매·순매출</p>
            </div>
            <div className="flex gap-2">
              {[7, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setTrendDays(days as 7 | 30)}
                  className={`border px-3 py-2 text-xs font-semibold ${trendDays === days ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700"}`}
                >
                  최근 {days}일
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[760px] w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                  <th className="py-2 pr-3">날짜</th><th className="py-2 pr-3">방문</th><th className="py-2 pr-3">무료완료</th><th className="py-2 pr-3">가입</th><th className="py-2 pr-3">성인인증</th><th className="py-2 pr-3">구매</th><th className="py-2 text-right">순매출</th>
                </tr>
              </thead>
              <tbody>
                {trend.map((row) => (
                  <tr key={row.date} className="border-b border-stone-100 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{shortDate(row.date)}</td>
                    <td className="py-2.5 pr-3">{number(row.visitors)}</td>
                    <td className="py-2.5 pr-3">{number(row.freeAnalysisCompleted)}</td>
                    <td className="py-2.5 pr-3">{number(row.signups)}</td>
                    <td className="py-2.5 pr-3">{number(row.adultVerified)}</td>
                    <td className="py-2.5 pr-3">{number(row.payingCustomers)}</td>
                    <td className="py-2.5 text-right font-semibold">{won(row.netRevenueKrw)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border border-stone-200 bg-white p-5">
            <h2 className="text-lg font-bold">매출 요약</h2>
            <div className="mt-4 space-y-3 text-sm">
              {[
                ["오늘", today],
                ["이번 주", week],
                ["이번 달", month],
              ].map(([label, period]) => {
                const value = period as typeof today;
                return (
                  <div key={label as string} className="border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between"><span className="font-semibold">{label as string}</span><strong>{won(value.netRevenueKrw)}</strong></div>
                    <p className="mt-1 text-xs text-stone-500">결제 {won(value.grossRevenueKrw)} · 환불 {won(value.refundAmountKrw)} · 성공 {number(value.paidOrders)}건</p>
                  </div>
                );
              })}
              <div className="border-t border-stone-200 pt-3">
                <div className="flex items-center justify-between"><span className="font-bold">누적</span><strong className="text-lg">{won(totals.netRevenueKrw)}</strong></div>
                <p className="mt-1 text-xs text-stone-500">결제 {won(totals.grossRevenueKrw)} · 환불 {won(totals.refundAmountKrw)}</p>
              </div>
            </div>
          </div>

          <div className="border border-stone-200 bg-white p-5">
            <h2 className="text-lg font-bold">누적 서비스 현황</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-stone-500">고유 방문 브라우저</dt><dd className="font-semibold">{number(totals.visitors)}명</dd></div>
              <div className="flex justify-between"><dt className="text-stone-500">무료분석 완료</dt><dd className="font-semibold">{number(totals.freeAnalysisCompleted)}건</dd></div>
              <div className="flex justify-between"><dt className="text-stone-500">추적 이후 가입</dt><dd className="font-semibold">{number(totals.signups)}명</dd></div>
              <div className="flex justify-between"><dt className="text-stone-500">현재 활성 계정</dt><dd className="font-semibold">{number(totals.activeAccounts)}명</dd></div>
              <div className="flex justify-between"><dt className="text-stone-500">현재 성인인증 계정</dt><dd className="font-semibold">{number(totals.currentVerifiedAdults)}명</dd></div>
              <div className="flex justify-between"><dt className="text-stone-500">누적 구매 고객</dt><dd className="font-semibold">{number(totals.payingCustomers)}명</dd></div>
              <div className="flex justify-between"><dt className="text-stone-500">월 운세 갱신</dt><dd className="font-semibold">{number(totals.monthlyRefreshes)}건</dd></div>
            </dl>
          </div>
        </div>
      </div>

      {report.topProducts.length > 0 ? (
        <div className="mt-7 border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-bold">상품별 누적 매출</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[640px] w-full text-sm">
              <thead><tr className="border-b border-stone-200 text-left text-xs text-stone-500"><th className="py-2 pr-3">상품</th><th className="py-2 pr-3">결제</th><th className="py-2 pr-3 text-right">총 결제액</th><th className="py-2 pr-3 text-right">환불</th><th className="py-2 text-right">순매출</th></tr></thead>
              <tbody>
                {report.topProducts.map((item) => (
                  <tr key={item.productId} className="border-b border-stone-100 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{productLabelMap.get(item.productId) ?? item.productId}</td>
                    <td className="py-2.5 pr-3">{number(item.paidOrders)}건</td>
                    <td className="py-2.5 pr-3 text-right">{won(item.grossRevenueKrw)}</td>
                    <td className="py-2.5 pr-3 text-right">{won(item.refundAmountKrw)}</td>
                    <td className="py-2.5 text-right font-semibold">{won(item.netRevenueKrw)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
