"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoadingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const birthDate = searchParams.get("birthDate") || "";
    const birthTime = searchParams.get("birthTime") || "";
    const gender = searchParams.get("gender") || "";

    const params = new URLSearchParams({
      birthDate,
      birthTime,
      gender,
    });

    const timer = setTimeout(() => {
      router.push(`/result?${params.toString()}`);
    }, 3000);

    return () => clearTimeout(timer);
  }, [router, searchParams]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#f7f3ea] px-6 text-center">
      <p className="text-sm tracking-[0.3em] text-stone-500 mb-4">
        운보다 AI 분석중
      </p>

      <h1 className="text-4xl font-bold text-stone-900 mb-6">
        당신의 사주를 읽고 있어요
      </h1>

      <p className="text-stone-600 mb-10 leading-8">
        생년월일과 태어난 시간을 바탕으로<br />
        명리 데이터를 분석하고 있습니다.
      </p>

      <div className="w-16 h-16 border-4 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
    </main>
  );
}