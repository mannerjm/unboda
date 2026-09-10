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

type FailureCategory = "PAYMENT_RECONCILIATION" | "REFUND_RETRY" | "REFUND_OWNER_REVIEW" | "REPORT_FAILED" | "REPORT_STALE" | "CLOSURE_RETRY" | "CLOSURE_OWNER_REVIEW";
type FailureItem = {
  referenceId: string;
  referenceType: "ORDER" | "REPORT" | "ACCOUNT";
  orderId: string | null;
  accountUserId: string | null;
  accountEmail: string | null;
  productLabel: string | null;
  editionLabel: string | null;
  status: string;
  retryCount: number | null;
  nextRetryAt: string | null;
  failureCode: string | null;
  updatedAt: string;
};

type FailureGuide = {
  priority: "자동 대기" | "대표 확인" | "상태에 따라 판단";
  check: string;
  action: string;
  why: string;
  never: string;
};

const failureLabels: Record<FailureCategory, string> = {
  PAYMENT_RECONCILIATION: "결제 확인 필요",
  REFUND_RETRY: "환불 재시도",
  REFUND_OWNER_REVIEW: "환불 수동 확인",
  REPORT_FAILED: "분석 생성 실패",
  REPORT_STALE: "분석 생성 지연",
  CLOSURE_RETRY: "계정 종료 재시도",
  CLOSURE_OWNER_REVIEW: "계정 종료 수동 확인",
};

