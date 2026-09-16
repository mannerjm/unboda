"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID,
  COMPATIBILITY_FAMILY_OTHER_SESSION_KEY,
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID,
  COMPATIBILITY_FAMILY_PARENT_CHILD_SESSION_KEY,
  COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID,
  COMPATIBILITY_FAMILY_SIBLING_SESSION_KEY,
  COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  COMPATIBILITY_ROMANTIC_SESSION_KEY,
} from "@/app/lib/specialAnalysisProducts";

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
        const payload = await response.json().catch(() => null) as {
          error?: string;
          message?: string;
          purchase?: { analysisEditionKey?: string | null };
        } | null;

        if (!response.ok) {
          throw new Error(payload?.message ?? payload?.error ?? "결제 확인에 실패했습니다.");
        }

        const edition = payload?.purchase?.analysisEditionKey;
        const editionQuery = edition ? `&edition=${encodeURIComponent(edition)}` : "";

        if (productId === COMPATIBILITY_ROMANTIC_PRODUCT_ID) {
          window.sessionStorage.removeItem(COMPATIBILITY_ROMANTIC_SESSION_KEY);
          router.replace(`/special-analysis/compatibility/report?profileId=${encodeURIComponent(profileId)}${editionQuery}`);
        } else if (productId === COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID) {
          window.sessionStorage.removeItem(COMPATIBILITY_FAMILY_PARENT_CHILD_SESSION_KEY);
          router.replace(`/special-analysis/compatibility/family/parent-child/report?profileId=${encodeURIComponent(profileId)}${editionQuery}`);
        } else if (productId === COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID) {
          window.sessionStorage.removeItem(COMPATIBILITY_FAMILY_SIBLING_SESSION_KEY);
          router.replace(`/special-analysis/compatibility/family/siblings/report?profileId=${encodeURIComponent(profileId)}${editionQuery}`);
        } else if (productId === COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID) {
          window.sessionStorage.removeItem(COMPATIBILITY_FAMILY_OTHER_SESSION_KEY);
          router.replace(`/special-analysis/compatibility/family/other/report?profileId=${encodeURIComponent(profileId)}${editionQuery}`);
        } else {
          router.replace(`/paid-analysis/${encodeURIComponent(productId)}?profileId=${encodeURIComponent(profileId)}`);
        }
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
