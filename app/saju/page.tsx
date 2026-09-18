"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileDto } from "@/app/lib/profiles/types";
import type { AnalyzeSuccessResponse } from "@/app/lib/analyzeApiTypes";
import AppShell from "@/app/components/AppShell";

export default function SajuPage() {
  const router = useRouter();

  const [activeProfile, setActiveProfile] = useState<ProfileDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadActiveProfile = async () => {
      try {
        const activeResponse = await fetch("/api/profiles/active");
        if (!activeResponse.ok) throw new Error();

        const body = await activeResponse.json() as { profile?: ProfileDto | null };
        const profile = body.profile ?? null;

        if (cancelled) return;
        setActiveProfile(profile);

        if (!profile) return;

        const analysisResponse = await fetch(`/api/free-analysis/${profile.id}`);
        if (!analysisResponse.ok) return;

        const analysisBody = await analysisResponse.json() as { analysis?: AnalyzeSuccessResponse };
        if (analysisBody.analysis?.profile.id !== profile.id || cancelled) return;

        sessionStorage.setItem(
          `freeAnalysisResult:${profile.id}`,
          JSON.stringify(analysisBody.analysis),
        );
        router.replace(`/result?profileId=${profile.id}`);
      } catch {
        if (!cancelled) {
          setValidationMessage("활성 프로필을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadActiveProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const startAnalysis = async () => {
    if (!activeProfile) {
      setValidationMessage("마이페이지에서 분석 대상을 선택해 주세요.");
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

  if (isLoading) {
    return (
      <AppShell activeProfileId={activeProfile?.id}>
        <main className="min-h-screen bg-[#f5f7fc]">
          <p className="sr-only" aria-live="polite">저장된 분석 결과를 확인하는 중입니다.</p>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell activeProfileId={activeProfile?.id}>
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#f5f7fc] px-6 py-12">
        <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-[#dfe3ef] bg-white shadow-[0_22px_60px_rgba(32,38,72,0.08)]">
          <div className="bg-[linear-gradient(135deg,#0a1128,#14183a_58%,#241b43)] px-7 py-8 text-white sm:px-10">
            <p className="text-xs font-black tracking-[0.16em] text-[#aa9cff]">내 무료 분석</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">내 흐름 이어보기</h1>
            <p className="mt-3 text-sm leading-7 text-[#b7bdd1]">저장된 분석이 있으면 바로 이어보고, 없으면 현재 프로필로 새 무료 분석을 시작합니다.</p>
          </div>

          <div className="space-y-5 p-7 sm:p-10">
            {activeProfile ? (
              <div className="rounded-2xl border border-[#e0e4ef] bg-[#f8f9fd] p-5 text-sm leading-7 text-[#5f6881]">
                <p className="font-bold text-[#11162d]">분석 대상: {activeProfile.label}</p>
                <p>{activeProfile.birthDate} · {activeProfile.birthTime} · {activeProfile.gender} · {activeProfile.calendarType}</p>
                <a href="/mypage" className="mt-3 inline-block font-bold text-[#6555c6]">마이페이지에서 대상 변경</a>
              </div>
            ) : null}

            <button
              onClick={() => void startAnalysis()}
              disabled={!activeProfile || isStarting}
              className="block w-full rounded-2xl bg-[linear-gradient(135deg,#6f5ce7,#8d68ef)] p-4 text-center text-base font-black text-white shadow-[0_12px_28px_rgba(111,92,231,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isStarting ? "분석 결과를 확인하는 중..." : "운보다 AI로 분석하기"}
            </button>
            {validationMessage ? (
              <p className="text-sm text-red-600">{validationMessage}</p>
            ) : null}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
