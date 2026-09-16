"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import NiceAdultVerificationButton from "@/app/account/NiceAdultVerificationButton";
import type { AccountLifecycleStatus, PaidEligibilityStatus } from "@/app/lib/accounts/server";
import { guestAuthState, type AuthState } from "@/app/lib/auth";
import {
  COMPATIBILITY_FAMILY_OTHER_SESSION_KEY,
  COMPATIBILITY_FAMILY_SIBLING_SESSION_KEY,
  isCompatibilityFamilyOtherProductId,
  isCompatibilityFamilySiblingProductId,
} from "@/app/lib/specialAnalysisProducts";
import { createClient } from "@/app/lib/supabase/client";

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

export default function FamilyExtendedCheckoutAccessPanel({
  productId,
  profileId,
  productTitle,
  profileLabel,
  priceLabel,
  editionLabel,
}: {
  productId: string;
  profileId?: string;
  productTitle: string;
  profileLabel?: string;
  priceLabel: string;
  editionLabel?: string;
}) {
  const [authState, setAuthState] = useState<AuthState>(guestAuthState);
  const [accountStatus, setAccountStatus] = useState<AccountStatusResponse | null>(null);
  const [accountStatusLoading, setAccountStatusLoading] = useState(true);
  const [familyPayload, setFamilyPayload] = useState<unknown>(null);
  const [payloadChecked, setPayloadChecked] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const acknowledgementRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSibling = isCompatibilityFamilySiblingProductId(productId);
  const isOther = isCompatibilityFamilyOtherProductId(productId);
  const sessionKey = isSibling ? COMPATIBILITY_FAMILY_SIBLING_SESSION_KEY : COMPATIBILITY_FAMILY_OTHER_SESSION_KEY;

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(sessionKey);
      setFamilyPayload(stored ? JSON.parse(stored) : null);
    } catch {
      setFamilyPayload(null);
    } finally {
      setPayloadChecked(true);
    }
  }, [sessionKey]);

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
        user: { id: user.id, email: user.email ?? "", name: "", accessLevel: "free_member" },
      });
      try {
        const response = await fetch("/api/account/status", { cache: "no-store" });
        const payload = await response.json().catch(() => null) as AccountStatusResponse | null;
        if (!cancelled && response.ok && payload) setAccountStatus(payload);
      } finally {
        if (!cancelled) setAccountStatusLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  async function handlePayment() {
    if (authState.status !== "authenticated" || !profileId || isPaying) return;
    if (!accountStatus || !accountStatus.emailVerified || accountStatus.account.paidEligibilityStatus !== "VERIFIED_ADULT") {
      setErrorMessage("결제 전에 계정 인증을 완료해 주세요.");
      return;
    }
    if (!familyPayload) {
      setErrorMessage(`${isSibling ? "형제·자매" : "기타 가족"} 궁합에 필요한 가족 정보를 다시 입력해 주세요.`);
      return;
    }
    if (!acknowledged) {
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
      const response = await fetch("/api/orders/family-extended", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          profileId,
          immediateGenerationAcknowledged: true,
          familyPayload,
        }),
      });
      const body = await response.json().catch(() => null) as { order?: { id: string; amount: number }; error?: string } | null;
      if (!response.ok || !body?.order) throw new Error(body?.error ?? `주문 생성에 실패했습니다. (${response.status})`);

      const toss = window.TossPayments(clientKey);
      await toss.payment({ customerKey: authState.user.id }).requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: body.order.amount },
        orderId: body.order.id,
        orderName: productTitle,
        successUrl: `${window.location.origin}/checkout/success?productId=${encodeURIComponent(productId)}&profileId=${encodeURIComponent(profileId)}`,
        failUrl: `${window.location.origin}/checkout/fail?productId=${encodeURIComponent(productId)}&profileId=${encodeURIComponent(profileId)}`,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "결제를 완료하지 못했습니다.");
      setIsPaying(false);
    }
  }

  const returnTo = `/checkout/${productId}${profileId ? `?profileId=${profileId}` : ""}`;
  const familyBackHref = "/special-analysis/compatibility/family/parent-child#family-relationship-selector";

  return (
    <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
      {authState.status === "guest" ? (
        <>
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">ACCOUNT REQUIRED</p>
          <h2 className="mt-3 text-2xl font-bold text-stone-900">구매한 분석을 보관하려면 계정 연결이 필요합니다</h2>
          <p className="mt-4 text-sm leading-7 text-stone-600">상품 설명과 가격은 누구나 볼 수 있습니다. 결제와 구매 결과 보관을 위해서만 계정 연결이 필요합니다.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link href={`/auth/login?returnTo=${encodeURIComponent(returnTo)}`} className="rounded-2xl bg-stone-900 px-5 py-4 text-center font-semibold text-white">로그인</Link>
            <Link href={`/auth/signup?returnTo=${encodeURIComponent(returnTo)}`} className="rounded-2xl border border-stone-300 bg-white px-5 py-4 text-center font-semibold text-stone-900">회원가입</Link>
          </div>
        </>
      ) : accountStatusLoading ? (
        <><p className="text-xs font-semibold tracking-[0.2em] text-stone-500">PURCHASE CHECK</p><h2 className="mt-3 text-2xl font-bold">결제 가능 상태를 확인하고 있습니다</h2></>
      ) : !accountStatus ? (
        <><h2 className="text-2xl font-bold">계정 상태를 확인하지 못했습니다</h2><Link href="/account" className="mt-6 inline-flex rounded-2xl border border-stone-300 px-5 py-3 text-sm font-semibold">계정 정보 확인</Link></>
      ) : !accountStatus.emailVerified ? (
        <><p className="text-xs font-semibold tracking-[0.2em] text-stone-500">EMAIL VERIFICATION</p><h2 className="mt-3 text-2xl font-bold">결제 전에 이메일 인증을 완료해 주세요</h2><Link href="/account" className="mt-6 inline-flex w-full justify-center rounded-2xl bg-stone-900 px-5 py-4 text-sm font-bold text-white">이메일 인증 확인하기</Link></>
      ) : accountStatus.account.paidEligibilityStatus !== "VERIFIED_ADULT" ? (
        <>
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">PAYMENT VERIFICATION</p>
          <h2 className="mt-3 text-2xl font-bold">결제 전에 본인·성인 인증이 필요합니다</h2>
          <p className="mt-4 text-sm leading-7 text-stone-600">실제 유료 결제를 진행하는 회원만 한 번 본인·성인 인증을 완료하면 됩니다.</p>
          <NiceAdultVerificationButton accountStatus={accountStatus.account.status} emailVerified={accountStatus.emailVerified} eligibilityStatus={accountStatus.account.paidEligibilityStatus} />
        </>
      ) : payloadChecked && !familyPayload ? (
        <>
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">FAMILY INPUT</p>
          <h2 className="mt-3 text-2xl font-bold">가족 정보를 다시 확인해 주세요</h2>
          <p className="mt-4 text-sm leading-7 text-stone-600">가족 궁합 입력 화면에서 관계와 상대 가족 정보를 확인한 뒤 결제로 이동해 주세요.</p>
          <Link href={familyBackHref} className="mt-6 inline-flex w-full justify-center rounded-2xl bg-stone-900 px-5 py-4 text-sm font-bold text-white">가족 궁합 입력으로 돌아가기</Link>
        </>
      ) : (
        <>
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">PURCHASE READY</p>
          <h2 className="mt-3 text-2xl font-bold">결제를 진행할 수 있습니다</h2>
          <p className="mt-4 text-sm leading-7 text-stone-600">인증과 분석 대상을 확인했습니다. 아래 내용을 확인한 뒤 결제를 계속해 주세요.</p>
          {profileId ? (
            <div className="mt-7 border-t border-stone-200 pt-6">
              <h3 className="text-base font-bold">결제 및 분석 생성 안내</h3>
              <dl className="mt-4 space-y-2 text-sm leading-6 text-stone-700">
                <div className="flex justify-between gap-4"><dt className="text-stone-500">상품</dt><dd className="text-right font-semibold">{productTitle}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-stone-500">분석 대상</dt><dd className="text-right font-semibold">{profileLabel ?? "-"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-stone-500">결제 금액</dt><dd className="text-right font-semibold">{priceLabel}</dd></div>
                {editionLabel ? <div className="flex justify-between gap-4"><dt className="text-stone-500">분석 기준</dt><dd className="text-right font-semibold">{editionLabel}</dd></div> : null}
              </dl>
              <p className="mt-5 text-sm font-semibold leading-6">결제가 승인되면 개인화 분석 생성이 즉시 시작되고 구매한 분석에 보관됩니다.</p>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-700">
                <input ref={acknowledgementRef} type="checkbox" checked={acknowledged} onChange={(event) => { setAcknowledged(event.target.checked); setErrorMessage(null); }} className="mt-1" />
                <span>결제 승인 직후 선택한 가족 정보를 기준으로 개인화 분석 생성이 시작되는 점을 확인했습니다.</span>
              </label>
              {errorMessage ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}
              <button type="button" onClick={handlePayment} disabled={isPaying || !acknowledged} className="mt-6 w-full rounded-2xl bg-stone-900 px-5 py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-300">{isPaying ? "결제창을 준비하고 있습니다..." : `${priceLabel} 결제하기`}</button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
