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
        <Metric title="7일 재방문율" value={report ? rate(report.visitor7Returned,report.visitor7Eligible) : "—"}
          note={report ? "처음 방문한 브라우저 " + report.visitor7Eligible + "개 중 " + report.visitor7Returned + "개가 1~7일 내 재방문" : pending}/>
        <Metric title="30일 재방문율" value={report ? rate(report.visitor30Returned,report.visitor30Eligible) : "—"}
          note={report ? "처음 방문한 브라우저 " + report.visitor30Eligible + "개 중 " + report.visitor30Returned + "개가 1~30일 내 재방문" : pending}/>
        <Metric title="상품 선택 → 구매율" value={report ? rate(report.selected7Purchased,report.selected7Eligible) : "—"}
          note={report ? "최근 30일 내 로그인 고객·상품 기준, 선택 7일 후 관측 완료 " + report.selected7Eligible + "건" : pending}/>
        <Metric title="구매 후 AI 상담 이용률" value={report ? rate(report.consultingBuyers,report.paidBuyers) : "—"}
          note={report ? "구매 고객 " + report.paidBuyers + "명 중 이후 질문권을 사용한 고객 " + report.consultingBuyers + "명" : pending}/>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        재방문은 동일 브라우저 기준이며 사람 수와 다를 수 있습니다. 7일·30일은 관측 기간이 완료된 집단만 계산합니다.
        새 고객 행동 지표는 수집 시작 이후부터 유효하며, 표본이 없으면 0% 대신 ‘—’로 표시합니다.
      </p>
    </section>
  );
}
