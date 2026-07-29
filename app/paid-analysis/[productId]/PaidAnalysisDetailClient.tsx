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
  <main className="min-h-screen bg-stone-100 px-4 py-8">
    <div className="mx-auto max-w-3xl">
      <header className="overflow-hidden rounded-[2rem] bg-stone-950 px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10">
        <p className="text-xs font-semibold tracking-[0.22em] text-amber-300">
          운보다 AI 명리 심층분석
        </p>

        <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
          당신의 현재 운에서
          <br />
          가장 먼저 확인해야 할 흐름
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">
          단순한 운세 요약이 아니라, 현재 사주 흐름과 고민을 함께 살펴
          지금 필요한 판단과 행동의 방향을 정리했습니다.
        </p>
      </header>

      <div className="mt-8 space-y-5">
        {detail ? (
          <section className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="border-b border-stone-200 pb-6">
  <div className="flex flex-wrap items-center gap-2">
    <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white">
      AI 심층 분석
    </span>

    <span className="text-xs font-medium text-stone-500">
      개인 맞춤형 프리미엄 리포트
    </span>
  </div>

  <h2 className="mt-4 text-2xl font-bold leading-snug text-stone-950 sm:text-3xl">
    {detail.headline}
  </h2>

  <p className="mt-3 text-sm leading-7 text-stone-500">
    사주 원국과 현재 운의 흐름을 함께 분석하여 지금 필요한 판단 기준을
    정리했습니다.
  </p>
  <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-stone-100 pt-4">
  <div className="flex items-center gap-2">
    <span className="h-2 w-2 rounded-full bg-emerald-500" />
    <span className="text-xs font-medium text-stone-600">
      AI 분석 완료
    </span>
  </div>

  <div className="flex items-center gap-2">
    <span className="h-2 w-2 rounded-full bg-amber-500" />
    <span className="text-xs font-medium text-stone-600">
      사주·운세 흐름 반영
    </span>
  </div>

  <div className="flex items-center gap-2">
    <span className="h-2 w-2 rounded-full bg-stone-400" />
    <span className="text-xs font-medium text-stone-600">
      개인 맞춤 결과
    </span>
  </div>
</div>
</div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/70">
  <div className="border-b border-amber-200/70 px-5 py-4 sm:px-6">
    <p className="text-xs font-semibold tracking-[0.18em] text-amber-700">
      이 분석이 필요한 이유
    </p>
  </div>

  <div className="px-5 py-5 sm:px-6">
    <p className="text-base font-medium leading-8 text-stone-800">
      {detail.whyThisAnalysis}
    </p>
  </div>
</div>

            <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
  <div className="flex items-start gap-4">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-900 text-sm font-bold text-white">
      01
    </div>

    <div className="min-w-0">
      <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">
        현재 운의 흐름
      </p>

      <p className="mt-2 text-sm leading-7 text-stone-700 sm:text-base sm:leading-8">
        {detail.currentFlow}
      </p>
    </div>
  </div>
</div>

            <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
  <div className="flex items-start gap-4">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-900 text-sm font-bold text-white">
      02
    </div>

    <div className="min-w-0 flex-1">
      <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">
        이번 분석에서 확인할 핵심 질문
      </p>

      <ul className="mt-4 space-y-3">
        {detail.questionsAnswered.map((question, index) => (
          <li
            key={`${question}-${index}`}
            className="flex gap-3 rounded-xl bg-stone-50 px-4 py-3"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-stone-600 shadow-sm">
              {index + 1}
            </span>

            <span className="text-sm leading-6 text-stone-700 sm:text-base sm:leading-7">
              {question}
            </span>
          </li>
        ))}
      </ul>
    </div>
  </div>
</div>

            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 sm:p-6">
  <div className="flex items-start gap-4">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
      ✓
    </div>

    <div className="min-w-0 flex-1">
      <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">
        이번 분석을 통해 얻을 수 있는 것
      </p>

      <ul className="mt-4 space-y-3">
        {detail.expectedBenefits.map((benefit, index) => (
          <li
            key={`${benefit}-${index}`}
            className="rounded-xl border border-emerald-100 bg-white px-4 py-3"
          >
            <p className="text-sm leading-6 text-stone-700 sm:text-base sm:leading-7">
              {benefit}
            </p>
          </li>
        ))}
      </ul>
    </div>
  </div>
</div>
            <div className="mt-6 overflow-hidden rounded-[28px] bg-gradient-to-br from-stone-900 via-stone-800 to-black text-white shadow-xl">
  <div className="border-b border-white/10 px-6 py-5">
    <p className="text-xs font-semibold tracking-[0.2em] text-amber-300">
      지금 이 분석이 중요한 이유
    </p>

    <h3 className="mt-2 text-xl font-bold leading-tight">
      운의 흐름은 시기를 놓치면
      <br />
      같은 결과를 만들기 어렵습니다.
    </h3>
  </div>

  <div className="px-6 py-6">
    <p className="leading-8 text-stone-100">
      {detail.whyNow}
    </p>
  </div>
</div>

            <div className="mt-4 overflow-hidden rounded-[28px] border border-amber-200 bg-white shadow-sm">
  <div className="px-6 py-6 sm:px-7 sm:py-7">
    <p className="text-xs font-semibold tracking-[0.2em] text-amber-700">
      운보다가 전하는 마지막 안내
    </p>

    <p className="mt-3 text-lg font-semibold leading-8 text-stone-900 sm:text-xl sm:leading-9">
      {detail.ctaMessage}
    </p>

    <div className="mt-5 h-px bg-gradient-to-r from-amber-200 via-stone-200 to-transparent" />

    <p className="mt-4 text-sm leading-6 text-stone-500">
      지금의 흐름을 이해하는 것이 앞으로의 선택을 더 분명하게 만드는
      출발점이 됩니다.
    </p>
  </div>
</div>
          </section>
        ) : null}
      </div>
    </div>
  </main>
);
}