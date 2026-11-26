import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./DashboardShell.module.css";

const groups = [
  { label: "운영 관리", items: [
    { id: "overview", label: "운영 요약", icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z", note: "대표가 확인할 업무와 오늘의 핵심 지표" },
    { id: "reports", label: "유료 리포트", icon: "M6 3h9l4 4v14H6zM14 3v5h5M9 12h7m-7 4h7", note: "생성 성공률, 완료 시간, 실패와 재시도" },
    { id: "ai", label: "AI 상담 운영", icon: "M4 5h16v12H9l-5 4zM8 10h8m-8 3h5", note: "상담 운영, 질문권 무결성, 품질과 비용" },
    { id: "support", label: "고객 지원·운영 예외", icon: "M4 12a8 8 0 0 1 16 0v6h-4v-6h4M4 12v6h4v-6H4M16 18v3h-4", note: "고객·주문 조회 및 처리 필요 항목" },
    { id: "refunds", label: "결제·환불·회원", icon: "M3 5h18v14H3zM3 10h18M7 15h4", note: "환불, 회원 탈퇴, 질문권 환불 예외" },
    { id: "reviews", label: "후기 관리", icon: "M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z", note: "구매 인증 후기와 검수" },
  ] },
  { label: "성장 분석", items: [
    { id: "revenue", label: "서비스 성장·매출", icon: "M4 20V4m0 16h16M8 16v-4m5 4V8m5 8V5", note: "방문자, 무료 분석, 결제, 기간별 매출 및 상품별 매출" },
    { id: "journey", label: "재방문·구매 전환", icon: "M3 5h18l-7 8v6l-4 2v-8z", note: "고객 재방문, 구매 전환, 장기 고객 가치" },
  ] },
  { label: "시스템", items: [
    { id: "system", label: "자동화·보안", icon: "M12 3l8 3v6c0 5-5 8-8 9-3-1-8-4-8-9V6zM9 12l2 2 4-4", note: "자동 작업, 알림, 관리자 인증 및 운영 가이드" },
  ] },
] as const;
type DashboardItem = (typeof groups)[number]["items"][number];
const items = groups.flatMap<DashboardItem>(group => [...group.items]);
export type DashboardView = (typeof groups)[number]["items"][number]["id"];
export function parseDashboardView(value: unknown): DashboardView {
  return items.find(item => item.id === value)?.id ?? "overview";
}

export default function DashboardShell({ view, children }: { view: DashboardView; children: ReactNode }) {
  const current = items.find(item => item.id === view) ?? items[0];
  return <div className="min-h-screen bg-[#f5f6f8] text-slate-900 lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
    <aside className="border-b border-[#d1d5db] bg-white p-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-5">
      <div className="flex items-center gap-3 py-2">
        <div aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-400 bg-white text-lg font-black text-slate-900">운</div>
        <div><p className="text-lg font-black text-slate-950">운보다 관리자</p><p className="text-[13px] text-slate-600">통합 운영 대시보드</p></div>
      </div>
      <nav aria-label="관리자 주제별 메뉴" className="mt-4 space-y-5">
        {groups.map(group => <div key={group.label}>
          <p className="mb-2 px-2 text-[13px] font-bold tracking-wide text-slate-700">{group.label}</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
            {group.items.map(item => <Link key={item.id} prefetch={false} href={"/admin/dashboard?view="+item.id} aria-current={view === item.id ? "page" : undefined} className={"flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 text-[15px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-700 "+(view === item.id ? "border-slate-300 border-l-4 border-l-slate-900 bg-[#e8edf4] font-bold text-slate-950" : "border-transparent text-slate-700 hover:border-slate-300 hover:bg-[#f5f6f8] hover:text-slate-950")}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d={item.icon}/></svg><span>{item.label}</span>
            </Link>)}
          </div>
        </div>)}
      </nav>
      <div className="mt-6 space-y-2 border-t border-slate-200 pt-4">
        {/* Keep the legacy entry available for future restoration, but hide it in the sidebar. */}
        <Link prefetch={false} href="/admin?legacy=1" hidden className="hidden rounded-lg px-2 py-2 text-sm font-semibold text-slate-700 underline">기존 전체 관리자 화면 ↗</Link>
        <Link href="/" prefetch={false} className="block rounded-lg px-2 py-2 text-sm text-slate-600">운보다 홈페이지 ↗</Link>
        <p className="px-2 text-[13px] leading-6 text-slate-600 break-keep">
          <span className="block font-semibold">승인된 운영자 전용</span>
          <span className="block">기존 권한 및 처리 기준 유지</span>
        </p>
      </div>
    </aside>
    <main className={`${styles.content} min-w-0 bg-[#f5f6f8] px-4 py-5 sm:px-8 lg:px-10 lg:py-8`} id="admin-dashboard-content">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#d1d5db] pb-5">
          <div><p className="text-[13px] font-bold text-slate-600">관리자</p><h1 className="mt-1 text-3xl font-black text-slate-950">{current.label}</h1><p className="mt-2 text-[15px] leading-6 text-slate-700">{current.note}</p></div>
          <a href={"/admin/dashboard?view="+view} className="inline-flex min-h-11 items-center rounded-xl border border-slate-400 bg-white px-4 text-[15px] font-semibold text-slate-700">현황 새로고침</a>
        </header>
        {children}
      </div>
    </main>
  </div>;
}
