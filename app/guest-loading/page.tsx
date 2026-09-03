"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GuestLoadingPage() {
  const router = useRouter();
  useEffect(() => {
    void fetch("/api/guest-free-analysis/generate", { method: "POST" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        router.replace("/guest-result");
      })
      .catch(() => router.replace("/guest-saju"));
  }, [router]);
  return <main className="flex min-h-screen flex-col items-center justify-center bg-[#fcfaf6] px-6 py-12 text-center text-stone-900">
    <div className="flex w-full max-w-md flex-col items-center">
      <p className="text-xs font-semibold tracking-[0.24em] text-[#a47735]">운보다 AI 분석 중</p>
      <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">사주를 분석하고 있어요</h1>
      <p className="mt-5 text-sm leading-7 text-stone-600 sm:text-base">입력하신 정보를 바탕으로<br />분석 결과를 만들고 있습니다.</p>
      <p className="mt-6 text-xs leading-6 text-stone-500">완료되면 결과 화면으로 자동 이동합니다.</p>
      <div className="mt-8 h-12 w-12 animate-spin rounded-full border-[3px] border-[#e5dccd] border-t-[#b8893c]" />
    </div>
  </main>;
}