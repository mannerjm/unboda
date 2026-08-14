"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatBirthDateInput,
  getBirthDateDigits,
} from "@/app/lib/birthDateInput";
import { validateAnalyzeInput } from "@/app/lib/validateAnalyzeInput";

export default function SajuPage() {
  const router = useRouter();

  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState("남성");
const [calendarType, setCalendarType] = useState("양력");
const [isLeapMonth, setIsLeapMonth] = useState("평달");
  const [validationMessage, setValidationMessage] = useState("");
  const startAnalysis = () => {
    const validation = validateAnalyzeInput({
      birthDate,
      birthTime,
      gender,
      calendarType,
      isLeapMonth,
    });

    if (!validation.valid) {
      setValidationMessage(validation.error);
      return;
    }

    setValidationMessage("");
    const params = new URLSearchParams({
      birthDate,
  birthTime,
  gender,
  calendarType,
  isLeapMonth,
    });

    router.push(`/loading?${params.toString()}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#f7f3ea] px-6">
      <h1 className="text-5xl font-bold mb-8">사주 정보 입력</h1>

      <div className="w-full max-w-md space-y-5">
        <div className="space-y-2">
  <label className="text-sm font-medium text-stone-700">
    달력 종류
  </label>

  <select
    value={calendarType}
    onChange={(e) => setCalendarType(e.target.value)}
    className="w-full rounded-xl border p-4"
  >
    <option value="양력">양력</option>
    <option value="음력">음력</option>
  </select>
</div>


{calendarType === "음력" && (
  <div className="space-y-2">
    <label className="text-sm font-medium text-stone-700">
      윤달 여부
    </label>

    <select
      value={isLeapMonth}
      onChange={(e) => setIsLeapMonth(e.target.value)}
      className="w-full rounded-xl border p-4"
    >
      <option value="평달">평달</option>
      <option value="윤달">윤달</option>
    </select>
  </div>
)}

<input
  type="text"
  value={birthDate}
  onChange={(e) => setBirthDate(formatBirthDateInput(e.target.value))}
  onKeyDown={(e) => {
    const cursor = e.currentTarget.selectionStart;
    const hasSelection = cursor !== e.currentTarget.selectionEnd;

    if (hasSelection || cursor === null) return;

    const digits = getBirthDateDigits(birthDate);

    if (e.key === "Backspace" && (cursor === 5 || cursor === 8)) {
      e.preventDefault();
      setBirthDate(formatBirthDateInput(digits.slice(0, -1)));
    }

    if (e.key === "Delete" && (cursor === 4 || cursor === 7)) {
      e.preventDefault();
      const digitIndex = cursor === 4 ? 4 : 6;
      setBirthDate(formatBirthDateInput(
        `${digits.slice(0, digitIndex)}${digits.slice(digitIndex + 1)}`,
      ));
    }
  }}
  inputMode="numeric"
  maxLength={10}
  placeholder="YYYY-MM-DD"
  aria-label="생년월일"
  className="w-full rounded-xl border p-4"
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
        {validationMessage ? (
          <p className="text-sm text-red-600">{validationMessage}</p>
        ) : null}
      </div>
    </main>
  );
}