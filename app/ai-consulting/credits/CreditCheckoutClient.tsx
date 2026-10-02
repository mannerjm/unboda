"use client";
import { getTossCheckoutClientKey } from "@/app/lib/toss/checkoutClient";

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

const BUNDLE_GUIDANCE: Record<CreditBundle["id"], { title: string; description: string }> = {
  "ai-consulting-3": {
    title: "가볍게 이어보기",
    description: "리포트를 읽고 궁금한 점 몇 가지만 더 물어볼 때",
  },
  "ai-consulting-5": {
    title: "충분히 이어보기",
    description: "한 고민을 여러 질문으로 이어서 충분히 상담하고 싶을 때",
  },
  "ai-consulting-10": {
    title: "오래 이어보기",
    description: "여러 보유 분석을 오가며 계속 상담하고 싶을 때",
  },
};

function formatPerQuestionPrice(bundle: CreditBundle): string {
  return `1회 약 ${Math.round(bundle.priceKrw / bundle.questions).toLocaleString("ko-KR")}원`;
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
  reviewCheckout = false,
}: {
  customerKey: string;
  profileId: string;
  productId: string;
  edition: string;
  currentBalance: number;
  bundles: readonly CreditBundle[];
  checkoutEnabled: boolean;
  reviewCheckout?: boolean;
}) {
  const [activeBundleId, setActiveBundleId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function startCheckout(bundle: CreditBundle) {
    if (activeBundleId || !checkoutEnabled) return;

    if (!window.TossPayments) {
      setErrorMessage("결제 기능이 아직 준비되지 않았습니다.");
      return;
    }

    setActiveBundleId(bundle.id);
    setErrorMessage(null);

    try {
      const { clientKey } = await getTossCheckoutClientKey();
      if (!isCheckoutCompatibleTossClientKey(clientKey)) throw new Error("토스 결제 키를 확인하지 못했습니다.");
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
    <section id="question-bundles" aria-labelledby="question-bundles-heading" className="mt-4 scroll-mt-5">
      <div className="flex flex-col gap-2 rounded-[1.5rem] border border-[#d8d3ff] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black tracking-[0.1em] text-[#6f5ce7]">01 · 원하는 횟수 선택</p>
          <h2 id="question-bundles-heading" className="mt-1 text-xl font-black text-[#11162d]">
            내게 맞는 질문 횟수를 골라보세요
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">질문권은 현재 프로필에서 보유한 분석의 AI 상담에 함께 사용할 수 있어요.</p>
        </div>
        <p className="self-start rounded-full bg-[#f3f1ff] px-4 py-2 text-sm font-bold text-[#5e4bd1] sm:self-center">
          현재 {currentBalance}회 남음
        </p>
      </div>

      {!checkoutEnabled ? (
        <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">
          현재 이 계정에서는 질문권 결제가 준비 중입니다. 상품 구성과 가격은 확인할 수 있지만 결제는 진행할 수 없습니다.
        </p>
      ) : reviewCheckout ? (
        <p role="status" className="mt-3 rounded-xl border border-[#cbd5f5] bg-[#f3f1ff] px-4 py-3 text-sm font-semibold leading-6 text-[#40359a]">
          토스 심사용 테스트 결제입니다. 실제 돈은 출금되지 않으며, 결제가 완료되면 이 테스트 프로필에 질문권이 충전됩니다.
        </p>
      ) : null}

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {bundles.map((bundle) => (
          <article key={bundle.id} className={`relative rounded-[1.5rem] border bg-white p-5 shadow-sm ${bundle.recommended ? "border-[#9283f5] ring-1 ring-[#d8d3ff]" : "border-[#dce1ef]"}`}>
            {bundle.recommended ? (
              <span className="absolute right-4 top-4 rounded-full bg-[#6f5ce7] px-3 py-1 text-xs font-semibold text-white">추천</span>
            ) : null}
            <p className="text-sm font-semibold text-slate-500">{BUNDLE_GUIDANCE[bundle.id].title}</p>
            <h3 className="mt-2 text-2xl font-bold text-[#11162d]">{bundle.questions}회</h3>
            <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{BUNDLE_GUIDANCE[bundle.id].description}</p>
            <div className="mt-4 flex items-end justify-between gap-3">
              <p className="text-lg font-semibold text-[#11162d]">{bundle.priceKrw.toLocaleString("ko-KR")}원</p>
              <p className="text-xs font-semibold text-slate-500">{formatPerQuestionPrice(bundle)}</p>
            </div>
            <button
              type="button"
              onClick={() => void startCheckout(bundle)}
              disabled={!checkoutEnabled || activeBundleId !== null}
              className="mt-5 w-full rounded-2xl bg-[#6f5ce7] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#5f4fd2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6f5ce7] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {activeBundleId === bundle.id ? "결제 준비 중..." : checkoutEnabled ? `${bundle.questions}회 구매하기 →` : "결제 준비 중"}
            </button>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-[#f7f8fc] px-4 py-4 text-sm leading-6 text-slate-600">
        <p><strong className="font-semibold text-slate-800">정상 AI 답변 1회 = 질문권 1회</strong>가 차감됩니다.</p>
        <p className="mt-1">사용하지 않은 질문권은 현재 프로필에 남아 다음 상담에서도 사용할 수 있어요. 범위를 벗어난 질문이나 답변 생성 실패에는 차감되지 않습니다.</p>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">{errorMessage}</p>
      ) : null}
    </section>
  );
}
