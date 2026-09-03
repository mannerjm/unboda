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
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#fcfaf6] px-6 py-12 text-center text-stone-900">
      <div className="flex w-full max-w-md flex-col items-center">
        <p className="text-xs font-semibold tracking-[0.24em] text-[#a47735]">운보다 AI 분석 중</p>
        <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl">사주를 분석하고 있어요</h1>
        <p className="mt-5 text-sm leading-7 text-stone-600 sm:text-base">입력하신 정보를 바탕으로<br />분석 결과를 만들고 있습니다.</p>
        <p className="mt-6 text-xs leading-6 text-stone-500">완료되면 결과 화면으로 자동 이동합니다.</p>
        <div className="mt-8 h-12 w-12 animate-spin rounded-full border-[3px] border-[#e5dccd] border-t-[#b8893c]" />
      </div>
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
