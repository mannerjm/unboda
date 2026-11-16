"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { PREMIUM_PRODUCT_PHOTOS } from "@/app/lib/premiumProductPhotos";
import type { CompatibilityInterestCard } from "@/app/lib/interestedAnalyses/compatibilityCatalog";
import type {
  InterestedAnalysisCurrentState,
  InterestedAnalysisRecord,
} from "@/app/lib/interestedAnalyses/server";
import type { PremiumProductDefinition } from "@/app/lib/premiumProductRegistry";
import { getPremiumProductDisplayTitle } from "@/app/lib/premiumPresentation";
import { getProductPricing } from "@/app/lib/productPricing";
import { getSpecialAnalysisProduct } from "@/app/lib/specialAnalysisProducts";
import { removeAnalysisAction } from "@/app/lib/interestedAnalyses/actions";

export type SavedAnalysis =
  | {
      kind: "premium";
      record: InterestedAnalysisRecord;
      product: PremiumProductDefinition;
      currentState: InterestedAnalysisCurrentState;
    }
  | {
      kind: "compatibility";
      record: InterestedAnalysisRecord;
      compatibility: CompatibilityInterestCard;
    };

type InterestedAnalysesListProps = {
  analyses: SavedAnalysis[];
  profileId: string;
};

type Filter = "all" | "premium" | "compatibility";

function getSavedCardDetails(item: SavedAnalysis) {
  if (item.kind === "compatibility") {
    const special = getSpecialAnalysisProduct(item.record.productId);
    return {
      category: "전문 분석 · 궁합",
      title: item.compatibility.title,
      description: item.compatibility.description,
      photoId: item.compatibility.photoId,
      photoLabel: item.compatibility.label,
      price: special?.amount.toLocaleString("ko-KR") ?? "19,900",
      href: item.compatibility.href,
      owned: false,
      compatibility: true,
    };
  }
  const title = getPremiumProductDisplayTitle(item.product.id, item.product.title);
  return {
    category: "심층 분석",
    title,
    description: item.product.description,
    photoId: item.product.id,
    photoLabel: title,
    price: getProductPricing(item.product.id).amount.toLocaleString("ko-KR"),
    href: item.currentState.ownsCurrentEdition
      ? "/purchased-analyses"
      : "/paid-analysis/" + encodeURIComponent(item.product.id),
    owned: item.currentState.ownsCurrentEdition,
    compatibility: false,
  };
}

