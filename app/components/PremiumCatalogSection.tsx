"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { groupTopicCatalogProductsByCategory, listPeriodCatalogProducts } from "@/app/lib/premiumCatalog";
import type { PremiumProductDefinition } from "@/app/lib/premiumProductRegistry";
import { getProductPricing } from "@/app/lib/productPricing";
import PremiumProductDetail from "@/app/components/PremiumProductDetail";
import type { PaidAnalysisSummary } from "@/app/lib/paidReports/server";
import { getPremiumAnalysisHref, toPremiumAnalysisProductState, type PremiumAnalysisProductState } from "@/app/lib/premiumAnalysisNavigation";
import { getPaidAnalysisTopicConfig } from "@/app/lib/paidAnalysisTopicConfig";

type PremiumCatalogSectionProps = { profileId?: string; recommendedProductIds?: readonly string[] };
type CatalogMode = "topic" | "period";
type CatalogProductState = PremiumAnalysisProductState;

const ACTION_LABELS: Record<CatalogProductState, string> = {
  not_purchased: "분석 내용 보기",
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

const CATEGORY_MARKS = ["✦", "▦", "♡", "◉", "◒", "◌", "◇"];

function formatPrice(productId: string): string {
  return `${getProductPricing(productId).amount.toLocaleString("ko-KR")}원`;
}

export default function PremiumCatalogSection({ profileId, recommendedProductIds = [] }: PremiumCatalogSectionProps) {
  const topicGroups = useMemo(() => groupTopicCatalogProductsByCategory(), []);
  const periodProducts = useMemo(() => listPeriodCatalogProducts(), []);
  const recommendedIdSet = useMemo(() => new Set(recommendedProductIds), [recommendedProductIds]);
  const [mode, setMode] = useState<CatalogMode>("topic");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<PaidAnalysisSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/premium-catalog/status")
      .then(async (response) => {
        const body = await response.json() as { paidAnalysis?: PaidAnalysisSummary[] };
        if (!cancelled && response.ok) setSummaries(body.paidAnalysis ?? []);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const stateByProductId = useMemo(() => {
    const states = new Map<string, CatalogProductState>();
    for (const summary of summaries) {
      if (!profileId || summary.profileId === profileId) states.set(summary.productId, toPremiumAnalysisProductState(summary.reportStatus));
    }
    return states;
  }, [summaries, profileId]);

  function getCategoryLabel(category: string): string {
    return topicGroups.find((group) => group.category === category)?.label ?? category;
  }

  function renderProductRow(product: PremiumProductDefinition) {
    const state = toPremiumAnalysisProductState(stateByProductId.get(product.id));
    const isOwned = state !== "not_purchased";
    const isSelected = selectedProductId === product.id;
    const href = getPremiumAnalysisHref(product.id, state, profileId);

    return (
      <article key={product.id} className={`rounded-xl border p-4 ${isSelected ? "border-[#cdbb98] bg-[#fbf7ef]" : "border-stone-200 bg-white"}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => setSelectedProductId(product.id)} className="min-w-0 flex-1 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-stone-900">{product.title}</h4>
              {recommendedIdSet.has(product.id) ? <span className="text-[10px] font-semibold text-stone-500">추천됨</span> : null}
            </div>
            <p className="mt-2 text-xs leading-5 text-stone-600">{product.description}</p>
            {product.details?.[0] ? <p className="mt-2 text-[11px] leading-5 text-stone-500">확인하는 것 · {product.details[0]}</p> : null}
            {isOwned ? <p className="mt-2 text-[10px] font-medium tracking-[0.08em] text-stone-500">{STATUS_LABELS[state]}</p> : null}
          </button>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="text-xs font-medium text-stone-500">{formatPrice(product.id)}</span>
            {state === "generating" ? <span className="rounded-lg bg-stone-100 px-3 py-2 text-[11px] font-semibold text-stone-500">{ACTION_LABELS[state]}</span> : isOwned ? <Link href={href ?? "#"} className="rounded-lg border border-stone-300 px-3 py-2 text-[11px] font-semibold text-stone-700 hover:bg-stone-50">{ACTION_LABELS[state]}</Link> : <button type="button" onClick={() => setSelectedProductId(product.id)} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-[11px] font-semibold text-stone-700 hover:bg-stone-50">{ACTION_LABELS[state]}</button>}
          </div>
        </div>
        {isSelected ? <div className="mt-4 border-t border-stone-200 pt-4"><p className="text-xs font-semibold text-stone-700">이 분석에서 확인하는 것</p><ul className="mt-2 space-y-1 text-xs leading-5 text-stone-600">{(product.details ?? [product.description]).slice(0, 3).map((detail) => <li key={detail}>· {detail}</li>)}</ul>{!isOwned && href ? <Link href={href} className="mt-4 inline-flex rounded-lg bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800">이 분석 자세히 보기</Link> : null}</div> : null}
      </article>
    );
  }

  function renderPeriodTile(product: PremiumProductDefinition) {
    const purchaseDecision = product.purchaseDecision;
    if (!purchaseDecision) return null;

    return (
      <button
        key={product.id}
        type="button"
        onClick={() => setSelectedProductId(product.id)}
        className={`min-w-0 rounded-xl border p-4 text-left transition hover:border-[#cdbb98] hover:bg-[#fbf7ef] ${selectedProductId === product.id ? "border-[#cdbb98] bg-[#fbf7ef]" : "border-stone-200 bg-white"}`}
      >
        <span className="block text-sm font-bold text-stone-900">{product.title}</span>
        <span className="mt-2 block text-xs leading-5 text-stone-600">{purchaseDecision.distinction}</span>
      </button>
    );
  }

  const activeGroup = topicGroups.find((group) => group.category === selectedCategory) ?? null;

  return (
    <section id="premium-analysis" className="mt-8 pt-4 sm:mt-10 sm:pt-6">
      <header className="max-w-4xl">
        <p className="text-xs font-semibold tracking-[0.16em] text-stone-500">DEEPER LOOK</p>
        <h2 className="mt-3 text-2xl font-bold text-stone-900 sm:text-3xl">심층 분석 둘러보기</h2>
        <p className="mt-3 text-sm leading-7 text-stone-600">추천과 별개로, 지금 궁금한 영역을 직접 선택해 필요한 분석을 살펴볼 수 있어요.</p>
      </header>
      <div className="mt-7 flex w-full max-w-xl rounded-lg border border-stone-300 bg-white p-1 shadow-sm" role="tablist" aria-label="심층 분석 종류">
        {(["topic", "period"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => { setMode(item); setSelectedCategory(null); setSelectedProductId(null); }} className={`min-h-10 flex-1 rounded-md border px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9a8050] focus-visible:ring-offset-1 ${mode === item ? "border-[#bda777] bg-[#e8ddc8] text-stone-900 shadow-sm" : "border-transparent bg-white text-stone-500 hover:border-stone-200 hover:bg-stone-50 hover:text-stone-800"}`}>{item === "topic" ? "주제별 분석" : "기간별 분석"}</button>)}
      </div>
      {mode === "topic" ? (
        <div className="mt-8 max-w-5xl">
          <p className="text-sm font-semibold text-stone-800">1. 관심 있는 영역을 선택하세요</p>
          <p className="mt-2 text-xs text-stone-500">먼저 더 깊이 보고 싶은 주제를 선택해보세요.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
            {topicGroups.map((group, index) => {
              const selected = selectedCategory === group.category;

              return (
                <button
                  key={group.category}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => { setSelectedCategory(group.category); setSelectedProductId(null); }}
                  className={`flex min-h-[92px] flex-col items-center justify-center rounded-lg border px-2 py-3 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9a8050] focus-visible:ring-offset-1 ${selected ? "border-[#bda777] bg-[#e8ddc8] text-stone-900 shadow-sm" : "border-stone-200 bg-white text-stone-900 hover:border-[#cdbb98] hover:bg-[#fbf7ef]"}`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${selected ? "bg-[#f3e6cf] text-[#876d3f]" : "bg-[#f3eee4] text-[#9a8050]"}`}>{CATEGORY_MARKS[index]}</span>
                  <span className="mt-2 text-xs font-semibold">{group.label}</span>
                  <span className={`mt-1 text-[10px] ${selected ? "font-semibold text-stone-700" : "text-stone-500"}`}>{group.products.length}개 분석</span>
                </button>
              );
            })}
          </div>
          {!activeGroup ? <div className="mt-6 flex min-h-[112px] items-center justify-center rounded-xl border border-stone-200 bg-white px-5 text-center"><div><p className="text-sm font-semibold text-stone-700">2. 지금 어떤 고민에 가장 가까우세요?</p><p className="mt-2 text-xs text-stone-500">영역을 선택하면 지금의 질문에 가까운 분석을 골라볼 수 있어요.</p></div></div> : <TopicDiscovery products={activeGroup.products} selectedProductId={selectedProductId} onSelect={setSelectedProductId} onClear={() => { setSelectedCategory(null); setSelectedProductId(null); }} stateByProductId={stateByProductId} profileId={profileId} />}
        </div>
      ) : (
        <PeriodDiscovery
          products={periodProducts}
          selectedProductId={selectedProductId}
          onSelect={setSelectedProductId}
          onClear={() => setSelectedProductId(null)}
          renderTile={renderPeriodTile}
          stateByProductId={stateByProductId}
          profileId={profileId}
        />
      )}
    </section>
  );
}
function TopicDiscovery({
  products,
  selectedProductId,
  onSelect,
  onClear,
  stateByProductId,
  profileId,
}: {
  products: readonly PremiumProductDefinition[];
  selectedProductId: string | null;
  onSelect: (productId: string) => void;
  onClear: () => void;
  stateByProductId: ReadonlyMap<string, CatalogProductState>;
  profileId?: string;
}) {
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;
  const selectedConfig = selectedProduct ? getPaidAnalysisTopicConfig(selectedProduct.id) : undefined;
  const purchaseDecision = selectedConfig?.purchaseDecision;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-3">
        <div>
          <p className="text-sm font-semibold text-stone-800">2. 지금 어떤 고민에 가장 가까우세요?</p>
          <p className="mt-1 text-xs text-stone-500">상황을 선택하면 해당 분석의 내용을 자세히 확인할 수 있어요.</p>
        </div>
        <button type="button" onClick={onClear} className="rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-600">다른 영역 선택</button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {products.map((product) => {
          const decision = getPaidAnalysisTopicConfig(product.id)?.purchaseDecision;
          if (!decision) return null;
          return (
            <button key={product.id} type="button" onClick={() => onSelect(product.id)} className={`rounded-xl border p-4 text-left transition hover:border-[#cdbb98] hover:bg-[#fbf7ef] ${selectedProductId === product.id ? "border-[#cdbb98] bg-[#fbf7ef]" : "border-stone-200 bg-white"}`}>
              <p className="text-sm font-bold text-stone-900">{product.title}</p>
              <p className="mt-2 text-xs leading-5 text-stone-600">{decision.decisionQuestion}</p>
            </button>
          );
        })}
      </div>
      {selectedProduct && purchaseDecision ? (
        <PremiumProductDetail
          product={selectedProduct}
          state={toPremiumAnalysisProductState(stateByProductId.get(selectedProduct.id))}
          profileId={profileId}
          onClear={() => onSelect("")}
        />
      ) : (
        <div className="flex min-h-[104px] items-center justify-center rounded-xl border border-stone-200 bg-white px-5 text-center">
          <p className="text-xs text-stone-500">상황을 선택하면 분석 내용과 구매 전 안내를 확인할 수 있어요.</p>
        </div>
      )}
    </div>
  );
}
function PeriodDiscovery({
  products,
  selectedProductId,
  onSelect,
  onClear,
  renderTile,
  stateByProductId,
  profileId,
}: {
  products: readonly PremiumProductDefinition[];
  selectedProductId: string | null;
  onSelect: (productId: string) => void;
  onClear: () => void;
  renderTile: (product: PremiumProductDefinition) => ReactElement | null;
  stateByProductId: ReadonlyMap<string, CatalogProductState>;
  profileId?: string;
}) {
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;
  const groups = [
    { label: "가까운 흐름", ids: ["monthly-current", "monthly-next"] },
    { label: "한 해의 흐름", ids: ["yearly-current", "annual-next"] },
    { label: "중장기 흐름", ids: ["annual-3years", "daeun-current"] },
    { label: "생애 전체", ids: ["lifetime-overview"] },
  ];

  return (
    <div className="mt-8 max-w-5xl">
      <p className="text-sm font-semibold text-stone-800">어느 정도의 시간 범위를 살펴보고 싶으세요?</p>
      <div className="mt-5 space-y-5">
        {groups.map((group) => {
          const groupProducts = group.ids
            .map((id) => products.find((product) => product.id === id))
            .filter((product): product is PremiumProductDefinition => Boolean(product));
          if (groupProducts.length === 0) return null;

          return (
            <section key={group.label}>
              <h3 className="text-xs font-semibold tracking-[0.12em] text-stone-500">{group.label}</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">{groupProducts.map(renderTile)}</div>
            </section>
          );
        })}
      </div>

      {selectedProduct?.purchaseDecision ? (
        <PremiumProductDetail
          product={selectedProduct}
          state={toPremiumAnalysisProductState(stateByProductId.get(selectedProduct.id))}
          profileId={profileId}
          onClear={onClear}
        />
      ) : (
        <div className="mt-6 flex min-h-[104px] items-center justify-center rounded-xl border border-stone-200 bg-white px-5 text-center">
          <p className="text-xs text-stone-500">기간을 선택하면 분석 내용과 구매 전 안내를 확인할 수 있어요.</p>
        </div>
      )}
    </div>
  );
}
