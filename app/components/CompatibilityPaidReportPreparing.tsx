"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PaidReportPreparing from "./PaidReportPreparing";

type Props = {
  failed?: boolean;
  productId?: string;
  profileId?: string;
  edition?: string;
};

export default function CompatibilityPaidReportPreparing({ failed = false, productId, profileId, edition }: Props) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    if (failed) return;
    const timer = window.setInterval(() => router.refresh(), 4_000);
    return () => window.clearInterval(timer);
  }, [failed, router]);

  const retry = async () => {
    if (!failed || !productId || !profileId || !edition || retrying) return;
    setRetrying(true);
    setRetryError(null);
    try {
      const response = await fetch("/api/paid-reports/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, profileId, edition }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "기존 구매 리포트를 다시 준비하지 못했습니다.");
      router.refresh();
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : "리포트 재생성을 시작하지 못했습니다.");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <>
      <PaidReportPreparing kind="compatibility" failed={failed} />
      {failed && productId && profileId && edition ? (
        <div className="mx-auto mt-4 max-w-2xl text-center">
          <button type="button" onClick={() => void retry()} disabled={retrying} className="rounded-xl bg-[#171a3d] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {retrying ? "기존 구매로 다시 준비 중..." : "다시 결제 없이 리포트 재생성"}
          </button>
          {retryError ? <p className="mt-3 text-sm leading-6 text-red-700" role="alert">{retryError}</p> : null}
        </div>
      ) : null}
    </>
  );
}
