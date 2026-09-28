import Link from "next/link";
import type { CustomerJourneyDashboard } from "@/app/lib/analytics/customerJourney";

function rate(n: number, d: number): string {
  return d > 0 ? ((n / d) * 100).toFixed(1) + "%" : "—";
}
function Metric({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-[#dce1ef] bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p>
    </div>
  );
}

export default function AdminCustomerJourneyOverview({ report }: { report: CustomerJourneyDashboard | null }) {
  const pending = "관측 기간을 충족한 고객이 없거나 데이터 조회가 불가능합니다.";
  return (
    <section className="border-b border-slate-200 py-8" aria-labelledby="admin-journey-summary-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">CUSTOMER JOURNEY</p>
          <h2 id="admin-journey-summary-heading" className="mt-2 text-2xl font-bold">고객 재방문·구매 전환</h2>
          <p className="mt-2 text-sm text-slate-600">기존 당일 전환 흐름과 별개로, 실제 동일 고객의 다음 행동을 확인합니다.</p>
        </div>
        <Link href="/admin/customer-journey" className="rounded-lg border border-slate-900 bg-[#171a3d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#242957]">고객 행동 상세 분석 →</Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="다음날 재방문율" value={report ? rate(report.visitor1Returned,report.visitor1Eligible) : "—"}
          note={report ? "첫 방문 다음날까지 관측 완료 " + report.visitor1Eligible + "개 브라우저" : pending}/>
        <Metric title="7일 재방문율" value={report ? rate(report.visitor7Returned,report.visitor7Eligible) : "—"}
          note={report ? "처음 방문한 브라우저 " + report.visitor7Eligible + "개 중 " + report.visitor7Returned + "개가 1~7일 내 재방문" : pending}/>
        <Metric title="무료 분석 → 첫 구매" value={report ? rate(report.freeToFirstPurchase7,report.freeToFirstPurchaseEligible) : "—"}
          note={report ? "무료 분석 완료 후 7일 관측 완료 " + report.freeToFirstPurchaseEligible + "명" : pending}/>
        <Metric title="첫 구매 → 30일 내 두 번째 결제" value={report ? rate(report.secondPaid30Repeated,report.secondPaid30Eligible) : "—"}
          note={report ? "첫 구매 후 30일 관측 완료 " + report.secondPaid30Eligible + "명 · 리포트/질문권 포함" : pending}/>
        <Metric title="리포트 구매 → AI 상담" value={report ? rate(report.reportConsultingBuyers,report.reportBuyers) : "—"}
          note={report ? "리포트 구매 고객 " + report.reportBuyers + "명 중 실제 유료 질문 이용" : pending}/>
        <Metric title="리포트 구매 → 질문권 구매" value={report ? rate(report.aiCreditBuyers,report.reportBuyers) : "—"}
          note={report ? "질문권 구매 고객 " + report.aiCreditBuyers + "명 · 재구매 " + report.aiCreditRepeatBuyers + "명" : pending}/>
        <Metric title="30일 고객당 순매출" value={report && report.revenue30Eligible > 0 ? report.averageNetRevenue30Krw.toLocaleString("ko-KR") + "원" : "—"}
          note={report ? "첫 구매 후 30일 관측 완료 " + report.revenue30Eligible + "명 기준" : pending}/>
        <Metric title="90일 고객당 순매출" value={report && report.revenue90Eligible > 0 ? report.averageNetRevenue90Krw.toLocaleString("ko-KR") + "원" : "—"}
          note={report ? "첫 구매 후 90일 관측 완료 " + report.revenue90Eligible + "명 기준" : pending}/>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        재방문·전환·고객당 매출은 필요한 관측 기간이 끝난 집단만 계산합니다. 외부 유입 출처는 이번 보강 이후 새 브라우저부터 수집되며 원본 URL·검색어·IP는 저장하지 않습니다.
        표본이 없으면 0% 대신 ‘—’로 표시합니다.
      </p>
    </section>
  );
}
