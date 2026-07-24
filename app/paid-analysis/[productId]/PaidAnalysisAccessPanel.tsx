"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  guestAuthState,
  loadAuthState,
  type AuthState,
} from "@/app/lib/auth";
import { loadEntitlements } from "@/app/lib/purchaseStorage";
import {
  hasActiveEntitlement,
  type Entitlement,
} from "@/app/lib/userAccess";

type PaidAnalysisAccessPanelProps = {
  productId: string;
};

export default function PaidAnalysisAccessPanel({
  productId,
}: PaidAnalysisAccessPanelProps) {
  const [authState, setAuthState] =
    useState<AuthState>(guestAuthState);

  const [entitlements, setEntitlements] =
    useState<Entitlement[]>([]);

  useEffect(() => {
    setAuthState(loadAuthState());
    setEntitlements(loadEntitlements());
  }, []);

  const hasAccess =
    authState.status === "authenticated" &&
    hasActiveEntitlement(
      entitlements,
      authState.user.id,
      "demo-profile",
      productId
    );

  return (
    <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
      {hasAccess ? (
        <>
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">
            PURCHASED
          </p>

          <h2 className="mt-3 text-2xl font-bold text-stone-900">
            이 심층 분석을 열람할 수 있습니다
          </h2>

          <p className="mt-4 text-sm leading-7 text-stone-600">
            구매 권한이 확인되었습니다.
            이제 이 상품의 심층 분석 내용을 확인할 수 있습니다.
          </p>

          <Link
  href={`/paid-analysis/${productId}/report`}
  className="mt-7 block w-full rounded-2xl bg-stone-900 px-5 py-4 text-center font-semibold text-white transition hover:bg-stone-800"
>
  심층 분석 열기
</Link>
        </>
      ) : (
        <>
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">
            PURCHASE REQUIRED
          </p>

          <h2 className="mt-3 text-2xl font-bold text-stone-900">
            아직 이 심층 분석의 구매 권한이 없습니다
          </h2>

          <p className="mt-4 text-sm leading-7 text-stone-600">
            구매를 완료하면 이 계정과 프로필에
            해당 심층 분석의 열람 권한이 연결됩니다.
          </p>
        </>
      )}
    </section>
  );
}