import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminCustomerJourneyDashboard, type CustomerJourneyDashboard } from "@/app/lib/analytics/customerJourney";
import { OperatorAuthorizationError, requireOperator } from "@/app/lib/operators/server";

export const dynamic = "force-dynamic";

function fmt(n: number): string { return n.toLocaleString("ko-KR"); }
function rate(a: number,b: number): string { return b > 0 ? (100*a/b).toFixed(1)+"%" : "—"; }
function Card({ title, value, note }: { title: string; value: string; note: string }) {
  return <div className="rounded-2xl border border-[#dce1ef] bg-white p-5 shadow-sm">
    <p className="text-sm font-semibold text-slate-600">{title}</p>
    <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
    <p className="mt-2 text-xs leading-6 text-slate-600">{note}</p>
  </div>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-3 text-sm last:border-0">
    <span className="text-slate-600">{label}</span><strong className="text-slate-900">{value}</strong>
  </div>;
}
function Dashboard({ report: r }: { report: CustomerJourneyDashboard }) {
  const determinedReports = r.reportsCompleted30 + r.reportsFailed30;
  return <>
    <section className="mt-8">
      <h2 className="text-xl font-bold">1. 고객 재방문 분석</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">최초 방문 또는 최초 구매가 7일·30일 전에 완료된 고객 집단만 집계합니다. 첫 방문은 브라우저 기준이며, 구매 고객은 로그인 계정 기준입니다.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="첫 방문 후 7일 이내" value={rate(r.visitor7Returned,r.visitor7Eligible)}
          note={fmt(r.visitor7Eligible)+"개 브라우저 중 "+fmt(r.visitor7Returned)+"개가 다음 7일 내 재방문"}/>
        <Card title="첫 방문 후 30일 이내" value={rate(r.visitor30Returned,r.visitor30Eligible)}
          note={fmt(r.visitor30Eligible)+"개 브라우저 중 "+fmt(r.visitor30Returned)+"개가 다음 30일 내 재방문"}/>
        <Card title="첫 구매 후 7일 이내" value={rate(r.buyer7Returned,r.buyer7Eligible)}
          note={fmt(r.buyer7Eligible)+"개 계정 중 "+fmt(r.buyer7Returned)+"개가 1~7일 뒤 로그인 방문"}/>
        <Card title="첫 구매 후 30일 이내" value={rate(r.buyer30Returned,r.buyer30Eligible)}
          note={fmt(r.buyer30Eligible)+"개 계정 중 "+fmt(r.buyer30Returned)+"개가 1~30일 뒤 로그인 방문"}/>
      </div>
      <p className="mt-3 text-xs text-slate-500">방문 수집 시작: {r.visitorSince ?? "기록 없음"} · 고객 행동 수집 시작: {r.journeySince ? new Date(r.journeySince).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"}) : "아직 기록 없음"}. 새 기능 이전의 로그인 방문은 소급 계산하지 않습니다. 표본이 없으면 — 로 표시합니다.</p>
    </section>
    <section className="mt-10">
      <h2 className="text-xl font-bold">2. 상품 선택부터 구매까지</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">최근 30일간의 단계별 활동 횟수입니다. 서로 다른 고객이 포함될 수 있으므로 아래 건수를 그대로 나눠 구매율로 표시하지 않습니다.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="상품 링크 선택" value={fmt(r.productSelected)+"건"} note="상품 페이지 또는 결제 페이지 링크 선택"/>
        <Card title="상품 상세 진입" value={fmt(r.productDetailViewed)+"건"} note="유료 분석 상세 페이지 진입"/>
        <Card title="결제 화면 진입" value={fmt(r.checkoutViewed)+"건"} note="체크아웃 페이지 진입(결제 승인과 다름)"/>
        <Card title="실제 결제 완료" value={fmt(r.paidOrders30)+"건"} note="DB의 결제 완료 주문 기준(최근 30일)"/>
      </div>
      <div className="mt-4 rounded-2xl border border-[#dce1ef] bg-white p-5">
        <h3 className="font-bold">로그인 고객의 상품 선택 → 7일 내 구매 전환</h3>
        <p className="mt-2 text-2xl font-bold">{rate(r.selected7Purchased,r.selected7Eligible)}</p>
        <p className="mt-1 text-sm text-slate-600">선택 후 7일이 지난 동일 계정·동일 상품 {fmt(r.selected7Eligible)}건 중 {fmt(r.selected7Purchased)}건이 7일 이내 구매했습니다. 로그인 전 선택은 포함하지 않습니다.</p>
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="mb-1 text-xs font-semibold text-slate-500">상품 링크 선택 위치 · 최근 30일</p>
          <Row label="추천 분석" value={fmt(r.bySource.recommendations ?? 0)+"건"}/>
          <Row label="심층분석" value={fmt(r.bySource["deep-analysis"] ?? 0)+"건"}/>
          <Row label="궁합" value={fmt(r.bySource.compatibility ?? 0)+"건"}/>
          <Row label="기타 화면" value={fmt(r.bySource.other ?? 0)+"건"}/>
        </div>
      </div>
    </section>
    <section className="mt-10">
      <h2 className="text-xl font-bold">3. 결제 이후 리포트·AI 상담</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">유료 구매 고객의 AI 상담 이용을 계정 단위로 계산합니다. AI 상담은 실제 질문권이 차감된 사용자 질문 기준이며, 화면 열람과 구분합니다.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="구매 후 AI 상담 이용률" value={rate(r.consultingBuyers,r.paidBuyers)}
          note={fmt(r.paidBuyers)+"명 중 구매 후 실제 유료 질문을 이용한 고객 "+fmt(r.consultingBuyers)+"명"}/>
        <Card title="리포트 화면 진입" value={fmt(r.reportPageOpened)+"건"} note="최근 30일 페이지 진입 수 · 실제 정독 여부는 측정하지 않음"/>
        <Card title="리포트 생성 성공률" value={rate(r.reportsCompleted30,determinedReports)}
          note="최근 30일에 생성 시작한 구매 리포트의 완료 "+fmt(r.reportsCompleted30)+"건 / 실패 "+fmt(r.reportsFailed30)+"건 (생성 중 제외)"/>
        <Card title="평균 생성 완료 시간" value={r.reportAverageSeconds30 === null ? "—" : fmt(r.reportAverageSeconds30)+"초"}
          note="최근 30일 완료된 구매 리포트의 등록부터 완료까지 · 지연·재시도 시간 포함"/>
      </div>
      <div className="mt-4 rounded-2xl border border-[#dce1ef] bg-white p-5">
        <Row label="최근 30일 분석 생성 재시도" value={fmt(r.generationRetries30)+"회"}/>
        <Row label="최근 30일 분석 생성 실패 시도" value={fmt(r.generationFailedAttempts30)+"회"}/>
        <p className="mt-3 text-xs text-slate-500">재시도·실패 시도는 생성 작업 단위이며, 최종 리포트 실패 건수와 다릅니다. 실제 과금·권한과 관련된 개별 오류는 기존 운영 대시보드에서 확인하세요.</p>
      </div>
    </section>
  </>;
}

export default async function AdminCustomerJourneyPage() {
  try { await requireOperator(); }
  catch (error) {
    if (error instanceof OperatorAuthorizationError && error.code==="UNAUTHENTICATED") {
      redirect("/auth/login?returnTo=/admin/customer-journey");
    }
    return <main className="mx-auto max-w-xl p-10"><h1 className="text-2xl font-bold">접근 권한 없음</h1><p className="mt-3 text-sm">승인된 운영자만 확인할 수 있습니다.</p></main>;
  }
  let report: CustomerJourneyDashboard | null = null;
  try { report = await getAdminCustomerJourneyDashboard(); }
  catch (error) { console.error("[admin-journey] dashboard unavailable",error instanceof Error ? error.name : "unknown"); }
  return <main className="min-h-screen bg-[#f5f7fc] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
    <div className="mx-auto max-w-6xl">
      <Link href="/admin" className="text-sm font-semibold text-slate-600 underline underline-offset-4">← 관리자 현황으로</Link>
      <p className="mt-7 text-xs font-semibold tracking-[0.2em] text-slate-500">CUSTOMER JOURNEY</p>
      <h1 className="mt-2 text-3xl font-bold">고객 행동 상세 분석</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">재방문·구매 전환·구매 이후 AI 상담과 리포트 처리 성능을 집계합니다. 고객의 사주 정보나 상담 원문은 이 화면에 표시하지 않습니다.</p>
      {report ? <Dashboard report={report}/> :
        <p className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          고객 행동 집계를 불러오지 못했습니다. 신규 통계의 데이터베이스 적용 상태를 확인하세요. 기존 관리자 운영 기능은 계속 사용할 수 있습니다.
        </p>}
    </div>
  </main>;
}
