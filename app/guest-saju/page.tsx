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
    birthTime: "",
    birthTimeKnown: true,
    gender: "남성",
    calendarType: "양력",
    isLeapMonth: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [age14OrOlderConfirmed, setAge14OrOlderConfirmed] = useState(false);
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
    if (!age14OrOlderConfirmed) {
      setError("무료 분석을 시작하려면 서비스 이용자가 만 14세 이상임을 확인해 주세요.");
      document.getElementById("guest-age-confirmation")?.focus();
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/guest-free-analysis/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, age14OrOlderConfirmed: true }),
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
    <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-[#11162d] sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#59617b] transition hover:text-[#11162d]">
          ← 운보다 홈으로
        </Link>

        <section className="relative mt-5 overflow-hidden rounded-[2.2rem] border border-[#7064b8]/20 bg-[linear-gradient(135deg,#091127_0%,#111735_55%,#21183d_100%)] px-6 py-8 text-white shadow-[0_24px_70px_rgba(23,24,55,0.16)] sm:px-9 sm:py-10">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#765de7]/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-[14%] h-52 w-52 rounded-full bg-[#e56b9b]/12 blur-3xl" />
          <div className="relative max-w-2xl">
            <p className="text-xs font-black tracking-[0.16em] text-[#b0a2ff]">무료 분석부터 시작</p>
            <h1 className="mt-3 text-3xl font-black leading-tight tracking-[-0.05em] sm:text-4xl">
              먼저, 나의 흐름부터<br className="hidden sm:block" /> 확인해볼까요?
            </h1>
            <p className="mt-4 text-sm leading-7 text-[#b7bdd1] sm:text-base">
              로그인 없이 출생 정보를 입력하면 사주 구조와 현재 흐름을 무료로 확인할 수 있어요.
              결과에서 궁금한 질문이 생기면 그때 더 깊은 분석으로 이어가면 됩니다.
            </p>
          </div>
        </section>

        {hasSavedResult ? (
          <section className="mt-6 rounded-[1.6rem] border border-[#dfe3ef] bg-white p-6 shadow-[0_14px_40px_rgba(32,38,72,0.06)]">
            <p className="text-xs font-black tracking-[0.14em] text-[#7768c7]">저장된 무료 결과</p>
            <h2 className="mt-2 text-lg font-black">
              {savedResultNeedsRetry
                ? "저장된 결과가 있습니다 · AI 해석 재생성 필요"
                : "이전에 본 무료 결과가 있습니다"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#69708a]">
              {savedResultNeedsRetry
                ? "사주·오행·대운·추천 결과는 그대로 있고, AI 종합 해석만 결과 화면에서 다시 생성하면 됩니다."
                : "새로 분석하지 않고 이전 결과를 그대로 다시 볼 수 있습니다."}
            </p>
            <Link
              href="/guest-result"
              className="mt-4 inline-flex rounded-xl bg-[#111735] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1d254c]"
            >
              {savedResultNeedsRetry ? "저장된 결과 열고 AI 해석 다시 생성하기" : "저장된 결과 다시 보기"}
            </Link>
            <p className="mt-4 text-xs leading-5 text-[#7b8299]">아래 폼에 새 정보를 입력하면 새 무료 분석을 시작합니다.</p>
          </section>
        ) : null}

        <form
          className="mt-6 space-y-5 rounded-[2rem] border border-[#dfe3ef] bg-white p-6 shadow-[0_20px_55px_rgba(32,38,72,0.07)] sm:p-8"
          onSubmit={(event) => { event.preventDefault(); void submit(); }}
        >
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e7eaf2] pb-5">
            <div>
              <p className="text-xs font-black tracking-[0.14em] text-[#7768c7]">출생 정보 입력</p>
              <h2 className="mt-2 text-xl font-black">무료 분석에 필요한 정보만 입력해 주세요.</h2>
            </div>
            <span className="rounded-full bg-[#f0edff] px-3 py-1.5 text-xs font-bold text-[#6555c6]">로그인 없이 가능</span>
          </div>

          <label className="block text-sm font-bold">이름 또는 구분
            <input value={input.label} onChange={(event) => setInput({ ...input, label: event.target.value })} placeholder="이름 또는 구분" className="mt-2 w-full rounded-xl border border-[#d8ddea] bg-[#fbfcff] px-4 py-3 outline-none transition focus:border-[#7a67e8] focus:ring-4 focus:ring-[#7a67e8]/10" required />
          </label>
          <label className="block text-sm font-bold">관계
            <select value={input.relationshipType} onChange={(event) => setInput({ ...input, relationshipType: event.target.value as ProfileRelationshipType })} className="mt-2 w-full rounded-xl border border-[#d8ddea] bg-[#fbfcff] px-4 py-3 outline-none transition focus:border-[#7a67e8] focus:ring-4 focus:ring-[#7a67e8]/10">
              {relationshipOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-bold">생년월일
              <input type="date" min={GUEST_BIRTH_DATE_MIN} max={getGuestBirthDateMax()} value={input.birthDate} onChange={(event) => setInput({ ...input, birthDate: event.target.value })} className="mt-2 w-full rounded-xl border border-[#d8ddea] bg-[#fbfcff] px-4 py-3 outline-none transition focus:border-[#7a67e8] focus:ring-4 focus:ring-[#7a67e8]/10" required />
            </label>
            <div className="space-y-2">
              <label className="block text-sm font-bold" htmlFor="guest-birth-time">태어난 시간</label>
              <input id="guest-birth-time" type="time" value={input.birthTimeKnown === false ? "" : input.birthTime} disabled={input.birthTimeKnown === false} onChange={(event) => setInput({ ...input, birthTime: event.target.value })} className="w-full rounded-xl border border-[#d8ddea] bg-[#fbfcff] px-4 py-3 outline-none transition focus:border-[#7a67e8] focus:ring-4 focus:ring-[#7a67e8]/10 disabled:bg-slate-100" required={input.birthTimeKnown !== false} />
              <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={input.birthTimeKnown === false} onChange={(event) => setInput({ ...input, birthTimeKnown: !event.target.checked, birthTime: event.target.checked ? "12:00" : "" })} className="h-4 w-4 accent-[#6f5ce7]" />
                출생 시간 모름
              </label>
              {input.birthTimeKnown === false ? <p className="text-xs leading-5 text-slate-600">임시 시각은 사주 계산에만 사용하며, 결과의 시주는 ‘시간 미상’으로 표시합니다.</p> : null}
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-bold">성별
              <select value={input.gender} onChange={(event) => setInput({ ...input, gender: event.target.value as ProfileInput["gender"] })} className="mt-2 w-full rounded-xl border border-[#d8ddea] bg-[#fbfcff] px-4 py-3 outline-none transition focus:border-[#7a67e8] focus:ring-4 focus:ring-[#7a67e8]/10"><option value="남성">남성</option><option value="여성">여성</option></select>
            </label>
            <label className="block text-sm font-bold">달력
              <select value={input.calendarType} onChange={(event) => setInput({ ...input, calendarType: event.target.value as ProfileInput["calendarType"], isLeapMonth: event.target.value === "양력" ? false : input.isLeapMonth })} className="mt-2 w-full rounded-xl border border-[#d8ddea] bg-[#fbfcff] px-4 py-3 outline-none transition focus:border-[#7a67e8] focus:ring-4 focus:ring-[#7a67e8]/10"><option value="양력">양력</option><option value="음력">음력</option></select>
            </label>
          </div>
          {input.calendarType === "음력" ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={input.isLeapMonth} onChange={(event) => setInput({ ...input, isLeapMonth: event.target.checked })} className="accent-[#6f5ce7]" /> 윤달</label> : null}
          <div role="group" aria-labelledby="guest-age-confirmation-label" aria-describedby={error ? "guest-analysis-error" : undefined} className="rounded-2xl bg-[#f7f8fc] px-4 py-3">
            <label htmlFor="guest-age-confirmation" id="guest-age-confirmation-label" className="flex min-h-11 items-center gap-3 text-sm font-bold text-[#222842]">
              <input
                id="guest-age-confirmation"
                name="age14OrOlderConfirmed"
                type="checkbox"
                checked={age14OrOlderConfirmed}
                onChange={(event) => { setAge14OrOlderConfirmed(event.target.checked); if (event.target.checked) setError(null); }}
                className="h-5 w-5 shrink-0 rounded border-[#aab1c8] accent-[#6f5ce7] focus:ring-2 focus:ring-[#6f5ce7] focus:ring-offset-2"
                aria-invalid={Boolean(error && !age14OrOlderConfirmed)}
              />
              <span>저는 만 14세 이상입니다.</span>
            </label>
            <p className="mt-1 pl-8 text-xs leading-5 text-[#7b8299]">서비스 이용자 기준이며, 분석 대상의 나이와는 다릅니다.</p>
          </div>
          {error ? <p id="guest-analysis-error" role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-[linear-gradient(135deg,#6f5ce7,#8d68ef)] px-5 py-4 font-black text-white shadow-[0_12px_28px_rgba(111,92,231,0.22)] transition hover:brightness-105 disabled:opacity-55">{isSubmitting ? "무료 분석 중..." : "무료로 내 흐름 보기"}</button>
        </form>
      </div>
    </main>
  );
}