const failureGuides: Record<FailureCategory, FailureGuide> = {
  PAYMENT_RECONCILIATION: {
    priority: "상태에 따라 판단",
    check: "연결 주문 상세에서 내부 주문·결제 상태·정산 상태·재시도 시각·실패 코드를 확인합니다.",
    action: "다음 재시도 시각이 있으면 기다립니다. terminal_mismatch 또는 재시도 시각이 없는 최종 실패면 Toss 관리자 기록의 주문번호·금액·통화·결제 상태와 대조한 뒤 개발 검토로 넘깁니다.",
    why: "결제가 실제로 됐는지 확실하지 않은 상태에서 이용권을 수동 제공하면 이중 제공 또는 환불 오류가 생길 수 있습니다.",
    never: "주문을 paid로 직접 변경하거나 이용권을 임의 생성하지 않습니다.",
  },
  REFUND_RETRY: {
    priority: "자동 대기",
    check: "연결 주문 상세에서 환불 상태·재시도 횟수·다음 재시도 시각·실패 코드를 확인합니다.",
    action: "다음 정기 자동 재시도까지 기다리고, 고객에게는 환불 처리 중이라고 안내합니다.",
    why: "이미 자동 취소가 진행 중인 주문을 사람이 다시 취소하면 중복 처리 가능성이 생깁니다.",
    never: "Toss에서 같은 주문을 별도로 다시 취소하거나 DB를 환불 완료로 바꾸지 않습니다.",
  },
  REFUND_OWNER_REVIEW: {
    priority: "대표 확인",
    check: "연결 주문 상세의 결제 금액·환불 요청 금액·결제사 상태·환불 상태·실패 코드를 확인하고 Toss 관리자 기록과 대조합니다.",
    action: "실제 결제사 취소 여부가 명확한지 확인합니다. 내부 기록과 결제사 기록이 다르거나 판단이 모호하면 증거를 보존한 채 개발 검토로 넘깁니다.",
    why: "금전 상태가 모호한 예외는 한쪽 기록만 보고 확정하면 고객 과금 또는 중복 환불 문제가 생길 수 있습니다.",
    never: "환불 완료 상태나 이용권 회수를 SQL로 직접 맞추지 않습니다.",
  },
  REPORT_FAILED: {
    priority: "대표 확인",
    check: "연결 주문 상세에서 결제 완료·정확한 분석 회차·활성 이용권·리포트 failed 상태를 함께 확인합니다.",
    action: "결제와 이용권이 정상이라면 고객에게 동일 구매의 유료 분석 화면을 다시 열도록 안내할 수 있습니다. 기존 failed 리포트는 같은 구매 단위에서 안전하게 재시도됩니다. 반복 실패하면 개발 검토로 넘깁니다.",
    why: "새 이용권이나 새 리포트를 만들지 않고 기존 구매 단위를 그대로 재사용해야 과거 구매 기준과 분석 회차가 유지됩니다.",
    never: "새 구매·새 이용권·새 리포트를 임의로 만들거나 내용을 수동 생성하지 않습니다.",
  },
  REPORT_STALE: {
    priority: "상태에 따라 판단",
    check: "연결 주문 상세에서 리포트가 여전히 generating인지, 결제와 이용권이 정상인지, 마지막 갱신 시각이 충분히 오래됐는지 확인합니다.",
    action: "이미 완료됐다면 종료합니다. 계속 지연 중이고 결제·이용권이 정상이라면 고객이 동일 분석 화면을 다시 열 때 기존 stale 작업을 재사용해 재시도할 수 있습니다. 계속 수렴하지 않으면 개발 검토로 넘깁니다.",
    why: "진행 중 작업과 새 작업을 따로 만들지 않아야 중복 생성과 잘못된 리포트 연결을 막을 수 있습니다.",
    never: "리포트 행을 삭제하거나 generating 상태를 직접 바꾸지 않습니다.",
  },
  CLOSURE_RETRY: {
    priority: "자동 대기",
    check: "연결 계정 상세에서 탈퇴 상태·재시도 횟수·다음 재시도 시각을 확인하고 미해결 결제·환불이 있는지 봅니다.",
    action: "정기 자동 종료 재시도까지 기다립니다. 금전 처리가 남아 있다면 그것이 먼저 수렴하도록 둡니다.",
    why: "금전 기록이 해결되기 전에 계정을 지우면 환불과 거래 증빙이 깨질 수 있습니다.",
    never: "Auth 사용자나 관련 데이터를 직접 삭제하지 않습니다.",
  },
  CLOSURE_OWNER_REVIEW: {
    priority: "대표 확인",
    check: "연결 계정 상세에서 탈퇴 상태와 안전한 실패 코드를 확인하고, 관련 결제·환불의 수동 확인 항목이 남아 있는지 먼저 확인합니다.",
    action: "금전 예외가 있으면 그것을 먼저 해결합니다. 금전 예외가 없는데도 수동 확인 상태가 계속되면 개발 검토로 넘깁니다.",
    why: "계정 종료는 결제·환불·보존 데이터와 연결되어 있어 안전한 순서가 필요합니다.",
    never: "Production에서 사용자를 직접 삭제하거나 연결 데이터를 SQL로 지우지 않습니다.",
  },
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
  reconciliation_required: "자동 정산 필요",
  reconciliation_failed: "정산 재시도 실패",
  terminal_mismatch: "최종 상태 불일치",
  generating: "생성 중",
  completed: "완료",
  failed: "실패",
  none: "준비 전",
  REFUND_PROCESSING: "환불 처리 중",
  REFUND_FAILED_RETRYING: "환불 재시도 중",
  REFUND_COMPLETED: "환불 완료",
  OWNER_REVIEW_REQUIRED: "수동 확인 필요",
};

