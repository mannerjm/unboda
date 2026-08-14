"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileDto } from "@/app/lib/profiles/types";
import type { AnalyzeSuccessResponse } from "@/app/lib/analyzeApiTypes";

export default function SajuPage() {
  const router = useRouter();

  const [activeProfile, setActiveProfile] = useState<ProfileDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    void fetch("/api/profiles/active")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const body = await response.json() as { profile?: ProfileDto | null };
        setActiveProfile(body.profile ?? null);
      })
      .catch(() => setValidationMessage("활성 프로필을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, []);

  const startAnalysis = async () => {
    if (!activeProfile) {
      setValidationMessage("마이페이지에서 활성 분석 대상을 선택해 주세요.");
      return;
    }

    setIsStarting(true);
    setValidationMessage("");

    try {
      const response = await fetch(`/api/free-analysis/${activeProfile.id}`);

      if (response.ok) {
        const body = await response.json() as { analysis?: AnalyzeSuccessResponse };

        if (body.analysis?.profile.id === activeProfile.id) {
          sessionStorage.setItem(
            `freeAnalysisResult:${activeProfile.id}`,
            JSON.stringify(body.analysis),
          );
          router.push(`/result?profileId=${activeProfile.id}`);
          return;
        }
      }

      if (response.status === 404 || response.status === 202) {
        router.push(`/loading?profileId=${activeProfile.id}`);
        return;
      }

      throw new Error("저장된 무료 분석 결과를 확인하지 못했습니다.");
    } catch {
      setValidationMessage("무료 분석 결과를 확인하지 못했습니다. 다시 시도해 주세요.");
      setIsStarting(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#f7f3ea] px-6">
      <h1 className="text-5xl font-bold mb-8">사주 조회</h1>

      <div className="w-full max-w-md space-y-5">
        {isLoading ? <p className="text-sm text-stone-600">활성 분석 대상을 불러오는 중입니다.</p> : null}
        {activeProfile ? (
          <div className="rounded-xl border border-stone-200 bg-white p-5 text-sm leading-7 text-stone-700">
            <p className="font-semibold text-stone-900">활성 분석 대상: {activeProfile.label}</p>
            <p>{activeProfile.birthDate} · {activeProfile.birthTime} · {activeProfile.gender} · {activeProfile.calendarType}</p>
            <a href="/mypage" className="mt-3 inline-block font-semibold text-stone-900">마이페이지에서 대상 변경</a>
          </div>
        ) : null}

        <button
          onClick={() => void startAnalysis()}
          disabled={!activeProfile || isLoading || isStarting}
          className="block w-full rounded-xl bg-black p-4 text-center text-white disabled:bg-stone-400"
        >
          {isStarting ? "분석 결과를 확인하는 중..." : "운보다 AI로 분석하기"}
        </button>
        {validationMessage ? (
          <p className="text-sm text-red-600">{validationMessage}</p>
        ) : null}
      </div>
    </main>
  );
}