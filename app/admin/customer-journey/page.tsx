import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminCustomerJourneyDashboard, type CustomerJourneyDashboard } from "@/app/lib/analytics/customerJourney";
import { OperatorAuthorizationError, requireOperator } from "@/app/lib/operators/server";

export const dynamic = "force-dynamic";

function fmt(n: number): string { return n.toLocaleString("ko-KR"); }
function won(n: number): string { return n.toLocaleString("ko-KR") + "원"; }
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
function acquisitionLabel(channel: string, source: string): string {
  const channels: Record<string,string> = {
    direct:"직접 방문", organic_search:"검색", paid_campaign:"유료 캠페인",
    social:"SNS", shared_link:"공유 링크", referral:"외부 추천", other:"기타",
  };
  const sources: Record<string,string> = {
    direct:"직접", naver:"네이버", google:"Google", daum:"다음", bing:"Bing",
    kakao:"카카오", instagram:"Instagram", facebook:"Facebook", youtube:"YouTube", x:"X", other:"기타",
  };
  return `${channels[channel] ?? channel} · ${sources[source] ?? source}`;
}

function Dashboard({ report: r }: { report: CustomerJourneyDashboard }) {
  const determinedReports = r.reportsCompleted30 + r.reportsFailed30;
  const ai = r.aiComparison;
  return <>
    <section className="mt-8">
      <h2 className="text-xl font-bold">1. 재방문·장기 고객가치</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">최초 방문·최초 구매 뒤 실제 동일 고객이 다시 오는지와, 관측 기간 동안 고객당 순매출이 얼마나 쌓이는지 봅니다.</p>
      <div className="mt-4 rounded-2xl border border-[#dce1ef] bg-[#fafbff] p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-[#6f5ce7]">DAILY UNBODA RETENTION</p>
            <h3 className="mt-2 font-bold">오늘의 운보다 재방문</h3>
          </div>
          <p className="text-xs text-slate-500">수집 시작 · {r.todaySince ?? "아직 기록 없음"}</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="오늘 이용자" value={fmt(r.todayViewedToday)+"명"}
            note={"어제 "+fmt(r.todayViewedYesterday)+"명 이용 · 계정 기준"}/>
          <Card title="어제 → 오늘 재방문" value={rate(r.todayReturnedFromYesterday,r.todayViewedYesterday)}
            note={fmt(r.todayViewedYesterday)+"명 중 "+fmt(r.todayReturnedFromYesterday)+"명이 오늘 다시 확인"}/>
          <Card title="최근 7일 2일 이상 이용" value={fmt(r.todayActive2Days7)+"명"}
            note="최근 7일 중 서로 다른 날짜에 2회 이상 오늘의 운보다 확인"/>
          <Card title="첫 이용 D1 / D7" value={rate(r.todayD1Returned,r.todayD1Eligible)+" / "+rate(r.todayD7Returned,r.todayD7Eligible)}
            note={"D1 표본 "+fmt(r.todayD1Eligible)+"명 · D7 표본 "+fmt(r.todayD7Eligible)+"명"}/>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="첫 방문 다음날" value={rate(r.visitor1Returned,r.visitor1Eligible)}
          note={fmt(r.visitor1Eligible)+"개 브라우저 중 "+fmt(r.visitor1Returned)+"개가 정확히 다음날 재방문"}/>
        <Card title="첫 방문 후 7일" value={rate(r.visitor7Returned,r.visitor7Eligible)}
          note={fmt(r.visitor7Eligible)+"개 브라우저 중 "+fmt(r.visitor7Returned)+"개가 1~7일 내 재방문"}/>
        <Card title="첫 방문 후 30일" value={rate(r.visitor30Returned,r.visitor30Eligible)}
          note={fmt(r.visitor30Eligible)+"개 브라우저 중 "+fmt(r.visitor30Returned)+"개가 1~30일 내 재방문"}/>
        <Card title="첫 구매 다음날" value={rate(r.buyer1Returned,r.buyer1Eligible)}
          note={fmt(r.buyer1Eligible)+"개 계정 중 "+fmt(r.buyer1Returned)+"개가 정확히 다음날 로그인 방문"}/>
        <Card title="첫 구매 후 7일" value={rate(r.buyer7Returned,r.buyer7Eligible)}
          note={fmt(r.buyer7Eligible)+"개 계정 중 "+fmt(r.buyer7Returned)+"개가 1~7일 내 로그인 방문"}/>
        <Card title="첫 구매 후 30일" value={rate(r.buyer30Returned,r.buyer30Eligible)}
          note={fmt(r.buyer30Eligible)+"개 계정 중 "+fmt(r.buyer30Returned)+"개가 1~30일 내 로그인 방문"}/>
        <Card title="30일 고객당 순매출" value={r.revenue30Eligible ? won(r.averageNetRevenue30Krw) : "—"}
          note={"첫 구매 후 30일 관측 완료 "+fmt(r.revenue30Eligible)+"명 · 완료 환불 차감"}/>
        <Card title="90일 고객당 순매출" value={r.revenue90Eligible ? won(r.averageNetRevenue90Krw) : "—"}
          note={"첫 구매 후 90일 관측 완료 "+fmt(r.revenue90Eligible)+"명 · 완료 환불 차감"}/>
      </div>
      <p className="mt-3 text-xs text-slate-500">방문 수집 시작: {r.visitorSince ?? "기록 없음"} · 고객 행동 수집 시작: {r.journeySince ? new Date(r.journeySince).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"}) : "아직 기록 없음"}. 표본이 없으면 — 로 표시합니다.</p>
    </section>

    <section className="mt-10">
      <h2 className="text-xl font-bold">2. 무료 분석 → 첫 결제 → 두 번째 결제</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">당일 건수를 단순히 나누지 않고, 같은 회원의 실제 다음 행동을 코호트로 계산합니다.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="무료 분석 → 7일 내 첫 구매" value={rate(r.freeToFirstPurchase7,r.freeToFirstPurchaseEligible)}
          note={"무료 분석 완료 후 7일 관측 완료 "+fmt(r.freeToFirstPurchaseEligible)+"명 중 "+fmt(r.freeToFirstPurchase7)+"명"}/>
        <Card title="첫 구매 → 30일 내 두 번째 결제" value={rate(r.secondPaid30Repeated,r.secondPaid30Eligible)}
          note={"30일 관측 완료 "+fmt(r.secondPaid30Eligible)+"명 중 "+fmt(r.secondPaid30Repeated)+"명 · 추가 리포트 또는 질문권"}/>
        <Card title="상품 선택 → 7일 내 구매" value={rate(r.selected7Purchased,r.selected7Eligible)}
          note={"로그인 고객·상품 "+fmt(r.selected7Eligible)+"건 중 "+fmt(r.selected7Purchased)+"건"}/>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#dce1ef] bg-white p-5">
          <h3 className="font-bold">최근 30일 구매 진입량</h3>
          <Row label="상품 링크 선택" value={fmt(r.productSelected)+"건"}/>
          <Row label="상품 상세 진입" value={fmt(r.productDetailViewed)+"건"}/>
          <Row label="결제 화면 진입" value={fmt(r.checkoutViewed)+"건"}/>
          <Row label="실제 결제 완료" value={fmt(r.paidOrders30)+"건"}/>
        </div>
        <div className="rounded-2xl border border-[#dce1ef] bg-white p-5">
          <h3 className="font-bold">상품 링크 선택 위치 · 최근 30일</h3>
          <Row label="추천 분석" value={fmt(r.bySource.recommendations ?? 0)+"건"}/>
          <Row label="심층분석" value={fmt(r.bySource["deep-analysis"] ?? 0)+"건"}/>
          <Row label="궁합" value={fmt(r.bySource.compatibility ?? 0)+"건"}/>
          <Row label="기타 화면" value={fmt(r.bySource.other ?? 0)+"건"}/>
        </div>
      </div>
    </section>

    <section className="mt-10">
      <h2 className="text-xl font-bold">3. 신규 유입 출처 → 구매 → 순매출</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">이번 보강 이후 처음 방문한 새 브라우저부터 첫 유입을 거친 채널만 기록합니다. 원본 URL·검색어·UTM 문자열·IP는 저장하지 않고 네이버/Google/SNS/직접 방문 같은 제한된 분류만 저장합니다.</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-[#dce1ef] bg-white p-5">
        {r.acquisitionSources.length === 0 ? <p className="text-sm text-slate-500">아직 새 유입 출처 표본이 없습니다.</p> :
          <table className="min-w-full text-sm">
            <thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="py-2 pr-4">첫 유입</th><th className="py-2 pr-4 text-right">방문 브라우저</th>
              <th className="py-2 pr-4 text-right">계정 연결</th><th className="py-2 pr-4 text-right">신규 구매 고객</th>
              <th className="py-2 text-right">추적 순매출</th>
            </tr></thead>
            <tbody>{r.acquisitionSources.map((item) => <tr key={item.channel+":"+item.source} className="border-b border-slate-100 last:border-0">
              <td className="py-3 pr-4 font-semibold">{acquisitionLabel(item.channel,item.source)}</td>
              <td className="py-3 pr-4 text-right">{fmt(item.visitors)}</td>
              <td className="py-3 pr-4 text-right">{fmt(item.linkedAccounts)}</td>
              <td className="py-3 pr-4 text-right">{fmt(item.buyers)}</td>
              <td className="py-3 text-right font-semibold">{won(item.netRevenueKrw)}</td>
            </tr>)}</tbody>
          </table>}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">기존 브라우저를 나중 방문 기준으로 잘못 재분류하지 않습니다. 첫 유입 수집 이후 계정이 같은 브라우저에서 로그인했을 때만 매출과 연결합니다.</p>
    </section>

    <section className="mt-10">
      <h2 className="text-xl font-bold">4. 리포트 구매 → AI 상담 → 질문권</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">운보다의 핵심 차별점인 구매 리포트 이후 AI 상담이 실제로 사용되고 추가 매출로 이어지는지 확인합니다.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="리포트 구매 고객" value={fmt(r.reportBuyers)+"명"} note="질문권 상품을 제외한 실제 분석 구매 고객"/>
        <Card title="리포트 구매 → AI 상담" value={rate(r.reportConsultingBuyers,r.reportBuyers)}
          note={fmt(r.reportConsultingBuyers)+"명이 구매 뒤 실제 차감되는 AI 질문 이용"}/>
        <Card title="리포트 구매 → 질문권 구매" value={rate(r.aiCreditBuyers,r.reportBuyers)}
          note={fmt(r.aiCreditBuyers)+"명이 질문권을 한 번 이상 구매"}/>
        <Card title="질문권 재구매 고객" value={fmt(r.aiCreditRepeatBuyers)+"명"}
          note="리포트 구매 뒤 질문권 결제를 2회 이상 완료한 고객"/>
      </div>
    </section>

    <section className="mt-10">
      <h2 className="text-xl font-bold">5. AI 상담 사용 고객 vs 미사용 고객</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">첫 리포트 구매 후 30일 관측이 끝난 고객만 비교합니다. 아래 차이는 상관관계를 보는 운영 지표이며 AI 상담이 원인이라고 단정하지 않습니다.</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-[#dce1ef] bg-white p-5">
        <table className="min-w-full text-sm">
          <thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500">
            <th className="py-2 pr-4">고객군</th><th className="py-2 pr-4 text-right">표본</th>
            <th className="py-2 pr-4 text-right">30일 재방문</th><th className="py-2 pr-4 text-right">두 번째 리포트 구매</th>
            <th className="py-2 text-right">30일 평균 순매출</th>
          </tr></thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-3 pr-4 font-semibold">AI 상담 사용</td><td className="py-3 pr-4 text-right">{fmt(ai.aiUsers)}</td>
              <td className="py-3 pr-4 text-right">{rate(ai.aiReturned30,ai.aiUsers)}</td>
              <td className="py-3 pr-4 text-right">{rate(ai.aiSecondReportBuyers30,ai.aiUsers)}</td>
              <td className="py-3 text-right font-semibold">{ai.aiUsers ? won(ai.aiAverageNetRevenue30Krw) : "—"}</td>
            </tr>
            <tr>
              <td className="py-3 pr-4 font-semibold">AI 상담 미사용</td><td className="py-3 pr-4 text-right">{fmt(ai.nonAiUsers)}</td>
              <td className="py-3 pr-4 text-right">{rate(ai.nonAiReturned30,ai.nonAiUsers)}</td>
              <td className="py-3 pr-4 text-right">{rate(ai.nonAiSecondReportBuyers30,ai.nonAiUsers)}</td>
              <td className="py-3 text-right font-semibold">{ai.nonAiUsers ? won(ai.nonAiAverageNetRevenue30Krw) : "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section className="mt-10">
      <h2 className="text-xl font-bold">6. 리포트 생성 운영 품질</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">기존 운영 안전 지표는 그대로 유지합니다. 개별 오류·환불·질문권 무결성 조치는 기존 운영 대시보드에서 처리합니다.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="리포트 화면 진입" value={fmt(r.reportPageOpened)+"건"} note="최근 30일 페이지 진입 수 · 정독 여부와 다름"/>
        <Card title="리포트 생성 성공률" value={rate(r.reportsCompleted30,determinedReports)}
          note={"완료 "+fmt(r.reportsCompleted30)+"건 / 실패 "+fmt(r.reportsFailed30)+"건 · 생성 중 제외"}/>
        <Card title="평균 생성 완료 시간" value={r.reportAverageSeconds30 === null ? "—" : fmt(r.reportAverageSeconds30)+"초"}
          note="최근 30일 완료된 구매 리포트 · 지연·재시도 포함"/>
      </div>
      <div className="mt-4 rounded-2xl border border-[#dce1ef] bg-white p-5">
        <Row label="최근 30일 분석 생성 재시도" value={fmt(r.generationRetries30)+"회"}/>
        <Row label="최근 30일 분석 생성 실패 시도" value={fmt(r.generationFailedAttempts30)+"회"}/>
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
      <p className="mt-3 text-sm leading-6 text-slate-600">유입 출처·오늘의 운보다 재방문·무료 분석 전환·두 번째 결제·AI 상담 효과·고객당 순매출을 한 화면에서 봅니다. 고객의 사주 정보나 상담 원문은 표시하지 않습니다.</p>
      {report ? <Dashboard report={report}/> :
        <p className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          고객 행동 집계를 불러오지 못했습니다. 신규 통계의 데이터베이스 적용 상태를 확인하세요. 기존 관리자 운영 기능은 계속 사용할 수 있습니다.
        </p>}
    </div>
  </main>;
}