const referenceLabels: Record<FailureItem["referenceType"], string> = {
  ORDER: "주문 ID",
  REPORT: "리포트 ID",
  ACCOUNT: "계정 ID",
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

function decisionForFailure(category: FailureCategory, item: FailureItem): string {
  switch (category) {
    case "PAYMENT_RECONCILIATION":
      if (item.status === "terminal_mismatch") return "지금은 대표 확인 단계입니다. 연결 주문을 열고 Toss 관리자 기록과 주문번호·금액·통화를 대조하세요.";
      if (item.nextRetryAt) return `지금은 자동 복구 대기입니다. ${time(item.nextRetryAt)} 이후 상태를 다시 확인하세요.`;
      return "자동 재시도 시각이 없습니다. 연결 주문을 열어 최종 실패 여부를 확인하고 개발 검토로 넘기세요.";
    case "REFUND_RETRY":
      return `자동 환불 재시도 중입니다. ${time(item.nextRetryAt)}까지 중복 취소하지 말고 기다리세요.`;
    case "REFUND_OWNER_REVIEW":
      return "대표 확인이 필요합니다. 연결 주문과 Toss 관리자 기록을 대조하고, 모순이 있으면 직접 상태를 바꾸지 말고 개발 검토로 넘기세요.";
    case "REPORT_FAILED":
      return "연결 주문에서 결제 완료와 활성 이용권을 확인하세요. 둘 다 정상이라면 고객이 동일 유료 분석 화면을 다시 열어 기존 구매 단위로 재시도할 수 있습니다.";
    case "REPORT_STALE":
      return "연결 주문에서 리포트가 아직 생성 중인지 확인하세요. 계속 지연 중이면 동일 분석 화면 재진입으로 stale 작업을 안전하게 재시도할 수 있습니다.";
    case "CLOSURE_RETRY":
      return `계정 종료 자동 재시도 중입니다. ${time(item.nextRetryAt)}까지 직접 삭제하지 말고 기다리세요.`;
    case "CLOSURE_OWNER_REVIEW":
      return "대표 확인이 필요합니다. 연결 계정의 미해결 결제·환불 예외를 먼저 확인하고, 없는데도 종료가 막히면 개발 검토로 넘기세요.";
  }
}

export default function AdminLookupConsole({
  initialFailureSummary,
}: {
  initialFailureSummary: Partial<Record<FailureCategory, number>> | null;
}) {
  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<"customer" | "order" | null>(null);
  const [failureSummary, setFailureSummary] = useState<Partial<Record<FailureCategory, number>> | null>(initialFailureSummary);
  const [failureQueue, setFailureQueue] = useState<FailureItem[] | null>(null);
  const [selectedFailure, setSelectedFailure] = useState<FailureCategory | null>(null);

  async function request<T>(url: string): Promise<T> {
    const response = await fetch(url, { method: "GET", credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error(errorMessage(response.status));
    return response.json() as Promise<T>;
  }

  async function fetchCustomer(exactEmail: string, reason?: string) {
    setLoading("customer");
    setMessage(null);
    setCustomer(null);
    try {
      const suffix = reason ? `&reason=${encodeURIComponent(reason)}` : "";
      const result = await request<{ customer: Customer }>(`/api/internal/admin/customers?email=${encodeURIComponent(exactEmail.trim())}${suffix}`);
      setCustomer(result.customer);
      setEmail(result.customer.account.email);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "조회 중 문제가 발생했습니다.");
    } finally {
      setLoading(null);
    }
  }

  async function fetchOrder(exactOrderId: string, reason?: string) {
    setLoading("order");
    setMessage(null);
    setOrder(null);
    try {
      const suffix = reason ? `?reason=${encodeURIComponent(reason)}` : "";
      const result = await request<{ order: Order }>(`/api/internal/admin/orders/${encodeURIComponent(exactOrderId.trim())}${suffix}`);
      setOrder(result.order);
      setOrderId(result.order.order.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "조회 중 문제가 발생했습니다.");
    } finally {
      setLoading(null);
    }
  }

  async function lookupCustomer(event: FormEvent) {
    event.preventDefault();
    await fetchCustomer(email);
  }

  async function lookupOrder(event: FormEvent) {
    event.preventDefault();
    await fetchOrder(orderId);
  }

  async function loadFailures(category?: FailureCategory) {
    setMessage(null);
    try {
      const result = await request<{ summary?: Partial<Record<FailureCategory, number>>; queue?: FailureItem[] }>(category ? `/api/internal/admin/failures?category=${category}` : "/api/internal/admin/failures");
      if (category) {
        setSelectedFailure(category);
        setFailureQueue(result.queue ?? []);
      } else {
        setFailureSummary(result.summary ?? {});
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "운영 현황을 조회하지 못했습니다.");
    }
  }

  return (
    <section className="mt-8" aria-labelledby="cs-console-heading">
      <header className="border-b border-stone-200 pb-6">
        <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">CS CONSOLE</p>
        <h2 id="cs-console-heading" className="mt-3 text-2xl font-bold">고객 지원 조회</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">고객 지원 목적의 조회 전용 화면입니다. 조회 결과를 임의로 변경하지 마세요.</p>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <form onSubmit={lookupCustomer} className="border border-stone-200 bg-white p-5 shadow-sm">
          <label htmlFor="customer-email" className="text-sm font-bold">정확한 계정 이메일</label>
          <p className="mt-1 text-xs leading-5 text-stone-500">전체 이메일 주소를 입력해 주세요.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input id="customer-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="min-w-0 flex-1 border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-stone-900" required />
            <button type="submit" disabled={loading !== null} className="min-h-11 shrink-0 bg-stone-900 px-4 text-sm font-semibold text-white disabled:bg-stone-400">{loading === "customer" ? "조회 중" : "고객 조회"}</button>
          </div>
        </form>
        <form onSubmit={lookupOrder} className="border border-stone-200 bg-white p-5 shadow-sm">
          <label htmlFor="order-id" className="text-sm font-bold">내부 주문 ID</label>
          <p className="mt-1 text-xs leading-5 text-stone-500">정확한 주문 UUID만 조회할 수 있습니다.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input id="order-id" value={orderId} onChange={(event) => setOrderId(event.target.value)} className="min-w-0 flex-1 border border-stone-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-stone-900" required />
            <button type="submit" disabled={loading !== null} className="min-h-11 shrink-0 bg-stone-900 px-4 text-sm font-semibold text-white disabled:bg-stone-400">{loading === "order" ? "조회 중" : "주문 조회"}</button>
          </div>
        </form>
      </div>

      <section className="mt-8 border-y border-stone-200 py-6" aria-labelledby="failure-summary-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">OPERATIONAL STATUS</p>
            <h3 id="failure-summary-heading" className="mt-2 text-xl font-bold">운영 확인 필요</h3>
          </div>
          <button type="button" onClick={() => void loadFailures()} className="min-h-11 border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700">현황 새로고침</button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(failureLabels) as FailureCategory[]).map((category) => (
            <button key={category} type="button" onClick={() => void loadFailures(category)} className="min-h-16 border border-stone-200 bg-white p-3 text-left">
              <span className="block text-xs font-semibold text-stone-500">{failureLabels[category]}</span>
              <span className="mt-1 block text-lg font-bold">{failureSummary ? failureSummary[category] ?? 0 : "-"}</span>
            </button>
          ))}
        </div>

        {selectedFailure && failureQueue ? (
          <div className="mt-6">
            <div className="border border-stone-200 bg-stone-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-bold">{failureLabels[selectedFailure]}</h4>
                <span className={`px-2 py-1 text-xs font-bold ${failureGuides[selectedFailure].priority === "대표 확인" ? "bg-red-100 text-red-800" : failureGuides[selectedFailure].priority === "자동 대기" ? "bg-amber-100 text-amber-800" : "bg-stone-200 text-stone-800"}`}>{failureGuides[selectedFailure].priority}</span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm leading-6 md:grid-cols-2">
                <div><dt className="text-xs font-semibold text-stone-500">먼저 확인</dt><dd className="mt-1 text-stone-800">{failureGuides[selectedFailure].check}</dd></div>
                <div><dt className="text-xs font-semibold text-stone-500">그다음 행동</dt><dd className="mt-1 text-stone-800">{failureGuides[selectedFailure].action}</dd></div>
                <div><dt className="text-xs font-semibold text-stone-500">왜</dt><dd className="mt-1 text-stone-800">{failureGuides[selectedFailure].why}</dd></div>
                <div><dt className="text-xs font-semibold text-red-600">절대 하지 않기</dt><dd className="mt-1 text-red-800">{failureGuides[selectedFailure].never}</dd></div>
              </dl>
            </div>

            {failureQueue.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">확인할 항목이 없습니다.</p>
            ) : (
              <ul className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
                {failureQueue.map((item) => (
                  <li key={`${selectedFailure}-${item.referenceId}`} className="py-4 text-sm">
                    <p className="text-xs font-semibold text-stone-500">{referenceLabels[item.referenceType]}</p>
                    <p className="mt-1 break-all font-mono text-xs text-stone-700">{item.referenceId}</p>
                    <p className="mt-2 font-semibold">{item.productLabel ?? "계정 종료"}{item.editionLabel ? ` · ${item.editionLabel}` : ""}</p>
                    <div className="mt-2 grid gap-1 text-xs leading-5 text-stone-600 sm:grid-cols-2">
                      <p>상태: {value(item.status)}</p>
                      <p>재시도: {item.retryCount ?? 0}회</p>
                      <p>다음 재시도: {time(item.nextRetryAt)}</p>
                      <p>마지막 갱신: {time(item.updatedAt)}</p>
                      <p className="sm:col-span-2">실패 코드: {item.failureCode ?? "안전한 실패 코드 없음"}</p>
                    </div>
                    <p className="mt-3 border-l-2 border-stone-400 pl-3 text-xs leading-6 text-stone-700">{decisionForFailure(selectedFailure, item)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.orderId ? (
                        <button type="button" disabled={loading !== null} onClick={() => void fetchOrder(item.orderId ?? "", `failure-queue:${selectedFailure}`)} className="min-h-10 border border-stone-900 bg-stone-900 px-3 text-xs font-semibold text-white disabled:bg-stone-400">연결 주문 상세 확인</button>
                      ) : null}
                      {item.accountEmail ? (
                        <button type="button" disabled={loading !== null} onClick={() => void fetchCustomer(item.accountEmail ?? "", `failure-queue:${selectedFailure}`)} className="min-h-10 border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-800 disabled:text-stone-400">연결 계정 상세 확인</button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </section>

      {message ? <p role="alert" className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}

      {customer ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Section title="계정">
            <Field label="이메일">{customer.account.email}</Field>
            <Field label="이메일 인증">{value(customer.account.emailVerified)}</Field>
            <Field label="계정 상태">{value(customer.account.lifecycleStatus)}</Field>
            <Field label="유료 이용 자격">{value(customer.account.paidEligibilityStatus)}</Field>
            <Field label="탈퇴 처리">{customer.account.closure?.ownerReviewRequired ? "수동 확인 필요" : time(customer.account.closure?.finalizationStartedAt)}</Field>
          </Section>
          <Section title="프로필">
            <Field label="등록 프로필">{customer.profiles.length === 0 ? "없음" : customer.profiles.map((profile) => <span key={profile.id} className="block">{profile.label} · {profile.relationshipLabel}</span>)}</Field>
          </Section>
        </div>
      ) : null}

      {order ? (
        <div className="mt-8 grid gap-x-8 lg:grid-cols-2">
          <Section title="주문">
            <Field label="주문 ID">{order.order.id}</Field>
            <Field label="고객">{order.order.accountEmail}</Field>
            <Field label="상품">{order.order.productLabel}</Field>
            <Field label="분석 회차">{order.order.analysisEditionLabel}</Field>
            <Field label="금액">{order.order.amount.toLocaleString("ko-KR")} KRW</Field>
            <Field label="상태">{value(order.order.status)}</Field>
            <Field label="생성 시각">{time(order.order.createdAt)}</Field>
          </Section>
          <Section title="결제">
            <Field label="결제 상태">{value(order.payment?.providerStatus)}</Field>
            <Field label="정산 상태">{value(order.payment?.reconciliationStatus)}</Field>
            <Field label="확인 시각">{time(order.payment?.confirmedAt)}</Field>
            <Field label="실패 코드">{value(order.payment?.failureCode)}</Field>
          </Section>
          <Section title="이용권">
            <Field label="상태">{order.entitlement?.active ? "활성" : "없음 또는 취소됨"}</Field>
            <Field label="분석 회차">{order.entitlement?.analysisEditionKey ?? "없음"}</Field>
            <Field label="취소 사유">{value(order.entitlement?.revocationReason)}</Field>
          </Section>
          <Section title="분석 생성">
            <Field label="상태">{value(order.report.status)}</Field>
            <Field label="완료 시각">{time(order.report.completedAt)}</Field>
            <Field label="실패 코드">{value(order.report.errorCode)}</Field>
          </Section>
          <Section title="환불">
            <Field label="상태">{value(order.refund?.status)}</Field>
            <Field label="금액">{order.refund ? `${order.refund.requestedAmount.toLocaleString("ko-KR")} KRW` : "없음"}</Field>
            <Field label="수동 확인">{value(order.refund?.ownerReviewRequired)}</Field>
          </Section>
          <Section title="계정 종료">
            <Field label="계정 상태">{value(order.accountClosure?.lifecycleStatus)}</Field>
            <Field label="수동 확인">{value(order.accountClosure?.ownerReviewRequired)}</Field>
          </Section>
        </div>
      ) : null}
    </section>
  );
}
