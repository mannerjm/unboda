"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResultPage() {
  const searchParams = useSearchParams();
  const [aiResult, setAiResult] = useState("");

  const birthDate = searchParams.get("birthDate") || "입력 없음";
  const birthTime = searchParams.get("birthTime") || "입력 없음";
  const gender = searchParams.get("gender") || "입력 없음";

  useEffect(() => {
    const savedResult = sessionStorage.getItem("sajuResult");

    if (savedResult) {
      setAiResult(savedResult);
    } else {
      setAiResult("AI 분석 결과를 찾을 수 없습니다.");
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <p className="mb-4 text-center text-sm tracking-[0.3em] text-stone-500">
          AI 사주 분석 결과
        </p>

        <h1 className="mb-8 text-center text-4xl font-bold text-stone-900">
          당신의 사주 리포트
        </h1>

        <div className="mb-6 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">입력 정보</h2>

          <p className="leading-8 text-stone-700">
            생년월일: {birthDate}
            <br />
            태어난 시간: {birthTime}
            <br />
            성별: {gender}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">운보다 AI 분석</h2>

          <p className="whitespace-pre-wrap leading-8 text-stone-700">
            {aiResult || "분석 결과를 불러오는 중입니다..."}
          </p>
        </div>
      </div>
    </main>
  );
}