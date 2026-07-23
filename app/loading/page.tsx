"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AnalyzeApiResponse } from "@/app/lib/analyzeApiTypes";

export default function LoadingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const analyzeSaju = async () => {
      const birthDate = searchParams.get("birthDate") || "";
      const birthTime = searchParams.get("birthTime") || "";
      const gender = searchParams.get("gender") || "";
const calendarType = searchParams.get("calendarType") || "양력";
const isLeapMonth = searchParams.get("isLeapMonth") || "평달";
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            birthDate,
            birthTime,
            gender,
             calendarType,
              isLeapMonth,
          }),
        });

        const data: AnalyzeApiResponse = await response.json();

        if (!response.ok || "error" in data) {
  throw new Error(
    "error" in data ? data.error : "AI 분석에 실패했습니다."
  );
}

if (!data.result || !data.saju) {
  throw new Error("분석 결과 데이터가 올바르지 않습니다.");
}


        sessionStorage.setItem("sajuResult", data.result || "");
sessionStorage.setItem("sajuData", JSON.stringify(data.saju || {}));
        const params = new URLSearchParams({
          birthDate,
          birthTime,
          gender,
           calendarType,
             isLeapMonth,
        });

        router.push(`/result?${params.toString()}`);
      } catch (error) {
        console.error(error);
        alert("AI 분석 중 오류가 발생했습니다.");
        router.push("/saju");
      }
    };

    analyzeSaju();
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
        생년월일과 태어난 시간을 바탕으로
        <br />
        AI 분석 결과를 만들고 있습니다.
      </p>

      <div className="w-16 h-16 border-4 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
    </main>
  );
}