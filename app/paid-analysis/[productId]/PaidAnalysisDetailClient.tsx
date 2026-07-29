"use client";
import type { PaidAnalysisDetailPromptInput } from "@/app/lib/paidAnalysisDetailPrompt";
import { useEffect, useMemo, useState } from "react";
import { restoreStoredResult } from "@/app/lib/restoreStoredResult";
import { getSaju } from "@/app/lib/manse";
import type { PaidAnalysisDetailOutput } from "@/app/lib/paidAnalysisDetailOutput";


type SajuResult = ReturnType<typeof getSaju>;

type PaidAnalysisDetailClientProps = {
  productId: string;
};

function getAnalysisType(productId: string): string {
  switch (productId) {
    case "wealth":
      return "재물운 심층 분석";
    case "love":
      return "연애운 심층 분석";
    case "career":
      return "직업운 심층 분석";
    default:
      return "개인 맞춤 심층 분석";
  }
}
function buildBirthData(saju: SajuResult): string {
  return JSON.stringify(saju);
}

export default function PaidAnalysisDetailClient({
  productId,
}: PaidAnalysisDetailClientProps) {
  const [restoredResult, setRestoredResult] = useState<string | null>(null);
  const [restoredSaju, setRestoredSaju] = useState<SajuResult | null>(null);
  const [userConcern, setUserConcern] = useState<string | null>(null);
  const [detail, setDetail] =
  useState<PaidAnalysisDetailOutput | null>(null);

  const [isLoading, setIsLoading] = useState(false);
 
  const [errorMessage, setErrorMessage] =
  useState<string | null>(null);

  const analysisType = getAnalysisType(productId);

const birthData = restoredSaju
  ? buildBirthData(restoredSaju)
  : null;

const sajuSummary = restoredResult;
const currentFortuneFlow = restoredResult;

const promptInput = useMemo<PaidAnalysisDetailPromptInput | null>(
  () =>
    birthData && sajuSummary && currentFortuneFlow
      ? {
          analysisType,
          birthData,
          sajuSummary,
          currentFortuneFlow,
          userConcern: userConcern ?? undefined,
        }
      : null,
  [
    analysisType,
    birthData,
    sajuSummary,
    currentFortuneFlow,
    userConcern,
  ],
);

void analysisType;
void birthData;
void sajuSummary;
void currentFortuneFlow;
void userConcern;
void detail;

  useEffect(() => {
  const savedResult = sessionStorage.getItem("sajuResult");
  const savedSaju = sessionStorage.getItem("sajuData");
  const savedRecommendationExplanation =
    sessionStorage.getItem("recommendationExplanation");

    const restored = restoreStoredResult(
      savedResult,
      savedSaju,
    );

    if (!restored.ok) {
      return;
    }

    setRestoredResult(restored.result);
    setRestoredSaju(restored.saju);
    setUserConcern(savedRecommendationExplanation);
  }, []);

  useEffect(() => {
  if (!promptInput) {
    return;
  }
const input = promptInput;
  let isCancelled = false;

  async function loadDetail() {
  setIsLoading(true);
  setErrorMessage(null);

  try {
    const response = await fetch("/api/paid-analysis-detail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(
        `심층 분석 요청에 실패했습니다. (${response.status})`,
      );
    }

    const generatedDetail =
      (await response.json()) as PaidAnalysisDetailOutput;

      console.log("generatedDetail", generatedDetail);

    if (!isCancelled) {
      setDetail(generatedDetail);
    }
  } catch (error) {
    if (!isCancelled) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "심층 분석을 불러오지 못했습니다.",
      );
    }
  } finally {
    if (!isCancelled) {
      setIsLoading(false);
    }
  }
}

  void loadDetail();

  return () => {
    isCancelled = true;
  };
}, [promptInput]);

  void restoredResult;
  void restoredSaju;
  void detail;
  void isLoading;

  return (
  <pre className="whitespace-pre-wrap text-xs">
    {JSON.stringify(
      {
        hasPromptInput: Boolean(promptInput),
        isLoading,
        hasDetail: Boolean(detail),
        errorMessage,
        detail,
      },
      null,
      2,
    )}
  </pre>
);
}