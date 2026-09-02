"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getAuthUserAccessLevel,
  guestAuthState,
  type AuthState,
} from "@/app/lib/auth";
import { createClient } from "@/app/lib/supabase/client";
import { getUserAccessPermissions } from "@/app/lib/userAccess";
import { getCanonicalPremiumProductId } from "@/app/lib/premiumProductRegistry";

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
};

export default function CheckoutAccessPanel({
  productId,
  profileId,
}: CheckoutAccessPanelProps) {
  const [authState, setAuthState] =
    useState<AuthState>(guestAuthState);

  const [isPaying, setIsPaying] = useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setAuthState({
          status: "authenticated",
          user: {
            id: user.id,
            email: user.email ?? "",
            name: "",
            accessLevel: "free_member",
          },
        });
      }
    });
  }, []);

  const userAccessLevel = getAuthUserAccessLevel(authState);
  const permissions = getUserAccessPermissions(userAccessLevel);

  const canonicalProductId = getCanonicalPremiumProductId(productId);

  async function handlePayment() {
    if (authState.status !== "authenticated" || !profileId || isPaying) {
      return;
    }

    setIsPaying(true);
    setErrorMessage(null);

    try {
      // The server derives userId and amount; it verifies the requested profile.
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: canonicalProductId, profileId }),
      });

      if (!orderResponse.ok) {
        const body = await orderResponse.json().catch(() => null) as { error?: string } | null;
        throw new Error(
          body?.error ?? `주문 생성에 실패했습니다. (${orderResponse.status})`,
        );
      }

      const { order } = (await orderResponse.json()) as {
        order: { id: string; amount: number };
      };

      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey?.startsWith("test_ck_") || !window.TossPayments) {
        throw new Error("Toss 테스트 결제 설정을 불러오지 못했습니다.");
      }

      const toss = window.TossPayments(clientKey);
      await toss.payment({ customerKey: authState.user.id }).requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: order.amount },
        orderId: order.id,
        orderName: `심층 분석 - ${canonicalProductId}`,
        successUrl: `${window.location.origin}/checkout/success?productId=${encodeURIComponent(canonicalProductId)}&profileId=${encodeURIComponent(profileId)}`,
        failUrl: `${window.location.origin}/checkout/fail?productId=${encodeURIComponent(canonicalProductId)}&profileId=${encodeURIComponent(profileId)}`,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "결제를 완료하지 못했습니다.",
      );
      setIsPaying(false);
    }
  }

  return (
    <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
      {authState.status === "guest" ? (
        <>
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">
            ACCOUNT REQUIRED
          </p>

          <h2 className="mt-3 text-2xl font-bold text-stone-900">
            구매한 분석을 보관하려면 계정 연결이 필요합니다
          </h2>

          <p className="mt-4 text-sm leading-7 text-stone-600">
            회원가입은 무료 분석을 보기 위한 조건이 아닙니다.
            유료 분석을 구매하고 이후 다시 확인할 수 있도록
            구매 결과를 계정에 연결하는 단계입니다.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link
              href={`/auth/login?returnTo=${encodeURIComponent(
                `/checkout/${productId}${profileId ? `?profileId=${profileId}` : ""}`
              )}`}
              className="rounded-2xl bg-stone-900 px-5 py-4 text-center font-semibold text-white transition hover:bg-stone-800"
            >
              로그인
            </Link>

            <Link
              href={`/auth/signup?returnTo=${encodeURIComponent(
                `/checkout/${productId}${profileId ? `?profileId=${profileId}` : ""}`
              )}`}
              className="rounded-2xl border border-stone-300 bg-white px-5 py-4 text-center font-semibold text-stone-900 transition hover:bg-stone-50"
            >
              회원가입
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">
            ACCOUNT CONNECTED
          </p>

          <h2 className="mt-3 text-2xl font-bold text-stone-900">
            계정이 확인되었습니다
          </h2>

          <p className="mt-4 text-sm leading-7 text-stone-600">
            {profileId
              ? "이제 선택한 심층 분석의 결제를 계속 진행할 수 있습니다."
              : "분석 대상을 선택한 뒤 결제를 계속 진행할 수 있습니다."}
          </p>

          {profileId ? (
            <button
              type="button"
              onClick={handlePayment}
              disabled={isPaying}
              className="mt-7 w-full rounded-2xl bg-stone-900 px-5 py-4 font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isPaying ? "결제 처리 중..." : "결제 계속하기"}
            </button>
          ) : null}

          {errorMessage ? (
            <p className="mt-4 text-sm leading-6 text-red-600">
              {errorMessage}
            </p>
          ) : null}
        </>
      )}

      <p className="mt-5 text-xs leading-5 text-stone-500">
        유료 분석 구매 가능 상태:{" "}
        {permissions.canPurchasePaidAnalysis ? "가능" : "불가"}
      </p>
    </section>
  );
}