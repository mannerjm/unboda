"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AnalyzeSuccessResponse } from "@/app/lib/analyzeApiTypes";
import { ResultPageContent, ResultViewerContext, type RetryMainAnalysisResult } from "@/app/result/page";

export default function GuestResultPage() {
  const [analysis, setAnalysis] = useState<AnalyzeSuccessResponse | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [intentSaved, setIntentSaved] = useState(false);
  const [showSaveAuthChoices, setShowSaveAuthChoices] = useState(false);
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

  async function retryMainAnalysis(): Promise<RetryMainAnalysisResult> {
    const response = await fetch("/api/guest-free-analysis/retry-main-analysis", { method: "POST" });
    return response.json() as Promise<RetryMainAnalysisResult>;
  }

  if (error && !analysis) return <main className="flex min-h-screen items-center justify-center bg-[#f5f7fc] px-6"><p className="text-sm text-[#59627a]">{error}</p></main>;
  if (!analysis) return <main className="flex min-h-screen items-center justify-center bg-[#f5f7fc]"><p className="text-sm text-[#687189]">무료 분석 결과를 불러오는 중입니다...</p></main>;

  return (
    <>
      <div className="guest-result-view">
        <ResultViewerContext.Provider value={{ analysis, onProductSelected: (productId) => void selectProduct(productId), onRetryMainAnalysis: retryMainAnalysis }}>
          <ResultPageContent />
        </ResultViewerContext.Provider>
      </div>

      {!intentSaved ? <main className="bg-[#f5f7fc] px-5 pb-14 text-[#11162d]"><div className="mx-auto w-full max-w-3xl"><section className="overflow-hidden rounded-[1.8rem] border border-[#dfe3ef] bg-white p-6 shadow-[0_18px_50px_rgba(32,38,72,0.08)]">
        <p className="text-xs font-black tracking-[0.14em] text-[#7768c7]">무료 결과 저장</p>
        <h2 className="mt-2 text-xl font-bold">방금 조회한 사주 정보를 내 프로필로 저장하시겠어요?</h2>
        <p className="mt-3 text-sm leading-7 text-[#687189]">로그인하거나 회원가입하면 지금 확인한 출생 정보와 무료 분석 결과를 계정에 연결해 마이페이지에서 다시 볼 수 있습니다.</p>
        {!showSaveAuthChoices ? (
          <button
            type="button"
            onClick={() => setShowSaveAuthChoices(true)}
            className="mt-5 w-full rounded-xl bg-[linear-gradient(135deg,#6f5ce7,#8d68ef)] px-5 py-4 text-center font-black text-white shadow-[0_12px_28px_rgba(111,92,231,0.20)] transition hover:brightness-105"
          >
            무료 결과 저장하기
          </button>
        ) : (
          <div className="mt-5 rounded-2xl border border-[#e3e7f0] bg-[#f7f8fc] p-4">
            <p className="text-sm font-semibold text-[#11162d]">계정이 있으신가요?</p>
            <p className="mt-1 text-xs leading-5 text-[#7b8299]">로그인 또는 회원가입을 마치면 방금 조회한 무료 결과를 자동으로 계정에 연결합니다.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="/auth/login?returnTo=/auth/complete-guest-analysis&origin=guest-result" className="rounded-xl bg-[#111735] px-5 py-4 text-center font-bold text-white">로그인</Link>
              <Link href="/auth/signup?returnTo=/auth/complete-guest-analysis&origin=guest-result" className="rounded-xl border border-[#dfe3ef] bg-white px-5 py-4 text-center font-semibold">회원가입</Link>
            </div>
          </div>
        )}
        <p className="mt-4 text-xs leading-5 text-[#7b8299]">지금 저장하지 않아도 무료 결과는 현재 화면에서 계속 확인할 수 있습니다.</p>
      </section></div></main> : null}

      {intentSaved && selectedProductId ? <main className="bg-[#f5f7fc] px-5 pb-14 text-[#11162d]"><div className="mx-auto w-full max-w-3xl"><section className="rounded-3xl border border-[#dfe3ef] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">선택한 심층 분석을 계속 보려면 로그인 또는 회원가입이 필요합니다.</h2>
          <p className="mt-3 text-sm leading-7 text-[#687189]">인증이 끝나면 방금 조회한 무료 결과를 계정에 연결하고, 선택한 심층 분석 흐름으로 이어집니다.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link href="/auth/login?returnTo=/auth/complete-guest-analysis&origin=guest-result" className="rounded-xl bg-[#111735] px-5 py-4 text-center font-bold text-white">로그인</Link>
            <Link href="/auth/signup?returnTo=/auth/complete-guest-analysis&origin=guest-result" className="rounded-xl border border-[#dfe3ef] px-5 py-4 text-center font-semibold">회원가입</Link>
          </div>
        </section></div></main> : null}
      {error ? <p className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-xl bg-white px-4 py-3 text-sm text-red-600 shadow">{error}</p> : null}
    </>
  );
}
