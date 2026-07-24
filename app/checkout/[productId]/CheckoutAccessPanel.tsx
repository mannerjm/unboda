"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getAuthUserAccessLevel,
  guestAuthState,
  loadAuthState,
  type AuthState,
} from "@/app/lib/auth";
import { getUserAccessPermissions } from "@/app/lib/userAccess";

type CheckoutAccessPanelProps = {
  productId: string;
};

export default function CheckoutAccessPanel({
  productId,
}: CheckoutAccessPanelProps) {
  const [authState, setAuthState] =
    useState<AuthState>(guestAuthState);

  useEffect(() => {
    setAuthState(loadAuthState());
  }, []);

  const userAccessLevel = getAuthUserAccessLevel(authState);
  const permissions = getUserAccessPermissions(userAccessLevel);

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
                `/checkout/${productId}`
              )}`}
              className="rounded-2xl bg-stone-900 px-5 py-4 text-center font-semibold text-white transition hover:bg-stone-800"
            >
              로그인
            </Link>

            <Link
              href={`/auth/signup?returnTo=${encodeURIComponent(
                `/checkout/${productId}`
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
            이제 선택한 심층 분석의 결제를 계속 진행할 수 있습니다.
          </p>

          <button
            type="button"
            className="mt-7 w-full rounded-2xl bg-stone-900 px-5 py-4 font-semibold text-white transition hover:bg-stone-800"
          >
            결제 계속하기
          </button>
        </>
      )}

      <p className="mt-5 text-xs leading-5 text-stone-500">
        유료 분석 구매 가능 상태:{" "}
        {permissions.canPurchasePaidAnalysis ? "가능" : "불가"}
      </p>
    </section>
  );
}