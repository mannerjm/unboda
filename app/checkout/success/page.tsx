"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import PaidReportPreparing from "@/app/components/PaidReportPreparing";
import {
  COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID,
  COMPATIBILITY_FAMILY_OTHER_SESSION_KEY,
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID,
  COMPATIBILITY_FAMILY_PARENT_CHILD_SESSION_KEY,
  COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID,
  COMPATIBILITY_FAMILY_SIBLING_SESSION_KEY,
  getCompatibilityPairReportPath,
  getCompatibilityPairSessionKey,
  isCompatibilityPairProductId,
} from "@/app/lib/specialAnalysisProducts";

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const productIdForLoading = searchParams.get("productId");
  const loadingKind =
    productIdForLoading && (
      isCompatibilityPairProductId(productIdForLoading)
      || productIdForLoading === COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID
      || productIdForLoading === COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID
      || productIdForLoading === COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID
    )
      ? "compatibility"
      : productIdForLoading
        ? "premium"
        : "generic";

  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amount = searchParams.get("amount");
    const productId = searchParams.get("productId");
    const profileId = searchParams.get("profileId");

    if (!paymentKey || !orderId || !amount || !productId || !profileId) {
      setErrorMessage("결제 확인 정보가 부족합니다.");
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

        if (isCompatibilityPairProductId(productId)) {
          window.sessionStorage.removeItem(getCompatibilityPairSessionKey(productId));
          router.replace(`${getCompatibilityPairReportPath(productId)}?profileId=${encodeURIComponent(profileId)}${editionQuery}`);
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
          router.replace(`/paid-analysis/${encodeURIComponent(productId)}/report?profileId=${encodeURIComponent(profileId)}${editionQuery}`);
        }
        router.refresh();
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : "결제를 완료하지 못했습니다.");
      });
  }, [router, searchParams]);

  if (errorMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fc] px-6 text-stone-900">
        <section className="max-w-md text-center">
          <h1 className="text-2xl font-bold">결제를 확인하지 못했습니다.</h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">{errorMessage}</p>
          <p className="mt-2 text-sm leading-7 text-stone-600">추가 결제를 시도하지 말고 구매 내역에서 주문 상태를 확인해 주세요.</p>
        </section>
      </main>
    );
  }

  return <PaidReportPreparing kind={loadingKind} stage="confirming" />;
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<PaidReportPreparing kind="generic" stage="confirming" />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
