"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("결제를 확인하고 있습니다.");

  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amount = searchParams.get("amount");
    const productId = searchParams.get("productId");
    const profileId = searchParams.get("profileId");

    if (!paymentKey || !orderId || !amount || !productId || !profileId) {
      setMessage("결제 확인 정보가 부족합니다.");
      return;
    }

    fetch(`/api/orders/${encodeURIComponent(orderId)}/confirm-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey, amount }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;

        if (!response.ok) {
          throw new Error(payload?.message ?? payload?.error ?? "결제 확인에 실패했습니다.");
        }

        router.replace(`/paid-analysis/${encodeURIComponent(productId)}?profileId=${encodeURIComponent(profileId)}`);
        router.refresh();
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "결제를 완료하지 못했습니다.");
      });
  }, [router, searchParams]);

  return <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] px-6 text-stone-900"><p>{message}</p></main>;
}

export default function CheckoutSuccessPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] px-6 text-stone-900"><p>결제를 확인하고 있습니다.</p></main>}><CheckoutSuccessContent /></Suspense>;
}