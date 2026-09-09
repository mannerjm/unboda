"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function AiCreditCheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("AI 질문권 결제를 확인하고 있습니다.");

  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amount = searchParams.get("amount");
    const profileId = searchParams.get("profileId");
    const productId = searchParams.get("productId");
    const edition = searchParams.get("edition");

    if (!paymentKey || !orderId || !amount || !profileId || !productId || !edition) {
      setMessage("결제 확인 정보가 부족합니다.");
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
        router.replace(consultationHref);
        router.refresh();
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "AI 질문권 결제를 완료하지 못했습니다.");
      });
  }, [router, searchParams]);

  const profileId = searchParams.get("profileId");
  const productId = searchParams.get("productId");
  const edition = searchParams.get("edition");
  const fallbackHref = profileId && productId && edition
    ? `/ai-consulting?${new URLSearchParams({ profileId, productId, edition }).toString()}`
    : "/";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f2e8] px-6 text-stone-900">
      <section className="w-full max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-sm">
        <p>{message}</p>
        {message !== "AI 질문권 결제를 확인하고 있습니다." ? (
          <Link href={fallbackHref} className="mt-5 inline-flex text-sm font-semibold underline underline-offset-4">
            AI 상담으로 돌아가기
          </Link>
        ) : null}
      </section>
    </main>
  );
}

export default function AiCreditCheckoutSuccessPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#f7f2e8] px-6"><p>AI 질문권 결제를 확인하고 있습니다.</p></main>}>
      <AiCreditCheckoutSuccessContent />
    </Suspense>
  );
}
