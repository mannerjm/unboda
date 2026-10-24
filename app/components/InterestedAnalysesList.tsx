"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  InterestedAnalysisCurrentState,
  InterestedAnalysisRecord,
} from "@/app/lib/interestedAnalyses/server";
import type { PremiumProductDefinition } from "@/app/lib/premiumProductRegistry";
import { getPremiumProductDisplayTitle } from "@/app/lib/premiumPresentation";
import { removeAnalysisAction } from "@/app/lib/interestedAnalyses/actions";

type SavedAnalysis = {
  record: InterestedAnalysisRecord;
  product: PremiumProductDefinition;
  currentState: InterestedAnalysisCurrentState;
};

type InterestedAnalysesListProps = {
  analyses: SavedAnalysis[];
  profileId: string;
};

export default function InterestedAnalysesList({
  analyses,
  profileId,
}: InterestedAnalysesListProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [removeError, setRemoveError] = useState<string | null>(null);

  // The server remains the authority for the active profile and owned edition.
  // Removing a saved interest never changes a purchase or entitlement.
  const displayAnalyses = analyses.filter((item) => !removedIds.has(item.record.id));
  const recent = [...displayAnalyses]
    .sort((left, right) =>
      right.record.createdAt.localeCompare(left.record.createdAt)
      || right.record.id.localeCompare(left.record.id),
    )[0] ?? null;

  const handleRemove = async (productId: string, recordId: string) => {
    if (loading !== null) return;
    setLoading(recordId);
    setRemoveError(null);
    try {
      await removeAnalysisAction(productId);
      setRemovedIds((prev) => new Set(prev).add(recordId));
    } catch {
      setRemoveError("관심 분석을 제거하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(null);
    }
  };

  const renderActions = ({ record, product, currentState }: SavedAnalysis, featured = false) => (
    <div className={`flex w-full flex-wrap items-center gap-2 ${featured ? "sm:w-auto" : ""}`}>
      <Link
        href={currentState.ownsCurrentEdition ? "/purchased-analyses" : `/paid-analysis/${encodeURIComponent(product.id)}`}
        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[#151a40] px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-[#282559] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6f5ce7] sm:flex-none"
      >
        {currentState.ownsCurrentEdition ? "구매한 분석에서 보기" : "분석 자세히 보기"} <span aria-hidden="true" className="ml-1">→</span>
      </Link>
      <button
        type="button"
        onClick={() => handleRemove(record.productId, record.id)}
        disabled={loading !== null}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dce1ef] bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-[#c0b9ef] hover:bg-[#f7f8fc] disabled:cursor-wait disabled:opacity-60"
        aria-label={`${getPremiumProductDisplayTitle(product.id, product.title)} 관심 분석에서 제거`}
      >
        {loading === record.id ? "제거 중..." : "관심 분석에서 제거"}
      </button>
    </div>
  );

  if (displayAnalyses.length === 0) {
    return (
      <div className="mt-6 space-y-4" key={profileId}>
        <section className="relative overflow-hidden rounded-[2rem] border border-[#dce1ef] bg-white px-6 py-12 text-center shadow-sm sm:px-10 sm:py-16">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#f3f1ff] to-transparent" />
          <div className="relative mx-auto flex max-w-lg flex-col items-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-[#ded9ff] bg-white text-[#6f5ce7] shadow-[0_12px_35px_rgba(111,92,231,0.12)]" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" className="h-9 w-9">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5V21l-7-4-7 4V5.5Z" />
              </svg>
            </span>
            <p className="mt-6 text-xs font-bold tracking-[0.18em] text-[#6f5ce7]">MY LIBRARY</p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-[#11162d] sm:text-2xl">
              아직 저장한 관심 분석이 없어요
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-7 text-slate-600">
              마음에 드는 심층 분석을 저장해 두면 여기서 다시 쉽게 찾아볼 수 있어요.
            </p>
            <Link
              href="/deep-analysis"
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#151a40] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#282559] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6f5ce7] sm:w-auto"
            >
              심층 분석 둘러보기 <span aria-hidden="true" className="ml-2">→</span>
            </Link>
            <Link href="/purchased-analyses" className="mt-4 text-sm font-semibold text-[#5e4bd1] underline decoration-[#c9c3ff] underline-offset-4">
              구매한 분석 보관함으로 이동
            </Link>
          </div>
        </section>
        <p aria-live="polite" className="text-center text-xs leading-6 text-slate-500">
          관심 분석에 저장하는 것만으로 결제되지 않습니다.
        </p>
        {removeError ? <p role="alert" className="text-center text-sm font-semibold text-red-700">{removeError}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-7" key={profileId}>
      {removeError ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{removeError}</p>
      ) : null}

      {recent ? (
        <section className="relative overflow-hidden rounded-[2rem] border border-[#dad6ff] bg-gradient-to-br from-white via-white to-[#f2f0ff] p-6 shadow-sm sm:p-8" aria-labelledby="recent-interest-heading">
          <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[#e8e3ff]/70 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-bold tracking-[0.16em] text-[#6f5ce7]">RECENT</p>
            <h2 id="recent-interest-heading" className="mt-1 text-xl font-black text-[#11162d]">최근 저장한 관심 분석</h2>
            <p className="mt-4 text-xs font-semibold text-slate-500">심층 분석</p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-[#11162d] sm:text-2xl">
              {getPremiumProductDisplayTitle(recent.product.id, recent.product.title)}
            </h3>
            {recent.product.description ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{recent.product.description}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#d8d3ff] bg-white px-3 py-1.5 text-xs font-bold text-[#5e4bd1]">관심 저장됨</span>
              <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${recent.currentState.ownsCurrentEdition
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-[#e0e4ed] bg-[#f7f8fc] text-slate-600"}`}>
                {recent.currentState.ownsCurrentEdition ? "현재 분석 보유 중" : "현재 회차 미보유"}
              </span>
            </div>
            <div className="mt-6">{renderActions(recent, true)}</div>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="all-interests-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#6f5ce7]">MY LIBRARY</p>
            <h2 id="all-interests-heading" className="mt-1 text-2xl font-black tracking-tight text-[#11162d]">전체 관심 분석</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">저장한 분석을 확인하고 필요할 때 다시 살펴보세요.</p>
          </div>
          <span className="rounded-full border border-[#dce1ef] bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
            저장 {displayAnalyses.length}개
          </span>
        </div>
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {displayAnalyses.map((item) => {
            const { record, product, currentState } = item;
            return (
              <li key={record.id} className="flex h-full flex-col rounded-3xl border border-[#dce1ef] bg-white p-5 shadow-sm transition hover:border-[#cfc9f2] hover:shadow-md sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#d8d3ff] bg-[#f3f1ff] px-2.5 py-1 text-xs font-bold text-[#5e4bd1]">관심 저장</span>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${currentState.ownsCurrentEdition
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-[#e0e4ed] bg-[#f7f8fc] text-slate-600"}`}>
                    {currentState.ownsCurrentEdition ? "현재 분석 보유 중" : "현재 회차 미보유"}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-black leading-7 text-[#11162d]">
                  {getPremiumProductDisplayTitle(product.id, product.title)}
                </h3>
                {product.description ? (
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{product.description}</p>
                ) : <div className="flex-1" />}
                <div className="mt-5 border-t border-[#edf0f6] pt-4">
                  {renderActions(item)}
                </div>
              </li>
            );
          })}
        </ul>
        <Link href="/deep-analysis" className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-[#dce1ef] bg-white px-4 text-sm font-bold text-[#5e4bd1] transition hover:bg-[#f3f1ff]">
          다른 심층 분석 둘러보기 →
        </Link>
      </section>
    </div>
  );
}
