"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SajuPage() {
  const router = useRouter();

  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState("남성");

  const startAnalysis = () => {
    const params = new URLSearchParams({
      birthDate,
      birthTime,
      gender,
    });

    router.push(`/loading?${params.toString()}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#f7f3ea] px-6">
      <h1 className="text-5xl font-bold mb-8">사주 정보 입력</h1>

      <div className="w-full max-w-md space-y-5">
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="w-full border rounded-xl p-4"
        />

        <input
          type="time"
          value={birthTime}
          onChange={(e) => setBirthTime(e.target.value)}
          className="w-full border rounded-xl p-4"
        />

        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="w-full border rounded-xl p-4"
        >
          <option>남성</option>
          <option>여성</option>
        </select>

        <button
          onClick={startAnalysis}
          className="block w-full bg-black text-white rounded-xl p-4 text-center"
        >
          운보다 AI로 분석하기
        </button>
      </div>
    </main>
  );
}