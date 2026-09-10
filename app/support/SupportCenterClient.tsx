"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_REQUEST_CATEGORIES,
  SUPPORT_STATUS_LABELS,
  type SupportRequestCategory,
  type SupportRequestDto,
} from "@/app/lib/support/types";

type Guide = {
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  needsOrderId?: boolean;
};

const guides: Record<SupportRequestCategory, Guide> = {
  PAYMENT_REFUND: {
    title: "결제·환불",
    description: "결제·환불 상태는 마이페이지의 실제 주문 기록이 기준입니다. 처리 중이면 중복 요청하지 말고 현재 상태를 먼저 확인하세요.",
    actionLabel: "마이페이지 결제 이력 확인",
    href: "/mypage",
    needsOrderId: true,
  },
  PAID_ANALYSIS: {
    title: "유료 분석 결과",
    description: "구매 권한이 정상인데 생성만 실패했다면 같은 구매 분석을 다시 열어 기존 리포트 경계에서 안전하게 재시도할 수 있습니다.",
    actionLabel: "구매한 분석 확인",
    href: "/purchased-analyses",
    needsOrderId: true,
  },
  ACCOUNT_ACCESS: {
    title: "로그인·비밀번호",
    description: "비밀번호 문제는 먼저 재설정 이메일을 요청하세요. 이메일 확인과 비밀번호 재설정은 자동 복구 경로입니다.",
    actionLabel: "비밀번호 재설정",
    href: "/auth/forgot-password?returnTo=/support",
  },
  PROFILE_DATA: {
    title: "프로필·사주 정보",
    description: "출생 정보와 분석 대상은 마이페이지에서 직접 관리합니다. 기존 유료 구매 이력은 구매 당시 입력 스냅샷과 연결되어 보존됩니다.",
    actionLabel: "마이페이지에서 확인",
    href: "/mypage",
  },
  PRIVACY_ACCOUNT: {
    title: "개인정보·계정 종료",
    description: "계정 상태와 탈퇴 요청은 계정 설정에서 먼저 확인하세요. 자동 처리할 수 없는 예외만 문의로 남겨 주세요.",
    actionLabel: "계정 설정 확인",
    href: "/account",
  },
  OTHER: {
    title: "기타 문의",
    description: "위 자동 해결 경로에 해당하지 않는 문제만 문의로 남겨 주세요.",
    actionLabel: "마이페이지 확인",
    href: "/mypage",
  },
};

function time(value: string): string {
  return new Date(value).toLocaleString("ko-KR");
}

