"use client";

import MysticLoadingScreen from "@/app/components/MysticLoadingScreen";

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
    <MysticLoadingScreen
      description="저장한 프로필의 명리 구조와 현재 흐름을 확인하고 있습니다. 잠시 뒤 결과로 이어집니다."
    />
  );
}
export default function LoadingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0b122b]" />
      }
    >
      <LoadingPageContent />
    </Suspense>
  );
}
