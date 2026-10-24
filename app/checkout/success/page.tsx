"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
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

/**
 * Stage 1: an honest card-approval confirmation screen.
 * Never show report-generation progress until the server has confirmed
 * the Toss order, amount, purchase and entitlement. No artificial delay.
 */
function PaidReportPaymentConfirmation({ errorMessage }: { errorMessage?: string | null }) {
  const failed = Boolean(errorMessage);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fc] px-5 py-10 text-[#11162d] sm:px-8">
      <section
        aria-labelledby="paid-report-payment-heading"
        className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-[#dce1ef] bg-white shadow-[0_18px_55px_rgba(33,40,83,0.09)]"
      >
        <div className="bg-[linear-gradient(135deg,#111734,#282052)] px-7 py-5 text-white sm:px-9">
          <p className="text-xs font-black tracking-[0.16em] text-[#c9c3ff]">운보다 · 유료 리포트</p>
          <p className="mt-1 text-sm text-slate-200">카드 결제 확인</p>
        </div>
        <div className="px-7 py-9 text-center sm:px-9 sm:py-11" role={failed ? "alert" : "status"}>
          <div aria-hidden="true" className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f3f1ff] text-[#6f5ce7]">
            {failed ? (
              <span className="text-3xl font-bold">!</span>
            ) : (
              <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#d8d3ff] border-t-[#6f5ce7] motion-reduce:animate-none" />
            )}
          </div>
          <h1 id="paid-report-payment-heading" className="mt-6 text-xl font-black tracking-tight sm:text-2xl">
            {failed ? "결제 확인이 완료되지 않았어요" : "카드 결제를 확인하고 있어요"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {errorMessage ?? "카드 승인 내역과 주문 금액을 확인하고 있습니다. 확인되면 리포트 준비 화면으로 자동 이동합니다."}
          </p>
          {failed ? (
            <div className="mt-6 rounded-2xl bg-[#f7f8fc] px-4 py-4 text-sm leading-6 text-slate-600">
              결제 상태가 불확실하면 다시 결제하지 말고 구매 내역을 먼저 확인해 주세요.
              <p className="mt-3">
                <Link href="/mypage" className="font-bold text-[#5e4bd1] underline underline-offset-4">
                  결제 내역 확인하기
                </Link>
              </p>
            </div>
          ) : (
            <p className="mt-6 text-xs leading-6 text-slate-500">
              확인하는 동안 추가 결제를 진행하지 마세요.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

  return <PaidReportPaymentConfirmation errorMessage={errorMessage} />;
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<PaidReportPaymentConfirmation />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
