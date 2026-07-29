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
  <div className="mt-6 space-y-4">
    {detail ? (
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">
          AI DEEP ANALYSIS
        </p>

        <h2 className="mt-3 text-2xl font-bold leading-tight text-stone-900">
          {detail.headline}
        </h2>
        <div className="mt-5 rounded-2xl bg-stone-50 p-5">
  <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">
    WHY THIS ANALYSIS
  </p>

  <p className="mt-2 text-sm leading-7 text-stone-700">
    {detail.whyThisAnalysis}
  </p>
</div>
<div className="mt-4 rounded-2xl border border-stone-200 p-5">
  <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">
    CURRENT FLOW
  </p>

  <p className="mt-2 text-sm leading-7 text-stone-700">
    {detail.currentFlow}
  </p>
</div>
<div className="mt-4 rounded-2xl border border-stone-200 p-5">
  <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">
    QUESTIONS ANSWERED
  </p>

  <ul className="mt-3 space-y-3">
    {detail.questionsAnswered.map((question) => (
      <li
        key={question}
        className="rounded-xl bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700"
      >
        {question}
      </li>
    ))}
  </ul>
</div>
<div className="mt-4 rounded-2xl border border-stone-200 p-5">
  <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">
    EXPECTED BENEFITS
  </p>

  <ul className="mt-3 space-y-3">
    {detail.expectedBenefits.map((benefit) => (
      <li
        key={benefit}
        className="rounded-xl bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700"
      >
        {benefit}
      </li>
    ))}
  </ul>
</div>
<div className="mt-4 rounded-2xl bg-stone-900 p-5 text-white">
  <p className="text-xs font-semibold tracking-[0.18em] text-stone-300">
    WHY NOW
  </p>

  <p className="mt-2 text-sm leading-7 text-stone-100">
    {detail.whyNow}
  </p>
</div>
<div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
  <p className="text-xs font-semibold tracking-[0.18em] text-amber-700">
    NEXT STEP
  </p>

  <p className="mt-2 text-sm font-medium leading-7 text-stone-800">
    {detail.ctaMessage}
  </p>
</div>
      </section>
    ) : null}

  </div>
);
}