"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  guestAuthState,
  type AuthState,
} from "@/app/lib/auth";
import type { AccountLifecycleStatus, PaidEligibilityStatus } from "@/app/lib/accounts/server";
import { createClient } from "@/app/lib/supabase/client";
import { getCanonicalPremiumProductId } from "@/app/lib/premiumProductRegistry";
import NiceAdultVerificationButton from "@/app/account/NiceAdultVerificationButton";
import {
  COMPATIBILITY_ROMANTIC_SESSION_KEY,
  getSpecialAnalysisProduct,
  isCompatibilityRomanticProductId,
} from "@/app/lib/specialAnalysisProducts";

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

type CheckoutAccessPanelProps = {
  productId: string;
  profileId?: string;
  productTitle: string;
  profileLabel?: string;
  priceLabel: string;
  editionLabel?: string;
};

type AccountStatusResponse = {
  emailVerified: boolean;
  account: {
    status: AccountLifecycleStatus;
    paidEligibilityStatus: PaidEligibilityStatus;
  };
};

function isCheckoutCompatibleTossClientKey(clientKey: string | undefined): clientKey is string {
  return typeof clientKey === "string" && /^(?:test|live)_ck_[A-Za-z0-9_-]+$/.test(clientKey);
}

export default function CheckoutAccessPanel({
  productId,
  profileId,
  productTitle,
  profileLabel,
  priceLabel,
  editionLabel,
}: CheckoutAccessPanelProps) {
  const [authState, setAuthState] = useState<AuthState>(guestAuthState);
  const [accountStatus, setAccountStatus] = useState<AccountStatusResponse | null>(null);
  const [accountStatusLoading, setAccountStatusLoading] = useState(true);
  const [compatibilityPartner, setCompatibilityPartner] = useState<unknown>(null);
  const [compatibilityPayloadChecked, setCompatibilityPayloadChecked] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [immediateGenerationAcknowledged, setImmediateGenerationAcknowledged] = useState(false);
  const acknowledgementRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const specialProduct = getSpecialAnalysisProduct(productId);
  const canonicalProductId = specialProduct?.id ?? getCanonicalPremiumProductId(productId);
  const isCompatibility = isCompatibilityRomanticProductId(canonicalProductId);

  useEffect(() => {
    if (isCompatibility) {
      try {
        const stored = window.sessionStorage.getItem(COMPATIBILITY_ROMANTIC_SESSION_KEY);
        setCompatibilityPartner(stored ? JSON.parse(stored) : null);
      } catch {
        setCompatibilityPartner(null);
      } finally {
        setCompatibilityPayloadChecked(true);
      }
    } else {
      setCompatibilityPayloadChecked(true);
    }
  }, [isCompatibility]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (cancelled) return;
      if (!user) {
        setAccountStatusLoading(false);
        return;
      }

      setAuthState({
        status: "authenticated",
        user: {
          id: user.id,
          email: user.email ?? "",
          name: "",
          accessLevel: "free_member",
        },
      });

      try {
        const response = await fetch("/api/account/status", { cache: "no-store" });
        const payload = await response.json().catch(() => null) as AccountStatusResponse | null;
        if (!cancelled && response.ok && payload) {
          setAccountStatus(payload);
        }
      } finally {
        if (!cancelled) setAccountStatusLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePayment() {
    if (authState.status !== "authenticated" || !profileId || isPaying) return;
    if (!accountStatus || !accountStatus.emailVerified || accountStatus.account.paidEligibilityStatus !== "VERIFIED_ADULT") {
      setErrorMessage("결제 전에 계정 인증을 완료해 주세요.");
      return;
    }
    if (isCompatibility && !compatibilityPartner) {
      setErrorMessage("궁합 분석에 필요한 상대방 정보를 다시 입력해 주세요.");
      return;
    }
    if (!immediateGenerationAcknowledged) {
      setErrorMessage("개인화 분석 생성 안내를 확인해 주세요.");
      acknowledgementRef.current?.focus();
      return;
    }

    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!isCheckoutCompatibleTossClientKey(clientKey) || !window.TossPayments) {
      setErrorMessage("결제 기능이 아직 준비되지 않았습니다.");
      return;
    }

    setIsPaying(true);
    setErrorMessage(null);

    try {
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: canonicalProductId,
          profileId,
          immediateGenerationAcknowledged: true,
          ...(isCompatibility ? { compatibilityPartner } : {}),
        }),
      });

      if (!orderResponse.ok) {
        const body = await orderResponse.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? `주문 생성에 실패했습니다. (${orderResponse.status})`);
      }

      const { order } = (await orderResponse.json()) as { order: { id: string; amount: number } };
      const toss = window.TossPayments(clientKey);
      await toss.payment({ customerKey: authState.user.id }).requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: order.amount },
        orderId: order.id,
        orderName: productTitle,
        successUrl: `${window.location.origin}/checkout/success?productId=${encodeURIComponent(canonicalProductId)}&profileId=${encodeURIComponent(profileId)}`,
        failUrl: `${window.location.origin}/checkout/fail?productId=${encodeURIComponent(canonicalProductId)}&profileId=${encodeURIComponent(profileId)}`,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "결제를 완료하지 못했습니다.");
      setIsPaying(false);
    }
  }

  const returnTo = `/checkout/${productId}${profileId ? `?profileId=${profileId}` : ""}`;

  return (
    <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
      {authState.status === "guest" ? (
        <>
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">ACCOUNT REQUIRED</p>
          <h2 className="mt-3 text-2xl font-bold text-stone-900">구매한 분석을 보관하려면 계정 연결이 필요합니다</h2>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            상품 설명과 가격은 누구나 볼 수 있습니다. 결제와 구매 결과 보관을 위해서만 계정 연결이 필요합니다.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link href={`/auth/login?returnTo=${encodeURIComponent(returnTo)}`} className="rounded-2xl bg-stone-900 px-5 py-4 text-center font-semibold text-white transition hover:bg-stone-800">로그인</Link>
            <Link href={`/auth/signup?returnTo=${encodeURIComponent(returnTo)}`} className="rounded-2xl border border-stone-300 bg-white px-5 py-4 text-center font-semibold text-stone-900 transition hover:bg-stone-50">회원가입</Link>
          </div>
        </>
      ) : accountStatusLoading ? (
        <div className="py-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">PURCHASE CHECK</p>
          <h2 className="mt-3 text-2xl font-bold text-stone-900">결제 가능 상태를 확인하고 있습니다</h2>
        </div>
      ) : !accountStatus ? (
        <>
          <h2 className="text-2xl font-bold text-stone-900">계정 상태를 확인하지 못했습니다</h2>
          <p className="mt-4 text-sm leading-7 text-stone-600">잠시 후 새로고침하거나 계정 정보에서 인증 상태를 확인해 주세요.</p>
          <Link href="/account" className="mt-6 inline-flex rounded-2xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-800">계정 정보 확인</Link>
        </>
      ) : !accountStatus.emailVerified ? (
        <>
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">EMAIL VERIFICATION</p>
          <h2 className="mt-3 text-2xl font-bold text-stone-900">결제 전에 이메일 인증을 완료해 주세요</h2>
          <p className="mt-4 text-sm leading-7 text-stone-600">무료 분석과 상품 탐색에는 영향이 없으며, 유료 결제를 시작할 때만 확인합니다.</p>
          <Link href="/account" className="mt-6 inline-flex w-full justify-center rounded-2xl bg-stone-900 px-5 py-4 text-sm font-bold text-white">이메일 인증 확인하기</Link>
        </>
      ) : accountStatus.account.paidEligibilityStatus !== "VERIFIED_ADULT" ? (
        <>
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">PAYMENT VERIFICATION</p>
          <h2 className="mt-3 text-2xl font-bold text-stone-900">결제 전에 본인·성인 인증이 필요합니다</h2>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            상품은 자유롭게 둘러볼 수 있습니다. 실제 유료 결제를 진행하는 회원만 한 번 본인·성인 인증을 완료하면 됩니다.
          </p>
          <NiceAdultVerificationButton
            accountStatus={accountStatus.account.status}
            emailVerified={accountStatus.emailVerified}
            eligibilityStatus={accountStatus.account.paidEligibilityStatus}
          />
        </>
      ) : isCompatibility && compatibilityPayloadChecked && !compatibilityPartner ? (
        <>
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">COMPATIBILITY INPUT</p>
          <h2 className="mt-3 text-2xl font-bold text-stone-900">상대방 정보를 다시 확인해 주세요</h2>
          <p className="mt-4 text-sm leading-7 text-stone-600">궁합 입력 화면에서 상대방 정보를 확인한 뒤 결제로 이동해 주세요.</p>
          <Link href="/special-analysis/compatibility" className="mt-6 inline-flex w-full justify-center rounded-2xl bg-stone-900 px-5 py-4 text-sm font-bold text-white">궁합 입력 화면으로 돌아가기</Link>
        </>
      ) : (
        <>
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">PURCHASE READY</p>
          <h2 className="mt-3 text-2xl font-bold text-stone-900">결제를 진행할 수 있습니다</h2>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            {profileId ? "인증과 분석 대상을 확인했습니다. 아래 내용을 확인한 뒤 결제를 계속해 주세요." : "분석 대상을 선택한 뒤 결제를 계속 진행할 수 있습니다."}
          </p>

          {profileId ? (
            <>
              <div className="mt-7 border-t border-stone-200 pt-6" aria-labelledby="checkout-notice-title">
                <h3 id="checkout-notice-title" className="text-base font-bold text-stone-900">결제 및 분석 생성 안내</h3>
                <dl className="mt-4 space-y-2 text-sm leading-6 text-stone-700">
                  <div className="flex justify-between gap-4"><dt className="text-stone-500">상품</dt><dd className="text-right font-semibold">{productTitle}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-stone-500">분석 대상</dt><dd className="text-right font-semibold">{profileLabel ?? "-"}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-stone-500">결제 금액</dt><dd className="text-right font-semibold">{priceLabel}</dd></div>
                  {editionLabel ? <div className="flex justify-between gap-4"><dt className="text-stone-500">분석 기준</dt><dd className="text-right font-semibold">{editionLabel}</dd></div> : null}
                </dl>
                <p className="mt-5 text-sm font-semibold leading-6 text-stone-900">결제가 승인되면 개인화 분석 생성이 즉시 시작되고 구매한 분석에 보관됩니다.</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">환불·취소·청약철회에 관한 자세한 내용은 <Link href="/refund" className="font-semibold text-stone-900 underline underline-offset-4">환불·취소·청약철회 정책</Link>에서 확인할 수 있습니다.</p>
                <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-stone-700">
                  <input ref={acknowledgementRef} type="checkbox" checked={immediateGenerationAcknowledged} onChange={(event) => setImmediateGenerationAcknowledged(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900" />
                  <span>결제 승인 후 개인화 분석 생성이 즉시 시작된다는 내용을 확인했습니다.</span>
                </label>
              </div>
              <button type="button" onClick={handlePayment} disabled={isPaying || !immediateGenerationAcknowledged} className="mt-7 w-full rounded-2xl bg-stone-900 px-5 py-4 font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400">
                {isPaying ? "결제 처리 중..." : `${priceLabel} 결제하기`}
              </button>
            </>
          ) : null}

          {errorMessage ? <p className="mt-4 text-sm leading-6 text-red-600">{errorMessage}</p> : null}
        </>
      )}
    </section>
  );
}
