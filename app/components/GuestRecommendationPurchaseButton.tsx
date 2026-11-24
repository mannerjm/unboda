"use client";

import { useRef, useState } from "react";

export default function GuestRecommendationPurchaseButton({ productId, label }: { productId: string; label: string }) {
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueGuestPurchase() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/guest-free-analysis/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const body = await response.json() as { productId?: string; error?: string };
      if (!response.ok || body.productId !== productId) {
        throw new Error(body.error ?? "선택한 분석을 저장하지 못했습니다.");
      }
      window.location.assign("/auth/login?returnTo=/auth/complete-guest-analysis&origin=guest-result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "선택한 분석을 저장하지 못했습니다.");
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => void continueGuestPurchase()} disabled={pending} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#704ad0] px-4 py-3 text-center text-base font-extrabold text-white transition hover:bg-[#5e38bd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#704ad0] disabled:opacity-60">
        {pending ? "계속 준비 중..." : label}
      </button>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
    </>
  );
}
