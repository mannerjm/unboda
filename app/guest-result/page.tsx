"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AnalyzeSuccessResponse } from "@/app/lib/analyzeApiTypes";
import { ResultPageContent, ResultViewerContext } from "@/app/result/page";

export default function GuestResultPage() {
  const [analysis, setAnalysis] = useState<AnalyzeSuccessResponse | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [intentSaved, setIntentSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/guest-free-analysis")
      .then(async (response) => {
        const body = await response.json() as { analysis?: AnalyzeSuccessResponse; error?: string };
        if (!response.ok || !body.analysis) throw new Error(body.error ?? "무료 분석 결과를 찾을 수 없습니다.");
        setAnalysis(body.analysis);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "무료 분석 결과를 불러오지 못했습니다."));
  }, []);

  async function selectProduct(productId: string) {
    setError(null);
    const response = await fetch("/api/guest-free-analysis/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const body = await response.json() as { productId?: string; error?: string };
    if (!response.ok || !body.productId) {
      setError(body.error ?? "선택한 상품을 저장하지 못했습니다.");
      return;
    }
    setSelectedProductId(body.productId);
    setIntentSaved(true);
  }

  if (error && !analysis) return <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] px-6"><p className="text-sm text-stone-700">{error}</p></main>;
  if (!analysis) return <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea]"><p className="text-sm text-stone-600">무료 분석 결과를 불러오는 중입니다...</p></main>;

  return (
    <>
      <ResultViewerContext.Provider value={{ analysis, onProductSelected: (productId) => void selectProduct(productId) }}>
        <ResultPageContent />
      </ResultViewerContext.Provider>
      {intentSaved && selectedProductId ? <main className="bg-[#f7f3ea] px-5 pb-14 text-stone-900"><div className="mx-auto w-full max-w-3xl"><section className="rounded-3xl border border-stone-300 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">심층 분석을 보려면 로그인 또는 회원가입이 필요합니다.</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link href="/auth/login?returnTo=/auth/complete-guest-analysis" className="rounded-xl bg-stone-900 px-5 py-4 text-center font-semibold text-white">기존 회원 로그인</Link>
            <Link href="/auth/signup?returnTo=/auth/complete-guest-analysis" className="rounded-xl border border-stone-300 px-5 py-4 text-center font-semibold">회원가입</Link>
          </div>
        </section></div></main> : null}
      {error ? <p className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-xl bg-white px-4 py-3 text-sm text-red-600 shadow">{error}</p> : null}
    </>
  );
}
