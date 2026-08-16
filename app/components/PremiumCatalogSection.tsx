"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  groupTopicCatalogProductsByCategory,
  listPeriodCatalogProducts,
} from "@/app/lib/premiumCatalog";
import type { PremiumProductDefinition } from "@/app/lib/premiumProductRegistry";
import { getProductPricing } from "@/app/lib/productPricing";
import type { PaidAnalysisSummary } from "@/app/lib/paidReports/server";

type PremiumCatalogSectionProps = {
  profileId?: string;
  recommendedProductIds?: readonly string[];
};

type CatalogProductState =
  | "not_purchased"
  | "none"
  | "generating"
  | "completed"
  | "failed";

const ACTION_LABELS: Record<CatalogProductState, string> = {
  not_purchased: "구매하기",
  none: "심층 분석 생성하기",
  generating: "생성 중",
  completed: "리포트 보기",
  failed: "다시 생성하기",
};

const STATUS_LABELS: Record<CatalogProductState, string> = {
  not_purchased: "미보유",
  none: "보유 · 생성 전",
  generating: "생성 중",
  completed: "리포트 완료",
  failed: "생성 실패",
};

function withProfile(path: string, profileId?: string): string {
  return profileId ? `${path}?profileId=${profileId}` : path;
}

function getActionHref(
  productId: string,
  state: CatalogProductState,
  profileId?: string,
): string {
  return state === "not_purchased"
    ? withProfile(`/checkout/${productId}`, profileId)
    : withProfile(`/paid-analysis/${productId}/report`, profileId);
}

function formatPrice(productId: string): string {
  const pricing = getProductPricing(productId);

  return `${pricing.amount.toLocaleString("ko-KR")}원`;
}

export default function PremiumCatalogSection({
  profileId,
  recommendedProductIds = [],
}: PremiumCatalogSectionProps) {
  const topicGroups = useMemo(() => groupTopicCatalogProductsByCategory(), []);
  const periodProducts = useMemo(() => listPeriodCatalogProducts(), []);
  const recommendedIdSet = useMemo(
    () => new Set(recommendedProductIds),
    [recommendedProductIds],
  );

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<PaidAnalysisSummary[]>([]);

  // One request for the whole catalog; never one per product.
  useEffect(() => {
    let isCancelled = false;

    void fetch("/api/premium-catalog/status")
      .then(async (response) => {
        const body = (await response.json()) as { paidAnalysis?: PaidAnalysisSummary[] };

        if (!isCancelled && response.ok) {
          setSummaries(body.paidAnalysis ?? []);
        }
      })
      .catch(() => undefined);

    return () => {
      isCancelled = true;
    };
  }, []);

  const stateByProductId = useMemo(() => {
    const map = new Map<string, CatalogProductState>();

    for (const summary of summaries) {
      if (profileId && summary.profileId !== profileId) {
        continue;
      }

      map.set(summary.productId, summary.reportStatus as CatalogProductState);
    }

    return map;
  }, [summaries, profileId]);

  function renderCard(product: PremiumProductDefinition) {
    const state = stateByProductId.get(product.id) ?? "not_purchased";
    const isDisabled = state === "generating";

    return (
      <div
        key={product.id}
        className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold text-stone-900">{product.title}</p>

          {recommendedIdSet.has(product.id) ? (
            <span className="shrink-0 rounded-full bg-stone-900 px-2 py-1 text-[10px] font-semibold text-white">
              AI 추천
            </span>
          ) : null}
        </div>

        <p className="mt-2 text-xs leading-5 text-stone-600">
          {product.description}
        </p>

        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="font-semibold text-stone-900">
            {formatPrice(product.id)}
          </span>

          <span className="text-stone-500">{STATUS_LABELS[state]}</span>
        </div>

        {isDisabled ? (
          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-xl border border-stone-200 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-400"
          >
            {ACTION_LABELS[state]}
          </button>
        ) : (
          <Link
            href={getActionHref(product.id, state, profileId)}
            className="mt-4 w-full rounded-xl bg-stone-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            {ACTION_LABELS[state]}
          </Link>
        )}
      </div>
    );
  }

  const activeGroup =
    topicGroups.find((group) => group.category === selectedCategory) ?? null;

  return (
    <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
      <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">
        FULL CATALOG
      </p>

      <h2 className="mt-2 text-2xl font-bold text-stone-900">
        직접 선택해서 분석하기
      </h2>

      <p className="mt-3 text-sm leading-7 text-stone-600">
        추천과 별개로 원하는 심층 분석을 직접 고를 수 있습니다.
      </p>

      <div className="mt-8">
        <h3 className="text-lg font-bold text-stone-900">주제별 심층 분석</h3>

        <div className="mt-4 flex flex-wrap gap-2">
          {topicGroups.map((group) => (
            <button
              key={group.category}
              type="button"
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === group.category ? null : group.category,
                )
              }
              className={
                selectedCategory === group.category
                  ? "rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white"
                  : "rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
              }
            >
              {group.label} {group.products.length}
            </button>
          ))}
        </div>

        {activeGroup ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeGroup.products.map((product) => renderCard(product))}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-stone-50 px-5 py-4 text-sm text-stone-600">
            보고 싶은 주제를 선택하면 해당 분석 상품이 표시됩니다.
          </p>
        )}
      </div>

      <div className="mt-10">
        <h3 className="text-lg font-bold text-stone-900">기간별 심층 분석</h3>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {periodProducts.map((product) => renderCard(product))}
        </div>
      </div>
    </section>
  );
}
