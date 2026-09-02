"use client";

import { FormEvent, useState } from "react";

type Customer = {
  account: { authUserId: string; email: string; emailVerified: boolean; lifecycleStatus: string | null; paidEligibilityStatus: string | null; closure: { finalizationStartedAt: string | null; finalizedAt: string | null; retryCount: number; nextRetryAt: string | null; ownerReviewRequired: boolean } | null };
  profiles: Array<{ id: string; label: string; relationshipLabel: string }>;
};

type Order = {
  order: { id: string; accountId: string; accountEmail: string; profile: { id: string; label: string } | null; productId: string; productLabel: string; analysisEditionKey: string | null; analysisEditionLabel: string; amount: number; status: string; createdAt: string; paidAt: string | null };
  payment: { providerStatus: string | null; reconciliationStatus: string | null; confirmedAt: string | null; retryCount: number | null; nextRetryAt: string | null; failureCode: string | null } | null;
  purchase: { id: string; purchasedAt: string; analysisEditionKey: string | null } | null;
  entitlement: { active: boolean; grantedAt: string; revokedAt: string | null; revocationReason: string | null; analysisEditionKey: string | null } | null;
  report: { status: "none" | "generating" | "completed" | "failed"; createdAt: string | null; updatedAt: string | null; completedAt: string | null; errorCode: string | null; analysisEditionKey: string | null };
  refund: { status: string; requestedAmount: number; providerStatus: string | null; requestedAt: string; completedAt: string | null; retryCount: number; nextRetryAt: string; ownerReviewRequired: boolean; failureCode: string | null } | null;
  accountClosure: { lifecycleStatus: string | null; finalizationStartedAt: string | null; finalizedAt: string | null; retryCount: number; nextRetryAt: string | null; ownerReviewRequired: boolean } | null;
};

const labels: Record<string, string> = {
  ACTIVE: "사용 중",
  DELETION_REQUESTED: "탈퇴 처리 중",
  CLOSED: "종료됨",
  UNVERIFIED: "성인 인증 전",
  VERIFIED_ADULT: "성인 인증 완료",
  REVOKED: "재확인 필요",
  pending: "결제 대기",
  paid: "결제 완료",
  generating: "생성 중",
  completed: "완료",
  failed: "실패",
  none: "준비 전",
  REFUND_PROCESSING: "환불 처리 중",
  REFUND_FAILED_RETRYING: "환불 재시도 중",
  REFUND_COMPLETED: "환불 완료",
  OWNER_REVIEW_REQUIRED: "수동 확인 필요",
};

function value(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return "없음";
  if (typeof value === "boolean") return value ? "예" : "아니오";
  return labels[value] ?? String(value);
}

function time(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString("ko-KR") : "없음";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0 border-t border-stone-100 py-3 first:border-t-0"><dt className="text-xs font-semibold text-stone-500">{label}</dt><dd className="mt-1 break-all text-sm font-medium text-stone-900">{children}</dd></div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border-y border-stone-200 py-5"><h2 className="text-base font-bold text-stone-900">{title}</h2><dl className="mt-3">{children}</dl></section>;
}

