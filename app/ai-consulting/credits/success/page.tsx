"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function PaymentConfirmationStatus({
  errorMessage,
  consultationHref,
}: {
  errorMessage?: string | null;
  consultationHref?: string;
}) {
  const isError = Boolean(errorMessage);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fc] px-5 py-10 text-[#11162d] sm:px-8">
      <section
        aria-labelledby="credit-payment-heading"
        className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-[#dce1ef] bg-white shadow-[0_18px_55px_rgba(33,40,83,0.09)]"
      >
        <div className="bg-[linear-gradient(135deg,#111734,#282052)] px-7 py-5 text-white sm:px-9">
          <p className="text-xs font-black tracking-[0.16em] text-[#c9c3ff]">운보다 · AI 상담</p>
          <p className="mt-1 text-sm text-slate-200">질문권 결제 확인</p>
        </div>

        <div className="px-7 py-9 text-center sm:px-9 sm:py-11" role={isError ? "alert" : "status"}>
          <div
            aria-hidden="true"
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f3f1ff] text-[#6f5ce7]"
          >
            {isError ? (
              <span className="text-3xl font-bold">!</span>
            ) : (
              <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#d8d3ff] border-t-[#6f5ce7] motion-reduce:animate-none" />
            )}
          </div>
          <h1 id="credit-payment-heading" className="mt-6 text-xl font-black tracking-tight sm:text-2xl">
            {isError ? "질문권 결제 확인이 완료되지 않았어요" : "AI 질문권 결제를 확인하고 있어요"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {errorMessage ?? "결제 승인과 질문권 반영을 확인한 뒤 AI 상담으로 자동 이동합니다."}
          </p>

          {isError ? (
            <div className="mt-6 rounded-2xl bg-[#f7f8fc] px-4 py-4 text-sm leading-6 text-slate-600">
              결제 상태가 불확실하면 다시 결제하지 말고 구매 내역을 먼저 확인해 주세요.
              {consultationHref ? (
                <p className="mt-3">
                  <Link href={consultationHref} className="font-bold text-[#5e4bd1] underline underline-offset-4">
                    AI 상담으로 돌아가기
                  </Link>
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-6 text-xs leading-6 text-slate-500">
              기존 상담 내용과 작성 중인 질문은 그대로 유지됩니다.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

function AiCreditCheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amount = searchParams.get("amount");
    const profileId = searchParams.get("profileId");
    const productId = searchParams.get("productId");
    const edition = searchParams.get("edition");

    if (!paymentKey || !orderId || !amount || !profileId || !productId || !edition) {
      setErrorMessage("결제 확인 정보가 부족합니다.");
      return;
    }

    const consultationHref = `/ai-consulting?${new URLSearchParams({ profileId, productId, edition }).toString()}`;

    fetch(`/api/ai-consulting/credits/orders/${encodeURIComponent(orderId)}/confirm-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey, amount }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.message ?? payload?.error ?? "AI 질문권 결제 확인에 실패했습니다.");
        }
        // Credit finalization finishes server-side before this API responds.
        // Return directly to the same consultation, without an intermediate success button.
        router.replace(consultationHref);
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : "AI 질문권 결제를 완료하지 못했습니다.");
      });
  }, [router, searchParams]);

  const profileId = searchParams.get("profileId");
  const productId = searchParams.get("productId");
  const edition = searchParams.get("edition");
  const consultationHref = profileId && productId && edition
    ? `/ai-consulting?${new URLSearchParams({ profileId, productId, edition }).toString()}`
    : undefined;

  return <PaymentConfirmationStatus errorMessage={errorMessage} consultationHref={consultationHref} />;
}

export default function AiCreditCheckoutSuccessPage() {
  return (
    <Suspense fallback={<PaymentConfirmationStatus />}>
      <AiCreditCheckoutSuccessContent />
    </Suspense>
  );
}
