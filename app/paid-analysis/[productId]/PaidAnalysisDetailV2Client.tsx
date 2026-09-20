"use client";
import { startTransition, useEffect, useState } from "react";
import type {
  PaidAnalysisDetailOutputV3,
  ResolvedPaidAnalysisDetailV4,
  StoredPaidAnalysisDetail,
} from "@/app/lib/paidAnalysisDetailOutput";
import { isPaidAnalysisDetailV4 } from "@/app/lib/paidAnalysisDetailOutput";
import {
  getCanonicalPremiumProductId,
  getPremiumProduct,
} from "@/app/lib/premiumProductRegistry";
import PeriodTimelineSection from "./PeriodTimelineSection";
import PaidAnalysisV4Report from "./PaidAnalysisV4Report";
import PaidReportPreparing from "@/app/components/PaidReportPreparing";


type PaidAnalysisDetailV2ClientProps = {
  productId: string;
  profileId?: string;
  edition?: string;
};

function getAnalysisType(productId: string): string {
  console.log("PRODUCT ID =", productId);

  const canonicalProductId =
    getCanonicalPremiumProductId(productId);

  const registryProduct =
    getPremiumProduct(canonicalProductId);

  return registryProduct?.analysisType ?? "개인 맞춤 심층 분석";
}
export default function PaidAnalysisDetailV2Client({
  productId,
  profileId,
  edition,
}: PaidAnalysisDetailV2ClientProps) {
  const [detail, setDetail] =
  useState<PaidAnalysisDetailOutputV3 | null>(null);

  const [v4Detail, setV4Detail] =
  useState<ResolvedPaidAnalysisDetailV4 | null>(null);

  const [isLoading, setIsLoading] = useState(false);
 
  const [errorMessage, setErrorMessage] =
  useState<string | null>(null);
  const [isGeneratingElsewhere, setIsGeneratingElsewhere] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const analysisType = getAnalysisType(productId);

void analysisType;
void detail;

  useEffect(() => {
  if (!profileId) {
    startTransition(() => setErrorMessage("분석 대상을 확인하지 못했습니다."));
    return;
  }
  let isCancelled = false;

  async function loadDetail() {
  setIsLoading(true);
  setErrorMessage(null);
  setIsGeneratingElsewhere(false);

  try {
    const response = await fetch("/api/paid-analysis-detail-v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId, profileId, edition }),
    });

    if (response.status === 202) {
      if (!isCancelled) {
        setIsGeneratingElsewhere(true);
      }
      return;
    }

    if (!response.ok) {
      throw new Error(
        `심층 분석 요청에 실패했습니다. (${response.status})`,
      );
    }

   const generatedDetail =
  (await response.json()) as StoredPaidAnalysisDetail;


    if (!isCancelled) {
      if (isPaidAnalysisDetailV4(generatedDetail)) {
        setV4Detail(generatedDetail);
        setDetail(null);
      } else {
        setDetail(generatedDetail);
        setV4Detail(null);
      }
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
}, [edition, productId, profileId, retryCount]);

  useEffect(() => {
    if (!isGeneratingElsewhere || !profileId) return;
    let cancelled = false;
    let inFlight = false;
    const params = new URLSearchParams({ productId, profileId });
    if (edition) params.set("edition", edition);

    const pollStatus = async () => {
      if (inFlight || cancelled) return;
      inFlight = true;
      try {
        const response = await fetch(`/api/paid-analysis-detail-v2/status?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("리포트 생성 상태를 확인하지 못했습니다.");
        const result = await response.json() as { status: "preparing" | "generating" | "completed" | "failed" };
        if (cancelled) return;
        if (result.status === "completed") {
          setIsGeneratingElsewhere(false);
          setRetryCount((count) => count + 1);
        } else if (result.status === "failed") {
          setIsGeneratingElsewhere(false);
          setErrorMessage("리포트 생성 중 문제가 발생했습니다. 기존 구매로 다시 확인해 주세요.");
        }
      } catch {
        if (!cancelled) {
          setIsGeneratingElsewhere(false);
          setErrorMessage("리포트 상태를 확인하지 못했습니다. 기존 구매로 다시 확인해 주세요.");
        }
      } finally {
        inFlight = false;
      }
    };
    const timer = window.setInterval(() => { void pollStatus(); }, 4_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isGeneratingElsewhere, productId, profileId, edition]);

  void detail;
  void isLoading;

  if (v4Detail) {
    return (
      <PaidAnalysisV4Report detail={v4Detail} analysisType={analysisType} />
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-8">
        <PaidReportPreparing kind="premium" failed />
        <div className="mx-auto mt-5 max-w-2xl text-center">
          <p className="text-sm leading-6 text-red-700">리포트 생성 요청을 완료하지 못했습니다. 다시 결제할 필요는 없습니다.</p>
          <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="mt-4 rounded-xl bg-[#171a3d] px-6 py-3 text-sm font-semibold text-white">
            기존 구매로 다시 확인하기
          </button>
        </div>
      </main>
    );
  }

  if (isGeneratingElsewhere || isLoading || !detail) {
    return (
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-8">
        <PaidReportPreparing kind="premium" />
      </main>
    );
  }

  return (
  <main className="min-h-screen bg-[#eef0f6] px-4 py-8">
    <div className="mx-auto max-w-3xl">
      <div className="mb-10">
  <a
    href={`/paid-analysis/${productId}?profileId=${profileId}`}
    className="text-sm font-semibold text-slate-600 transition hover:text-[#11162d]"
  >
    ← 상품 설명으로 돌아가기
  </a>

  <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-slate-500">
    PREMIUM REPORT
  </p>

  <h1 className="mt-3 text-3xl font-bold text-[#11162d] sm:text-4xl">
    {analysisType}
  </h1>

  {detail.referencePeriod ? (
    <p className="mt-3 inline-flex rounded-full bg-[#e9ecf4] px-3 py-1 text-xs font-semibold text-slate-700">
      분석 기준 · {detail.referencePeriod.labelSnapshot}
    </p>
  ) : null}

  <p className="mt-5 text-[15px] leading-7 text-slate-700">
    구매 권한이 확인된 사용자에게 제공되는 심층 분석 결과 페이지입니다.
  </p>
</div>
      <header className="overflow-hidden rounded-[2rem] bg-[#171a3d] px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10">
        <p className="text-xs font-semibold tracking-[0.22em] text-[#b9b2f6]">
          운보다 AI 명리 심층분석
        </p>

        <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
          당신의 현재 운에서
          <br />
          가장 먼저 확인해야 할 흐름
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
          단순한 운세 요약이 아니라, 현재 사주 흐름과 고민을 함께 살펴
          지금 필요한 판단과 행동의 방향을 정리했습니다.
        </p>
      </header>

      <div className="mt-6 space-y-4">
        {detail ? (
  <section className="rounded-[2rem] border border-[#dce1ef] bg-white p-5 shadow-sm sm:p-8">
    <div className="border-b border-[#dce1ef] pb-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#171a3d] px-3 py-1 text-xs font-semibold text-white">
          AI 심층 분석 V2
        </span>

        <span className="text-xs font-medium text-slate-500">
          개인 맞춤형 프리미엄 리포트
        </span>
      </div>

      <h2 className="mt-4 text-2xl font-bold leading-tight text-[#11162d] sm:text-3xl">
        {detail.heroSummary.headline}
      </h2>

      <p className="mt-3 text-[15px] leading-7 text-slate-700 sm:text-base">
        {detail.heroSummary.subheadline}
      </p>

      <div className="mt-5 rounded-2xl bg-[#eef0f6] px-5 py-4">
        <p className="text-sm font-semibold leading-7 text-slate-800">
          {detail.heroSummary.keyMessage}
        </p>
      </div>
    </div>

    <div className="mt-6 overflow-hidden rounded-2xl border border-[#d8d3ff] bg-[#f3f1ff]">
      <div className="border-b border-amber-200/70 px-5 py-4">
        <p className="text-xs font-semibold tracking-[0.18em] text-[#5e4bd1]">
          분석이 필요한 이유
        </p>
      </div>

      <div className="px-5 py-5">
        <p className="text-sm leading-8 text-slate-800 sm:text-base">
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

              <span className="text-[15px] leading-7 text-slate-700">
                {reason}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>

    <div className="mt-5 rounded-2xl border border-[#dce1ef] bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">
        운의 구조 분석
      </p>

      <h3 className="mt-2 text-xl font-bold text-[#11162d]">
        현재 흐름을 만드는 핵심 구조
      </h3>

      <p className="mt-3 text-[15px] leading-7 text-slate-700">
        {detail.fortuneStructure.summary}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {detail.fortuneStructure.items.map((item, index) => (
          <article
            key={`${item.label}-${index}`}
            className="rounded-2xl border border-[#dce1ef] bg-[#f7f8fc] p-4"
          >
            <p className="text-xs font-semibold text-slate-500">
              {item.label}
            </p>

            <p className="mt-2 font-bold text-[#11162d]">
              {item.value}
            </p>

            <p className="mt-3 text-[15px] leading-7 text-slate-700">
              {item.interpretation}
            </p>
          </article>
        ))}
      </div>
    </div>

    <div className="mt-5 rounded-2xl border border-[#dce1ef] bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">
        현재 상황 분석
      </p>

      <h3 className="mt-2 text-xl font-bold text-[#11162d]">
        지금의 기회와 주의할 점
      </h3>

      <p className="mt-3 text-[15px] leading-7 text-slate-700">
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
                  className="flex gap-2 text-[15px] leading-7 text-slate-700"
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
                className="flex gap-2 text-[15px] leading-7 text-slate-700"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                <span>{caution}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>

    <div className="mt-5 rounded-2xl border border-[#dce1ef] bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">
        앞으로의 흐름
      </p>

      <h3 className="mt-2 text-xl font-bold text-[#11162d]">
        앞으로 확인할 변화 신호
      </h3>

      <div className="mt-5 space-y-4">
        {detail.futureTimeline.map((item, index) => (
          <article
            key={`${item.period}-${index}`}
            className="flex gap-4 rounded-2xl border border-[#dce1ef] bg-[#f7f8fc] p-4"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#171a3d] text-sm font-bold text-white">
              {index + 1}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-slate-500">
                {item.period}
              </p>

              <h4 className="mt-1 font-bold text-[#11162d]">
                {item.title}
              </h4>

              <p className="mt-2 text-[15px] leading-7 text-slate-700">
                {item.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>

    {detail.periodAnalysis ? (
      <PeriodTimelineSection periodAnalysis={detail.periodAnalysis} />
    ) : null}

    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">
          행동 가이드
        </p>

        <h3 className="mt-2 text-lg font-bold text-[#11162d]">
          지금 실천하면 좋은 것
        </h3>

        <ul className="mt-4 space-y-3">
          {detail.actionGuide.map((action, index) => (
            <li
              key={`${action}-${index}`}
              className="rounded-xl bg-white px-4 py-3 text-[15px] leading-7 text-slate-700"
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

        <h3 className="mt-2 text-lg font-bold text-[#11162d]">
          피해야 할 행동
        </h3>

        <ul className="mt-4 space-y-3">
          {detail.avoidGuide.map((avoid, index) => (
            <li
              key={`${avoid}-${index}`}
              className="rounded-xl bg-white px-4 py-3 text-[15px] leading-7 text-slate-700"
            >
              {avoid}
            </li>
          ))}
        </ul>
      </div>
    </div>

    <div className="mt-6 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#171a3d] via-[#24204d] to-[#171a3d] text-white shadow-xl">
      <div className="border-b border-white/10 px-6 py-5">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#b9b2f6]">
          운보다 AI 코치 메시지
        </p>

        <h3 className="mt-2 text-xl font-bold leading-tight sm:text-2xl">
          {detail.coachMessage.title}
        </h3>
      </div>

      <div className="px-6 py-6">
        <p className="text-sm leading-8 text-slate-100 sm:text-base">
          {detail.coachMessage.message}
        </p>
      </div>
    </div>

    <div className="mt-5 rounded-2xl border border-[#dce1ef] bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">
        최종 점검
      </p>

      <h3 className="mt-2 text-xl font-bold text-[#11162d]">
        결정 전 확인할 체크리스트
      </h3>

      <ul className="mt-5 space-y-3">
        {detail.checklist.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="flex items-start gap-3 rounded-xl border border-[#dce1ef] bg-[#f7f8fc] px-4 py-3"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#171a3d] text-xs font-bold text-white">
              ✓
            </span>

            <span className="text-[15px] leading-7 text-slate-700">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
    {detail.confidence ? (
    <div className="mt-5 rounded-2xl border border-[#dce1ef] bg-white p-5 sm:p-6">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">
        분석 신뢰도와 한계
      </p>

      <h3 className="mt-2 text-xl font-bold text-[#11162d]">
        Confidence &amp; Limits
      </h3>
    </div>

    <span className="rounded-full border border-[#cfd5e6] bg-[#f7f8fc] px-3 py-1 text-sm font-semibold text-slate-800">
      신뢰도 {detail.confidence.level}
    </span>
  </div>

  <div className="mt-6 grid gap-4 md:grid-cols-2">
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
      <p className="text-sm font-bold text-emerald-800">
        판단을 뒷받침하는 핵심 근거
      </p>

      <ul className="mt-4 space-y-3">
        {detail.confidence.strongestEvidence.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="flex gap-3 text-[15px] leading-7 text-slate-700"
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>

    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
      <p className="text-sm font-bold text-amber-800">
        결과가 달라질 수 있는 변수
      </p>

      <ul className="mt-4 space-y-3">
        {detail.confidence.uncertaintyFactors.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="flex gap-3 text-[15px] leading-7 text-slate-700"
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>

  <div className="mt-4 rounded-2xl bg-[#eef0f6] px-5 py-4">
    <p className="text-sm font-bold text-slate-800">
      해석의 한계
    </p>

    <p className="mt-2 text-[15px] leading-7 text-slate-700">
      {detail.confidence.limitations}
    </p>
  </div>
</div>
) : null}
  </section>
) : null}
      </div>
    </div>
  </main>
);
}