export default function SupportCenterClient({
  isAuthenticated,
  initialRequests,
}: {
  isAuthenticated: boolean;
  initialRequests: SupportRequestDto[];
}) {
  const [category, setCategory] = useState<SupportRequestCategory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");
  const [requests, setRequests] = useState(initialRequests);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedGuide = useMemo(() => category ? guides[category] : null, [category]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!category || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/support/requests", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message, orderId: orderId.trim() || null }),
      });
      const body = await response.json().catch(() => null) as { request?: SupportRequestDto; error?: string } | null;
      if (!response.ok || !body?.request) throw new Error(body?.error ?? "문의를 접수하지 못했습니다.");
      setRequests((current) => [body.request!, ...current]);
      setMessage("");
      setOrderId("");
      setShowForm(false);
      setFeedback("문의가 접수되었습니다. 답변은 이 고객지원 센터에서 확인할 수 있습니다.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "문의를 접수하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-10 text-stone-900 sm:px-8 sm:py-14">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm font-semibold text-stone-600 underline underline-offset-4">← 운보다 홈</Link>
          <div className="flex gap-3 text-sm">
            <Link href="/terms" className="text-stone-500 underline underline-offset-4">이용약관</Link>
            <Link href="/privacy" className="text-stone-500 underline underline-offset-4">개인정보처리방침</Link>
            <Link href="/refund" className="text-stone-500 underline underline-offset-4">환불정책</Link>
          </div>
        </div>

        <header className="mt-8 border-b border-stone-200 pb-7">
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">SUPPORT CENTER</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">고객지원 센터</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">반복되는 문제는 먼저 자동 해결 경로로 안내합니다. 그래도 해결되지 않는 경우에만 문의를 접수해 대표가 필요한 예외만 확인하도록 운영합니다.</p>
        </header>

        <section className="mt-7">
          <h2 className="text-xl font-bold">무엇이 필요하신가요?</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SUPPORT_REQUEST_CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => { setCategory(item); setShowForm(item === "OTHER"); setFeedback(null); }}
                className={`min-h-24 rounded-xl border p-4 text-left transition ${category === item ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white hover:border-stone-400"}`}
              >
                <span className="text-sm font-bold">{SUPPORT_CATEGORY_LABELS[item]}</span>
                <span className={`mt-2 block text-xs leading-5 ${category === item ? "text-stone-200" : "text-stone-500"}`}>{guides[item].description}</span>
              </button>
            ))}
          </div>
        </section>

        {selectedGuide ? (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-semibold text-amber-700">먼저 자동 해결을 확인해 주세요</p>
            <h2 className="mt-2 text-lg font-bold">{selectedGuide.title}</h2>
            <p className="mt-2 text-sm leading-7 text-stone-700">{selectedGuide.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={selectedGuide.href} className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white">{selectedGuide.actionLabel}</Link>
              {category !== "OTHER" ? (
                <button type="button" onClick={() => setShowForm(true)} className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700">안내대로 했지만 해결되지 않았어요</button>
              ) : null}
            </div>
          </section>
        ) : null}

        {showForm && category ? (
          <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            {!isAuthenticated ? (
              <div>
                <h2 className="text-lg font-bold">문의 접수는 로그인 후 가능합니다</h2>
                <p className="mt-2 text-sm leading-7 text-stone-600">계정과 주문을 안전하게 확인하기 위해 회원 문의는 로그인된 계정 기준으로 접수합니다. 로그인 문제가 있다면 먼저 비밀번호 재설정을 이용해 주세요.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/auth/login?returnTo=/support" className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white">로그인</Link>
                  <Link href="/auth/forgot-password?returnTo=/support" className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700">비밀번호 재설정</Link>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">해결되지 않은 문제 접수</h2>
                  <p className="mt-2 text-xs leading-6 text-stone-500">비밀번호, 카드번호, 결제키, 주민등록번호, 사주 원문이나 상담 전체 내용 같은 불필요한 민감정보는 적지 마세요. 운영자는 필요한 주문·계정 상태만 별도로 확인합니다.</p>
                </div>
                {selectedGuide?.needsOrderId ? (
                  <label className="block text-sm font-semibold">주문 ID <span className="font-normal text-stone-400">(알고 있는 경우)</span>
                    <input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="마이페이지에 표시된 주문 UUID" className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-mono text-sm" />
                  </label>
                ) : null}
                <label className="block text-sm font-semibold">문제 상황
                  <textarea value={message} onChange={(event) => setMessage(event.target.value)} minLength={20} maxLength={1200} required rows={6} className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm leading-6" placeholder="자동 안내를 따라 해본 뒤에도 남아 있는 문제와 화면에 표시된 안전한 상태 문구를 적어 주세요." />
                </label>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-stone-400">{message.length}/1200 · 진행 중 문의는 최대 3건</span>
                  <button type="submit" disabled={submitting} className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-stone-400">{submitting ? "접수 중..." : "문의 접수"}</button>
                </div>
              </form>
            )}
          </section>
        ) : null}

        {feedback ? <p role="status" className="mt-5 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">{feedback}</p> : null}

        {isAuthenticated ? (
          <section className="mt-10 border-t border-stone-200 pt-7">
            <div className="flex items-end justify-between gap-3">
              <div><p className="text-xs font-semibold tracking-[0.2em] text-stone-500">MY REQUESTS</p><h2 className="mt-2 text-xl font-bold">내 문의</h2></div>
              <button type="button" onClick={() => window.location.reload()} className="text-sm font-semibold text-stone-600 underline underline-offset-4">새로고침</button>
            </div>
            {requests.length === 0 ? <p className="mt-4 text-sm text-stone-500">접수된 문의가 없습니다.</p> : (
              <div className="mt-4 space-y-3">
                {requests.map((request) => (
                  <article key={request.id} className="rounded-xl border border-stone-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold">{SUPPORT_CATEGORY_LABELS[request.category]}</p>
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">{SUPPORT_STATUS_LABELS[request.status]}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-700">{request.message}</p>
                    <p className="mt-3 text-xs text-stone-400">접수 {time(request.createdAt)}</p>
                    {request.operatorResponse ? (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-xs font-semibold text-emerald-700">운보다 답변</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-800">{request.operatorResponse}</p>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}