export default function InterestedAnalysesList({ analyses, profileId }: InterestedAnalysesListProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  // The active-profile truth is resolved on the server. Saving/removing is
  // independent of orders, reports, pair data and payment entitlements.
  const displayAnalyses = analyses.filter((item) => !removedIds.has(item.record.id));
  const sortedAnalyses = [...displayAnalyses].sort((a, b) =>
    b.record.createdAt.localeCompare(a.record.createdAt) ||
    b.record.id.localeCompare(a.record.id),
  );
  const filtered = sortedAnalyses.filter((item) => filter === "all" || item.kind === filter);
  const premiumCount = displayAnalyses.filter((item) => item.kind === "premium").length;
  const compatibilityCount = displayAnalyses.length - premiumCount;

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

  if (displayAnalyses.length === 0) {
    return (
      <div className="mt-6 space-y-4" key={profileId}>
        <section className="rounded-[2rem] border border-[#dfd3f2] bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-xs font-bold tracking-[0.16em] text-[#805cb7]">MY LIBRARY</p>
          <h2 className="mt-2 text-2xl font-black text-[#23173c]">아직 저장한 관심 분석이 없어요</h2>
          <p className="mt-3 text-sm leading-7 text-[#6f617e]">
            마음에 드는 심층 분석이나 궁합을 저장하면 여기서 다시 볼 수 있어요.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/deep-analysis" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#7551b7] px-5 text-sm font-bold text-white">
              심층 분석 둘러보기 →
            </Link>
            <Link href="/special-analysis/compatibility" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d6c7ec] px-5 text-sm font-bold text-[#7551b7]">
              궁합 분석 둘러보기 →
            </Link>
          </div>
        </section>
        <p className="text-center text-xs text-slate-500">관심 분석에 저장하는 것만으로 결제되지 않습니다.</p>
      </div>
    );
  }

  return (
    <section className="mt-6" key={profileId} aria-labelledby="all-interests-heading">
      {removeError ? <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{removeError}</p> : null}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold tracking-[0.12em] text-[#8158b6]">MY LIBRARY</p>
          <h2 id="all-interests-heading" className="mt-1 text-2xl font-black text-[#24143e]">전체 관심 분석</h2>
          <p className="mt-1 text-sm leading-6 text-[#746780]">최근 저장한 순서로 분석을 모아봤어요.</p>
        </div>
        <span className="rounded-full border border-[#ded0ef] bg-white px-3 py-1.5 text-xs font-bold text-[#7551a6]">
          저장 {displayAnalyses.length}개
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="관심 분석 유형">
        {([
          ["all", "전체", displayAnalyses.length],
          ["premium", "심층분석", premiumCount],
          ["compatibility", "궁합", compatibilityCount],
        ] as const).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            aria-pressed={filter === id}
            className={"rounded-full border px-4 py-2 text-xs font-bold transition " +
              (filter === id
                ? "border-[#865bc6] bg-[#f0e7ff] text-[#633d9c]"
                : "border-[#e6d9f1] bg-white text-[#756884] hover:border-[#ac91d1]")}
          >
            {label} {count}
          </button>
        ))}
      </div>
      {filtered.length ? (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((item) => {
            const details = getSavedCardDetails(item);
            const photo = PREMIUM_PRODUCT_PHOTOS[details.photoId];
            return (
              <li key={item.record.id} className="rounded-[1.4rem] border border-[#e5d9f1] bg-white p-3 shadow-[0_8px_25px_rgba(91,60,130,0.06)]">
                <div className="flex items-start gap-3">
                  <div className="relative h-[112px] w-[112px] shrink-0 overflow-hidden rounded-xl bg-[#eee4fa]">
                    {photo ? <Image src={photo.src} alt={photo.alt} fill sizes="112px" className="object-cover" /> :
                      <div className="flex h-full items-center justify-center text-sm font-bold text-[#835cac]">운보다</div>}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-6 text-[12px] font-black text-white">
                      {details.photoLabel}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[11px] font-bold text-[#885cc2]">{details.category}</span>
                    <h3 className="mt-1 text-[16px] font-black leading-6 text-[#221638]">{details.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#665b73]">{details.description}</p>
                    <span className="mt-2 text-sm font-black text-[#221638]">{details.price}원</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#d9c9f2] bg-[#f7f1ff] px-2.5 py-1 text-xs font-bold text-[#7452ac]">관심 저장됨</span>
                  {item.kind === "premium" ? (
                    <span className={"rounded-full px-2.5 py-1 text-xs font-semibold " +
                      (details.owned ? "bg-emerald-50 text-emerald-700" : "bg-[#f2f3f8] text-[#6b617a]")}>
                      {details.owned ? "현재 분석 보유 중" : "현재 회차 미보유"}
                    </span>
                  ) : <span className="rounded-full bg-[#f4eefb] px-2.5 py-1 text-xs font-semibold text-[#7652ad]">궁합 상품 저장</span>}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#eee6f5] pt-3">
                  <Link
                    href={details.href}
                    className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-[#7450b0] px-3 text-center text-xs font-bold text-white transition hover:bg-[#623b9d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7752b8]"
                  >
                    {details.owned ? "구매한 분석에서 보기" : "분석 자세히 보기"} →
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleRemove(item.record.productId, item.record.id)}
                    disabled={loading !== null}
                    aria-label={details.title + " 관심 분석에서 제거"}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#e0d2ed] bg-white px-3 text-xs font-bold text-[#756780] hover:bg-[#f8f4fd] disabled:opacity-60"
                  >
                    {loading === item.record.id ? "제거 중..." : "관심 분석에서 제거"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-xl border border-[#e2d5ef] bg-white p-8 text-center text-sm text-[#695b79]">
          선택한 유형에 저장한 분석이 없어요.
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold text-[#7451ac]">
        <Link href="/deep-analysis" className="underline underline-offset-4">다른 심층 분석 둘러보기 →</Link>
        <Link href="/special-analysis/compatibility" className="underline underline-offset-4">궁합 분석 둘러보기 →</Link>
        <Link href="/purchased-analyses" className="underline underline-offset-4">구매한 분석 보관함 →</Link>
      </div>
    </section>
  );
}
