"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProfileInput, ProfileRelationshipType } from "@/app/lib/profiles/types";
import { GUEST_BIRTH_DATE_MIN, getGuestBirthDateMax } from "@/app/lib/guestFreeAnalyses/date";

const relationshipOptions: Array<{ value: ProfileRelationshipType; label: string }> = [
  { value: "self", label: "본인" },
  { value: "spouse", label: "배우자" },
  { value: "child", label: "자녀" },
  { value: "parent", label: "부모" },
  { value: "sibling", label: "형제자매" },
  { value: "other", label: "기타" },
];

export default function GuestSajuPage() {
  const router = useRouter();
  const [input, setInput] = useState<ProfileInput>({
    label: "",
    relationshipType: "self",
    birthDate: "",
    birthTime: "12:00",
    gender: "남성",
    calendarType: "양력",
    isLeapMonth: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSavedResult, setHasSavedResult] = useState(false);
  const [savedResultNeedsRetry, setSavedResultNeedsRetry] = useState(false);

  // Read-only probe: a saved guest result must never trigger a new generation here.
  useEffect(() => {
    let isCancelled = false;

    void fetch("/api/guest-free-analysis")
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as {
          analysis?: { generationMeta?: { mainAnalysisStatus?: string } };
        };
        if (isCancelled || !body.analysis) return;
        setHasSavedResult(true);
        setSavedResultNeedsRetry(
          body.analysis.generationMeta?.mainAnalysisStatus === "failed",
        );
      })
      .catch(() => undefined);

    return () => {
      isCancelled = true;
    };
  }, []);

  async function submit() {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/guest-free-analysis/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "무료 분석을 시작하지 못했습니다.");
      router.push("/guest-loading");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "무료 분석을 시작하지 못했습니다.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
      <div className="mx-auto w-full max-w-xl">
        <p className="text-xs font-semibold tracking-[0.25em] text-stone-500">FREE SAJU</p>
        <h1 className="mt-3 text-3xl font-bold">무료 사주 조회</h1>
        <p className="mt-4 text-sm leading-7 text-stone-600">로그인 없이 출생 정보를 바탕으로 무료 분석을 확인할 수 있습니다.</p>
        {hasSavedResult ? (
          <section className="mt-6 rounded-3xl border border-stone-300 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">SAVED RESULT</p>
            <h2 className="mt-2 text-lg font-bold">
              {savedResultNeedsRetry
                ? "저장된 결과가 있습니다 · AI 해석 재생성 필요"
                : "저장된 무료 사주 결과가 있습니다"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {savedResultNeedsRetry
                ? "사주·오행·대운·추천 결과는 그대로 있고, AI 종합 해석만 결과 화면에서 다시 생성하면 됩니다."
                : "새로 분석하지 않고 이전 결과를 그대로 다시 볼 수 있습니다."}
            </p>
            <Link
              href="/guest-result"
              className="mt-4 inline-flex rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              {savedResultNeedsRetry ? "저장된 결과 열고 AI 해석 다시 생성하기" : "저장된 결과 다시 보기"}
            </Link>
            <p className="mt-4 text-xs leading-5 text-stone-500">아래 폼으로 새 출생 정보를 제출하면 새 무료 분석을 시작합니다.</p>
          </section>
        ) : null}
        <form className="mt-8 space-y-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <label className="block text-sm font-semibold">이름 또는 구분
            <input value={input.label} onChange={(event) => setInput({ ...input, label: event.target.value })} placeholder="이름 또는 구분" className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" required />
          </label>
          <label className="block text-sm font-semibold">관계
            <select value={input.relationshipType} onChange={(event) => setInput({ ...input, relationshipType: event.target.value as ProfileRelationshipType })} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3">
              {relationshipOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-semibold">생년월일
              <input type="date" min={GUEST_BIRTH_DATE_MIN} max={getGuestBirthDateMax()} value={input.birthDate} onChange={(event) => setInput({ ...input, birthDate: event.target.value })} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" required />
            </label>
            <label className="block text-sm font-semibold">태어난 시간
              <input type="time" value={input.birthTime} onChange={(event) => setInput({ ...input, birthTime: event.target.value })} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" required />
            </label>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-semibold">성별
              <select value={input.gender} onChange={(event) => setInput({ ...input, gender: event.target.value as ProfileInput["gender"] })} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3"><option value="남성">남성</option><option value="여성">여성</option></select>
            </label>
            <label className="block text-sm font-semibold">달력
              <select value={input.calendarType} onChange={(event) => setInput({ ...input, calendarType: event.target.value as ProfileInput["calendarType"], isLeapMonth: event.target.value === "양력" ? false : input.isLeapMonth })} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3"><option value="양력">양력</option><option value="음력">음력</option></select>
            </label>
          </div>
          {input.calendarType === "음력" ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={input.isLeapMonth} onChange={(event) => setInput({ ...input, isLeapMonth: event.target.checked })} /> 윤달</label> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-stone-900 px-5 py-4 font-semibold text-white disabled:bg-stone-400">{isSubmitting ? "무료 분석 중..." : "무료 사주 분석하기"}</button>
        </form>
      </div>
    </main>
  );
}