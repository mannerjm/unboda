"use client";
import type { PaidAnalysisDetailPromptInput } from "@/app/lib/paidAnalysisDetailPrompt";
import { useEffect, useMemo, useState } from "react";
import { restoreStoredResult } from "@/app/lib/restoreStoredResult";
import { getSaju } from "@/app/lib/manse";
import type { PaidAnalysisDetailOutputV2 } from "@/app/lib/paidAnalysisDetailOutput";


type SajuResult = ReturnType<typeof getSaju>;

type PaidAnalysisDetailV2ClientProps = {
  productId: string;
};

function getAnalysisType(productId: string): string {
  console.log("PRODUCT ID =", productId);

  switch (productId) {
    case "health":
      return "건강운 심층 분석";

    case "love":
      return "연애운 심층 분석";

    case "career":
      return "직업운 심층 분석";

    case "money":
      return "재물운 심층 분석";

    default:
      return "개인 맞춤 심층 분석";
  }
}
function buildBirthData(saju: SajuResult): string {
  return JSON.stringify(saju);
}
function buildOriginalChart(saju: SajuResult): string {
  return JSON.stringify(
    {
      solarDate: saju.solarDate,
      year: {
        pillar: saju.yearPillar,
        hanja: saju.yearPillarHanja,
        stem: saju.yearStem,
        branch: saju.yearBranch,
        stemTenGod: saju.yearTenGod,
        branchTenGod: saju.yearBranchTenGod,
        hiddenStems: saju.yearHiddenStems,
        stage: saju.yearStage,
        spirit: saju.yearSpirit,
        nobles: saju.yearNobles,
      },
      month: {
        pillar: saju.monthPillar,
        hanja: saju.monthPillarHanja,
        stem: saju.monthStem,
        branch: saju.monthBranch,
        stemTenGod: saju.monthTenGod,
        branchTenGod: saju.monthBranchTenGod,
        hiddenStems: saju.monthHiddenStems,
        stage: saju.monthStage,
        spirit: saju.monthSpirit,
        nobles: saju.monthNobles,
      },
      day: {
        pillar: saju.dayPillar,
        hanja: saju.dayPillarHanja,
        stem: saju.dayStem,
        branch: saju.dayBranch,
        stemTenGod: saju.dayTenGod,
        branchTenGod: saju.dayBranchTenGod,
        hiddenStems: saju.dayHiddenStems,
        stage: saju.dayStage,
        spirit: saju.daySpirit,
        nobles: saju.dayNobles,
      },
      hour: {
        pillar: saju.hourPillar,
        hanja: saju.hourPillarHanja,
        stem: saju.hourStem,
        branch: saju.hourBranch,
        stemTenGod: saju.hourTenGod,
        branchTenGod: saju.hourBranchTenGod,
        hiddenStems: saju.hourHiddenStems,
        stage: saju.hourStage,
        spirit: saju.hourSpirit,
        nobles: saju.hourNobles,
      },
    },
    null,
    2,
  );
}
function buildCoreInterpretation(saju: SajuResult): string {
  return JSON.stringify(
    {
      elementAnalysis: saju.elementAnalysis,
      elementInterpretation: saju.elementInterpretation,
      strengthAnalysis: saju.strengthAnalysis,
      elementRelations: saju.elementRelations,
      yongshinAnalysis: saju.yongshinAnalysis,
      gyeokgukAnalysis: saju.gyeokgukAnalysis,
      fortuneBrain: saju.fortuneBrain,
    },
    null,
    2,
  );
}
function buildFortuneTiming(saju: SajuResult): string {
  return JSON.stringify(
    {
      daeunAnalysis: saju.daeunAnalysis,
      currentDaeun: saju.currentDaeun,
      seunAnalysis: saju.seunAnalysis,
      currentSeun: saju.currentSeun,
      fortuneFlowAnalysis: saju.fortuneFlowAnalysis,
    },
    null,
    2,
  );
}


