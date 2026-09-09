"use client";

import { useState } from "react";

type CreditBundle = {
  id: "ai-consulting-3" | "ai-consulting-5" | "ai-consulting-10";
  questions: number;
  priceKrw: number;
  recommended?: boolean;
};

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      payment: (options: { customerKey: string }) => {
        requestPayment: (input: {
          method: "CARD";
          amount: { currency: "KRW"; value: number };
          orderId: string;
          orderName: string;
          successUrl: string;
          failUrl: string;
        }) => Promise<void>;
      };
    };
  }
}

function isCheckoutCompatibleTossClientKey(clientKey: string | undefined): clientKey is string {
  return typeof clientKey === "string" && /^(?:test|live)_ck_[A-Za-z0-9_-]+$/.test(clientKey);
}

export default function CreditCheckoutClient({
  customerKey,
  profileId,
  productId,
  edition,
  currentBalance,
  bundles,
  checkoutEnabled,
}: {
  customerKey: string;
  profileId: string;
  productId: string;
  edition: string;
  currentBalance: number;
  bundles: readonly CreditBundle[];
  checkoutEnabled: boolean;
}) {
  const [activeBundleId, setActiveBundleId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function startCheckout(bundle: CreditBundle) {
    if (activeBundleId || !checkoutEnabled) return;

    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!isCheckoutCompatibleTossClientKey(clientKey) || !window.TossPayments) {
      setErrorMessage("결제 기능이 아직 준비되지 않았습니다.");
      return;
    }

    setActiveBundleId(bundle.id);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/ai-consulting/credits/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          bundleId: bundle.id,
          productId,
          edition,
        }),
      });
      const payload = await response.json().catch(() => null) as {
        order?: { id: string; amount: number };
        error?: string;
      } | null;

      if (!response.ok || !payload?.order) {
        throw new Error(payload?.error ?? "AI 질문권 주문을 생성하지 못했습니다.");
      }

      const returnParams = new URLSearchParams({
        profileId,
        productId,
        edition,
        bundleId: bundle.id,
      }).toString();
      const toss = window.TossPayments(clientKey);

      await toss.payment({ customerKey }).requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: payload.order.amount },
        orderId: payload.order.id,
        orderName: `운보다 AI 질문권 ${bundle.questions}회`,
        successUrl: `${window.location.origin}/ai-consulting/credits/success?${returnParams}`,
        failUrl: `${window.location.origin}/ai-consulting/credits/fail?${returnParams}`,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "결제를 시작하지 못했습니다.");
      setActiveBundleId(null);
    }
  }

  return (
    <section className="mt-8">
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">PROFILE CREDIT</p>
            <h2 className="mt-2 text-xl font-bold text-stone-950">AI 질문권</h2>
          </div>
          <div className="rounded-2xl bg-stone-100 px-4 py-3 text-right">
            <p className="text-xs text-stone-500">현재 잔액</p>
            <p className="mt-1 text-lg font-bold text-stone-950">{currentBalance}회</p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-7 text-stone-600">
          질문권은 이 프로필에서 공통으로 사용합니다. 구매한 심층 분석의 상담 범위 안에서 정상 답변이 완료된 경우에만 1회 차감됩니다.
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {bundles.map((bundle) => (
          <article key={bundle.id} className="relative rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            {bundle.recommended ? (
              <span className="absolute right-4 top-4 rounded-full bg-stone-950 px-3 py-1 text-xs font-semibold text-white">추천</span>
            ) : null}
            <p className="text-sm font-semibold text-stone-500">AI 질문권</p>
            <h3 className="mt-2 text-2xl font-bold text-stone-950">{bundle.questions}회</h3>
            <p className="mt-4 text-lg font-semibold text-stone-900">{bundle.priceKrw.toLocaleString("ko-KR")}원</p>
            <button
              type="button"
              onClick={() => void startCheckout(bundle)}
              disabled={!checkoutEnabled || activeBundleId !== null}
              className="mt-6 w-full rounded-2xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {activeBundleId === bundle.id ? "결제 준비 중..." : checkoutEnabled ? "구매하기" : "결제 준비 중"}
            </button>
          </article>
        ))}
      </div>

      {!checkoutEnabled ? (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          현재 AI 질문권 결제는 준비 중입니다. 정식 결제 연결이 완료된 뒤 구매할 수 있습니다.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">{errorMessage}</p>
      ) : null}
    </section>
  );
}
