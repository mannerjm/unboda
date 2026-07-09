"use client";

import { useSearchParams } from "next/navigation";

export default function ResultPage() {
  const searchParams = useSearchParams();

  const birthDate = searchParams.get("birthDate") || "입력 없음";
  const birthTime = searchParams.get("birthTime") || "입력 없음";
  const gender = searchParams.get("gender") || "입력 없음";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#f7f3ea] px-6 text-center">
      <p className="text-sm tracking-[0.3em] text-stone-500 mb-4">
        AI 사주 분석 결과
      </p>

      <h1 className="text-4xl font-bold text-stone-900 mb-6">
        당신의 사주 리포트
      </h1>

      <div className="w-full max-w-xl bg-white rounded-3xl p-8 text-left shadow-sm mb-6">
        <h2 className="text-2xl font-bold mb-4">입력 정보</h2>

        <p className="text-stone-700 leading-8">
          생년월일: {birthDate}<br />
          태어난 시간: {birthTime}<br />
          성별: {gender}
        </p>
      </div>

      <div className="w-full max-w-xl bg-white rounded-3xl p-8 text-left shadow-sm">
        <h2 className="text-2xl font-bold mb-4">기본 성향</h2>

        <p className="text-stone-700 leading-8">
          앞으로 이곳에 입력하신 정보를 바탕으로 성격, 재물운,
          연애운, 직업운, 올해 운세가 표시됩니다.
        </p>
      </div>
    </main>
  );
}