export default function PaidAnalysisDetailV2Client({
  productId,
}: PaidAnalysisDetailV2ClientProps) {
  const [restoredResult, setRestoredResult] = useState<string | null>(null);
  const [restoredSaju, setRestoredSaju] = useState<SajuResult | null>(null);
  const [userConcern, setUserConcern] = useState<string | null>(null);
  const [detail, setDetail] =
  useState<PaidAnalysisDetailOutputV2 | null>(null);

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
    restoredSaju && birthData && sajuSummary && currentFortuneFlow
      ? {
          analysisType,
          birthData,
          originalChart: buildOriginalChart(restoredSaju),
          coreInterpretation: buildCoreInterpretation(restoredSaju),
          fortuneTiming: buildFortuneTiming(restoredSaju),
          sajuSummary,
          currentFortuneFlow,
          userConcern: userConcern ?? undefined,
        }
      : null,
  [
     analysisType,
  restoredSaju,
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
    const response = await fetch("/api/paid-analysis-detail-v2", {
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
  (await response.json()) as PaidAnalysisDetailOutputV2;


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

    if (errorMessage) {
    return (
      <main className="min-h-screen bg-[#f7f2e8]">
        <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6">
          <div className="w-full rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-sm font-semibold tracking-[0.2em] text-neutral-500">
              UNBODA PREMIUM REPORT
            </p>

            <h1 className="mt-3 text-2xl font-bold text-neutral-900">
              심층분석을 완성하지 못했습니다
            </h1>

            <p className="mt-4 leading-7 text-neutral-600">
              분석을 생성하는 과정에서 문제가 발생했습니다.
              잠시 후 다시 시도해 주세요.
            </p>

            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-xl bg-neutral-900 px-6 py-3 font-semibold text-white"
            >
              다시 시도하기
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (isLoading || !detail) {
    return (
      <main className="min-h-screen bg-[#f7f2e8]">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
          <div className="w-full rounded-3xl bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900" />

            <p className="text-sm font-semibold tracking-[0.2em] text-neutral-500">
              UNBODA PREMIUM REPORT
            </p>

            <h1 className="mt-3 text-3xl font-bold text-neutral-900">
              심층분석 결과를 만들고 있어요
            </h1>

            <p className="mt-4 leading-7 text-neutral-600">
              사주 원국과 현재 운의 흐름을 연결하고,
              결과의 일관성과 품질을 확인하고 있습니다.
            </p>

            <div className="mt-8 space-y-3 text-left text-neutral-700">
              <div className="rounded-xl bg-neutral-50 px-5 py-4">
                원국과 오행 구조 확인
              </div>

              <div className="rounded-xl bg-neutral-50 px-5 py-4">
                대운·세운 흐름 연결
              </div>

              <div className="rounded-xl bg-neutral-50 px-5 py-4">
                개인 맞춤 심층 리포트 작성
              </div>

              <div className="rounded-xl bg-neutral-50 px-5 py-4">
                결과의 일관성과 안전성 검증
              </div>
            </div>

            <p className="mt-7 text-sm text-neutral-500">
              분석에는 잠시 시간이 걸릴 수 있습니다.
              화면을 닫지 말고 기다려 주세요.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
  <main className="min-h-screen bg-stone-100 px-4 py-8">
    <div className="mx-auto max-w-3xl">
      <div className="mb-10">
  <a
    href={`/paid-analysis/${productId}`}
    className="text-sm font-semibold text-stone-600 transition hover:text-stone-900"
  >
    ← 상품 설명으로 돌아가기
  </a>

  <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-stone-500">
    PREMIUM REPORT
  </p>

  <h1 className="mt-3 text-3xl font-bold text-stone-900 sm:text-4xl">
    {analysisType}
  </h1>

  <p className="mt-5 text-sm leading-7 text-stone-600">
    구매 권한이 확인된 사용자에게 제공되는 심층 분석 결과 페이지입니다.
  </p>
</div>
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
          AI 심층 분석 V2
        </span>

        <span className="text-xs font-medium text-stone-500">
          개인 맞춤형 프리미엄 리포트
        </span>
      </div>

      <h2 className="mt-4 text-2xl font-bold leading-tight text-stone-950 sm:text-3xl">
        {detail.heroSummary.headline}
      </h2>

      <p className="mt-3 text-sm leading-7 text-stone-600 sm:text-base">
        {detail.heroSummary.subheadline}
      </p>

      <div className="mt-5 rounded-2xl bg-stone-100 px-5 py-4">
        <p className="text-sm font-semibold leading-7 text-stone-800">
          {detail.heroSummary.keyMessage}
        </p>
      </div>
    </div>

    <div className="mt-6 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/70">
      <div className="border-b border-amber-200/70 px-5 py-4">
        <p className="text-xs font-semibold tracking-[0.18em] text-amber-700">
          분석이 필요한 이유
        </p>
      </div>

      <div className="px-5 py-5">
        <p className="text-sm leading-8 text-stone-800 sm:text-base">
          {detail.causeAnalysis.summary}
        </p>

        <ul className="mt-4 space-y-3">
          {detail.causeAnalysis.reasons.map((reason, index) => (
            <li
              key={`${reason}-${index}`}
              className="flex gap-3 rounded-xl bg-white px-4 py-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
                {index + 1}
              </span>

              <span className="text-sm leading-6 text-stone-700">
                {reason}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>

    <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">
        운의 구조 분석
      </p>

      <h3 className="mt-2 text-xl font-bold text-stone-950">
        현재 흐름을 만드는 핵심 구조
      </h3>

      <p className="mt-3 text-sm leading-7 text-stone-600">
        {detail.fortuneStructure.summary}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {detail.fortuneStructure.items.map((item, index) => (
          <article
            key={`${item.label}-${index}`}
            className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
          >
            <p className="text-xs font-semibold text-stone-500">
              {item.label}
            </p>

            <p className="mt-2 font-bold text-stone-900">
              {item.value}
            </p>

            <p className="mt-3 text-sm leading-6 text-stone-600">
              {item.interpretation}
            </p>
          </article>
        ))}
      </div>
    </div>

    <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">
        현재 상황 분석
      </p>

      <h3 className="mt-2 text-xl font-bold text-stone-950">
        지금의 기회와 주의할 점
      </h3>

      <p className="mt-3 text-sm leading-7 text-stone-600">
        {detail.currentSituation.summary}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
          <p className="font-semibold text-emerald-800">
            활용할 수 있는 기회
          </p>

          <ul className="mt-3 space-y-3">
            {detail.currentSituation.opportunities.map(
              (opportunity, index) => (
                <li
                  key={`${opportunity}-${index}`}
                  className="flex gap-2 text-sm leading-6 text-stone-700"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>{opportunity}</span>
                </li>
              ),
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4">
          <p className="font-semibold text-rose-800">
            주의해야 할 부분
          </p>

          <ul className="mt-3 space-y-3">
            {detail.currentSituation.cautions.map((caution, index) => (
              <li
                key={`${caution}-${index}`}
                className="flex gap-2 text-sm leading-6 text-stone-700"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                <span>{caution}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>

    <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">
        앞으로의 흐름
      </p>

      <h3 className="mt-2 text-xl font-bold text-stone-950">
        시기별 변화 타임라인
      </h3>

      <div className="mt-5 space-y-4">
        {detail.futureTimeline.map((item, index) => (
          <article
            key={`${item.period}-${index}`}
            className="flex gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-900 text-sm font-bold text-white">
              {index + 1}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-stone-500">
                {item.period}
              </p>

              <h4 className="mt-1 font-bold text-stone-900">
                {item.title}
              </h4>

              <p className="mt-2 text-sm leading-6 text-stone-600">
                {item.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>

    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">
          행동 가이드
        </p>

        <h3 className="mt-2 text-lg font-bold text-stone-950">
          지금 실천하면 좋은 것
        </h3>

        <ul className="mt-4 space-y-3">
          {detail.actionGuide.map((action, index) => (
            <li
              key={`${action}-${index}`}
              className="rounded-xl bg-white px-4 py-3 text-sm leading-6 text-stone-700"
            >
              {action}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5">
        <p className="text-xs font-semibold tracking-[0.18em] text-rose-700">
          주의 가이드
        </p>

        <h3 className="mt-2 text-lg font-bold text-stone-950">
          피해야 할 행동
        </h3>

        <ul className="mt-4 space-y-3">
          {detail.avoidGuide.map((avoid, index) => (
            <li
              key={`${avoid}-${index}`}
              className="rounded-xl bg-white px-4 py-3 text-sm leading-6 text-stone-700"
            >
              {avoid}
            </li>
          ))}
        </ul>
      </div>
    </div>

    <div className="mt-6 overflow-hidden rounded-[28px] bg-gradient-to-br from-stone-900 via-stone-800 to-black text-white shadow-xl">
      <div className="border-b border-white/10 px-6 py-5">
        <p className="text-xs font-semibold tracking-[0.2em] text-amber-300">
          운보다 AI 코치 메시지
        </p>

        <h3 className="mt-2 text-xl font-bold leading-tight sm:text-2xl">
          {detail.coachMessage.title}
        </h3>
      </div>

      <div className="px-6 py-6">
        <p className="text-sm leading-8 text-stone-100 sm:text-base">
          {detail.coachMessage.message}
        </p>
      </div>
    </div>

    <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">
        최종 점검
      </p>

      <h3 className="mt-2 text-xl font-bold text-stone-950">
        결정 전 확인할 체크리스트
      </h3>

      <ul className="mt-5 space-y-3">
        {detail.checklist.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-900 text-xs font-bold text-white">
              ✓
            </span>

            <span className="text-sm leading-6 text-stone-700">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  </section>
) : null}
      </div>
    </div>
  </main>
);
}