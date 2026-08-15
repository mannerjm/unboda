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
  return <main className="min-h-screen flex flex-col items-center justify-center bg-[#f7f3ea] px-6 text-center">
    <p className="text-sm tracking-[0.3em] text-stone-500 mb-4">운보다 AI 분석중</p>
    <h1 className="text-4xl font-bold text-stone-900 mb-6">당신의 사주를 읽고 있어요</h1>
    <p className="text-stone-600 mb-10 leading-8">생년월일과 태어난 시간을 바탕으로<br />AI 분석 결과를 만들고 있습니다.</p>
    <p className="mb-3 text-base font-semibold text-stone-800">분석에는 약 1~2분 정도 소요될 수 있습니다.</p>
    <p className="text-sm leading-7 text-stone-600">잠시만 기다려 주세요. 분석이 완료되면 결과 화면으로 자동 이동합니다.</p>
    <p className="mt-3 text-xs leading-6 text-stone-500">분석 중에는 이 페이지를 닫거나 새로고침하지 않는 것을 권장합니다.</p>
    <div className="mt-8 w-16 h-16 border-4 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
  </main>;
}