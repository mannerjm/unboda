import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { listUserProfiles } from "@/app/lib/profiles/server";
import { getAccountPaymentHistory } from "@/app/lib/accountPaymentHistory";
import {
  parsePaymentHistoryParams,
  paymentHistoryHref,
  selectPaymentHistoryPage,
} from "@/app/lib/accountPaymentHistoryFilters";

export const dynamic = "force-dynamic";

const paymentStatuses = {
  pending: "결제 대기",
  paid: "결제 완료",
  failed: "결제 실패",
  canceled: "결제 취소",
} as const;
const refundStatuses = {
  REFUND_REQUESTED: "환불 요청 접수",
  REFUND_PROCESSING: "환불 처리 중",
  REFUND_FAILED_RETRYING: "환불 재처리 중",
  REFUND_COMPLETED: "환불 완료",
  OWNER_REVIEW_REQUIRED: "담당자 확인 중",
} as const;

function dateLabel(timestamp: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(new Date(timestamp));
}

export default async function AccountPaymentHistoryPage({ searchParams }: {
  searchParams: Promise<{
    q?: string | string[];
    period?: string | string[];
    from?: string | string[];
    to?: string | string[];
    status?: string | string[];
    page?: string | string[];
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?returnTo=/mypage/payments");

  const [allItems, profiles, activeProfile, params] = await Promise.all([
    getAccountPaymentHistory(user.id),
    listUserProfiles(user.id),
    getActiveProfile(user.id),
    searchParams,
  ]);
  const { filters, requestedPage } = parsePaymentHistoryParams(params);
  const history = selectPaymentHistoryPage(allItems, filters, requestedPage);
  const profileLabels = new Map(profiles.map((profile) => [profile.id, profile.label]));

  return (
    <AppShell activeProfileId={activeProfile?.id ?? null}>
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
        <div className="mx-auto w-full max-w-3xl">
          <Link href="/mypage#payment-history-heading" className="text-sm font-semibold text-[#5e4bd1] underline underline-offset-4">← 마이페이지로</Link>
          <header className="mt-6 rounded-3xl border border-[#dce1ef] bg-white px-6 py-7 shadow-sm sm:px-8">
            <p className="text-xs font-bold tracking-[0.18em] text-[#5e4bd1]">PAYMENT HISTORY</p>
            <h1 className="mt-2 text-3xl font-extrabold">전체 결제 내역</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">내 계정의 모든 분석 대상에 대한 구매·결제 및 환불 처리 기록을 확인할 수 있습니다.</p>
            <p className="mt-3 text-sm font-semibold text-slate-700">전체 {allItems.length}건</p>
          </header>

          <section className="mt-5 rounded-3xl border border-[#dce1ef] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="payment-search-heading">
            <h2 id="payment-search-heading" className="text-lg font-bold">결제 내역 찾기</h2>
            <form action="/mypage/payments" method="get" className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
                상품명 검색
                <input name="q" type="search" maxLength={80} defaultValue={filters.query} placeholder="예: 재물운, 궁합"
                  className="mt-1.5 w-full rounded-xl border border-[#cfd5e6] bg-white px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#6f5ce7]" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                조회 기간
                <select name="period" defaultValue={filters.period} className="mt-1.5 w-full rounded-xl border border-[#cfd5e6] bg-white px-3 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-[#6f5ce7]">
                  <option value="all">전체 기간</option>
                  <option value="3m">최근 3개월</option>
                  <option value="1y">최근 1년</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                결제·환불 상태
                <select name="status" defaultValue={filters.status} className="mt-1.5 w-full rounded-xl border border-[#cfd5e6] bg-white px-3 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-[#6f5ce7]">
                  <option value="all">전체 상태</option>
                  <option value="paid">결제 완료</option>
                  <option value="refund_pending">환불 접수·처리 중</option>
                  <option value="refunded">환불 완료</option>
                  <option value="canceled">결제 취소</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                시작일 (선택)
                <input name="from" type="date" defaultValue={filters.from} className="mt-1.5 w-full rounded-xl border border-[#cfd5e6] bg-white px-3 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-[#6f5ce7]" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                종료일 (선택)
                <input name="to" type="date" defaultValue={filters.to} className="mt-1.5 w-full rounded-xl border border-[#cfd5e6] bg-white px-3 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-[#6f5ce7]" />
              </label>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <button type="submit" className="rounded-xl bg-[#171a3d] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#272b55] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6f5ce7]">조회하기</button>
                <Link href="/mypage/payments" className="text-sm font-semibold text-[#5e4bd1] underline underline-offset-4">조건 초기화</Link>
              </div>
            </form>
          </section>

          <section id="payment-history-results" className="mt-5 rounded-3xl border border-[#dce1ef] bg-white p-5 shadow-sm sm:p-7" aria-labelledby="full-payment-history-heading">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 id="full-payment-history-heading" className="text-xl font-bold">조회 결과</h2>
              <span className="text-sm text-slate-600">{history.total}건 · {history.from}~{history.to}건 표시</span>
            </div>
            {history.items.length ? (
              <ul className="mt-4 divide-y divide-slate-200">
                {history.items.map((item) => {
                  const canAsk = item.paymentStatus === "paid" && item.refund?.status !== "REFUND_COMPLETED";
                  return (
                    <li key={item.purchaseId} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{item.productName}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.categoryLabel} · 분석 대상: {profileLabels.get(item.profileId) ?? "등록된 프로필"}</p>
                          <p className="mt-2 text-sm text-slate-600">{dateLabel(item.purchasedAt)} · {item.amount.toLocaleString("ko-KR")} {item.currency}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">{paymentStatuses[item.paymentStatus]}</span>
                          {item.refund ? <span className="rounded-full border border-[#d8d3ff] bg-[#f3f1ff] px-2.5 py-1 text-xs font-semibold text-[#5e4bd1]">{refundStatuses[item.refund.status]}</span> : null}
                        </div>
                      </div>
                      {item.refund ? <p className="mt-2 text-xs leading-5 text-slate-600">{item.refund.customerMessage}</p> : null}
                      {canAsk ? (
                        <Link href={`/support?category=PAYMENT_REFUND&orderId=${encodeURIComponent(item.orderId)}`}
                          className="mt-3 inline-flex rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6f5ce7]">
                          환불·취소 문의 →
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-5 rounded-xl bg-[#f7f8fc] px-4 py-8 text-center">
                <p className="font-semibold text-slate-800">조건에 맞는 결제 내역이 없습니다.</p>
                <Link href="/mypage/payments" className="mt-3 inline-flex text-sm font-semibold text-[#5e4bd1] underline underline-offset-4">전체 결제 내역 보기</Link>
              </div>
            )}
            {history.totalPages > 1 ? (
              <nav aria-label="결제 내역 페이지 이동" className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {history.page > 1 ? (
                  <Link href={paymentHistoryHref(history.filters, history.page - 1) + "#payment-history-results"}
                    className="rounded-xl border border-[#cfd5e6] px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-[#f7f8fc]">이전 목록</Link>
                ) : null}
                <span className="text-sm font-semibold text-slate-700">{history.page} / {history.totalPages} 페이지</span>
                {history.page < history.totalPages ? (
                  <Link href={paymentHistoryHref(history.filters, history.page + 1) + "#payment-history-results"}
                    className="rounded-xl border border-[#cfd5e6] px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-[#f7f8fc]">다음 목록 보기</Link>
                ) : null}
              </nav>
            ) : null}
          </section>
        </div>
      </main>
    </AppShell>
  );
}
