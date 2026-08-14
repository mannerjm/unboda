"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AnalyzeApiResponse } from "@/app/lib/analyzeApiTypes";

async function waitForFreeAnalysis(profileId: string): Promise<AnalyzeApiResponse> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const response = await fetch(`/api/free-analysis/${profileId}`);

    if (response.status === 202) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 1000));
      continue;
    }

    const body = await response.json() as { analysis?: AnalyzeApiResponse; error?: string };
    if (response.ok && body.analysis) return body.analysis;
    throw new Error(body.error ?? "저장된 무료 분석 결과를 불러오지 못했습니다.");
  }

  throw new Error("무료 분석 결과 생성 시간이 초과되었습니다.");
}

function LoadingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();  

  useEffect(() => {
    const analyzeSaju = async () => {
      const profileId = searchParams.get("profileId") || "";
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ profileId }),
        });

        let data: AnalyzeApiResponse;

        if (response.status === 202) {
          data = await waitForFreeAnalysis(profileId);
        } else {
          data = await response.json() as AnalyzeApiResponse;
        }

        if (!response.ok || "error" in data) {
  throw new Error(
    "error" in data ? data.error : "AI 분석에 실패했습니다."
  );
}

if (!data.result || !data.saju) {
  throw new Error("분석 결과 데이터가 올바르지 않습니다.");
}

        sessionStorage.setItem(
          `freeAnalysisResult:${data.profile.id}`,
          JSON.stringify(data),
        );

        const params = new URLSearchParams({
           profileId: data.profile.id,
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

      <p className="mb-3 text-base font-semibold text-stone-800">
        분석에는 약 1~2분 정도 소요될 수 있습니다.
      </p>

      <p className="text-sm leading-7 text-stone-600">
        잠시만 기다려 주세요. 분석이 완료되면 결과 화면으로 자동 이동합니다.
      </p>

      <p className="mt-3 text-xs leading-6 text-stone-500">
        분석 중에는 이 페이지를 닫거나 새로고침하지 않는 것을 권장합니다.
      </p>

      <div className="mt-8 w-16 h-16 border-4 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
    </main>
  );
}
export default function LoadingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea]">
          <p className="text-sm text-stone-500">
            사주 데이터를 준비하고 있습니다...
          </p>
        </main>
      }
    >
      <LoadingPageContent />
    </Suspense>
  );
}