function errorMessage(status: number): string {
  if (status === 400) return "정확한 식별자를 입력해 주세요.";
  if (status === 403) return "운영자 권한이 필요합니다.";
  if (status === 404) return "일치하는 결과를 찾을 수 없습니다.";
  if (status === 503) return "조회 기록을 저장할 수 없어 결과를 표시하지 않았습니다.";
  return "조회 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

export default function AdminLookupConsole() {
  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<"customer" | "order" | null>(null);

  async function request<T>(url: string): Promise<T> {
    const response = await fetch(url, { method: "GET", credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error(errorMessage(response.status));
    return response.json() as Promise<T>;
  }

  async function lookupCustomer(event: FormEvent) {
    event.preventDefault();
    setLoading("customer"); setMessage(null); setCustomer(null);
    try {
      const result = await request<{ customer: Customer }>(`/api/internal/admin/customers?email=${encodeURIComponent(email.trim())}`);
      setCustomer(result.customer);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "조회 중 문제가 발생했습니다.");
    } finally { setLoading(null); }
  }

  async function lookupOrder(event: FormEvent) {
    event.preventDefault();
    setLoading("order"); setMessage(null); setOrder(null);
    try {
      const result = await request<{ order: Order }>(`/api/internal/admin/orders/${encodeURIComponent(orderId.trim())}`);
      setOrder(result.order);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "조회 중 문제가 발생했습니다.");
    } finally { setLoading(null); }
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-10 text-stone-900 sm:px-8 sm:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <header className="border-b border-stone-200 pb-6"><p className="text-xs font-semibold tracking-[0.2em] text-stone-500">CS CONSOLE</p><h1 className="mt-3 text-3xl font-bold">고객 지원 조회</h1><p className="mt-3 text-sm leading-6 text-stone-600">고객 지원 목적의 조회 전용 화면입니다. 조회 결과를 임의로 변경하지 마세요.</p></header>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <form onSubmit={lookupCustomer} className="border border-stone-200 bg-white p-5 shadow-sm"><label htmlFor="customer-email" className="text-sm font-bold">정확한 계정 이메일</label><p className="mt-1 text-xs leading-5 text-stone-500">전체 이메일 주소를 입력해 주세요.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><input id="customer-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="min-w-0 flex-1 border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-stone-900" required /><button type="submit" disabled={loading !== null} className="min-h-11 shrink-0 bg-stone-900 px-4 text-sm font-semibold text-white disabled:bg-stone-400">{loading === "customer" ? "조회 중" : "고객 조회"}</button></div></form>
          <form onSubmit={lookupOrder} className="border border-stone-200 bg-white p-5 shadow-sm"><label htmlFor="order-id" className="text-sm font-bold">내부 주문 ID</label><p className="mt-1 text-xs leading-5 text-stone-500">정확한 주문 UUID만 조회할 수 있습니다.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><input id="order-id" value={orderId} onChange={(event) => setOrderId(event.target.value)} className="min-w-0 flex-1 border border-stone-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-stone-900" required /><button type="submit" disabled={loading !== null} className="min-h-11 shrink-0 bg-stone-900 px-4 text-sm font-semibold text-white disabled:bg-stone-400">{loading === "order" ? "조회 중" : "주문 조회"}</button></div></form>
        </div>
        {message ? <p role="alert" className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}
        {customer ? <div className="mt-8 grid gap-6 lg:grid-cols-2"><Section title="계정"><Field label="이메일">{customer.account.email}</Field><Field label="이메일 인증">{value(customer.account.emailVerified)}</Field><Field label="계정 상태">{value(customer.account.lifecycleStatus)}</Field><Field label="유료 이용 자격">{value(customer.account.paidEligibilityStatus)}</Field><Field label="탈퇴 처리">{customer.account.closure?.ownerReviewRequired ? "수동 확인 필요" : time(customer.account.closure?.finalizationStartedAt)}</Field></Section><Section title="프로필"><Field label="등록 프로필">{customer.profiles.length === 0 ? "없음" : customer.profiles.map((profile) => <span key={profile.id} className="block">{profile.label} · {profile.relationshipLabel}</span>)}</Field></Section></div> : null}
        {order ? <div className="mt-8 grid gap-x-8 lg:grid-cols-2"><Section title="주문"><Field label="주문 ID">{order.order.id}</Field><Field label="고객">{order.order.accountEmail}</Field><Field label="상품">{order.order.productLabel}</Field><Field label="분석 회차">{order.order.analysisEditionLabel}</Field><Field label="금액">{order.order.amount.toLocaleString("ko-KR")} KRW</Field><Field label="상태">{value(order.order.status)}</Field><Field label="생성 시각">{time(order.order.createdAt)}</Field></Section><Section title="결제"><Field label="결제 상태">{value(order.payment?.providerStatus)}</Field><Field label="정산 상태">{value(order.payment?.reconciliationStatus)}</Field><Field label="확인 시각">{time(order.payment?.confirmedAt)}</Field><Field label="실패 코드">{value(order.payment?.failureCode)}</Field></Section><Section title="이용권"><Field label="상태">{order.entitlement?.active ? "활성" : "없음 또는 취소됨"}</Field><Field label="분석 회차">{order.entitlement?.analysisEditionKey ?? "없음"}</Field><Field label="취소 사유">{value(order.entitlement?.revocationReason)}</Field></Section><Section title="분석 생성"><Field label="상태">{value(order.report.status)}</Field><Field label="완료 시각">{time(order.report.completedAt)}</Field><Field label="실패 코드">{value(order.report.errorCode)}</Field></Section><Section title="환불"><Field label="상태">{value(order.refund?.status)}</Field><Field label="금액">{order.refund ? `${order.refund.requestedAmount.toLocaleString("ko-KR")} KRW` : "없음"}</Field><Field label="수동 확인">{value(order.refund?.ownerReviewRequired)}</Field></Section><Section title="계정 종료"><Field label="계정 상태">{value(order.accountClosure?.lifecycleStatus)}</Field><Field label="수동 확인">{value(order.accountClosure?.ownerReviewRequired)}</Field></Section></div> : null}
      </div>
    </main>
  );
}