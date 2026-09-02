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
  none: "분석 준비 중",
  generating: "분석 준비 중",
  completed: "리포트 보기",
  failed: "다시 생성하기",
};

const STATUS_LABELS: Record<CatalogProductState, string> = {
  not_purchased: "미보유",
  none: "보유 · 분석 준비 중",
  generating: "분석 준비 중",
  completed: "리포트 완료",
  failed: "생성 실패",
};

type CatalogIconName =
  | "topic"
  | "period"
  | "growth"
  | "business"
  | "health"
  | "money"
  | "career"
  | "social"
  | "relationship"
  | "monthly-cycle"
  | "monthly-next"
  | "annual-flow"
  | "annual-next"
  | "three-year"
  | "decade-cycle"
  | "lifetime-journey";

const CATEGORY_ICONS: Record<string, CatalogIconName> = {
  growth: "growth",
  business: "business",
  health: "health",
  money: "money",
  career: "career",
  social: "social",
  relationship: "relationship",
};

const PERIOD_ICONS: Record<string, CatalogIconName> = {
  "monthly-current": "monthly-cycle",
  "monthly-next": "monthly-next",
  "yearly-current": "annual-flow",
  "annual-next": "annual-next",
  "annual-3years": "three-year",
  "daeun-current": "decade-cycle",
  "lifetime-overview": "lifetime-journey",
};

function CatalogIcon({ name, className = "" }: { name: CatalogIconName; className?: string }) {
  const paths: Record<CatalogIconName, ReactElement> = {
    topic: <><circle cx="12" cy="12" r="7" /><path d="M12 8v8M8 12h8" /></>,
    period: <><rect x="5" y="5" width="14" height="14" rx="2" /><path d="M8 3v4M16 3v4M8 11h8M9 15h3" /></>,
    growth: <><path d="M4 19h16M6 17v-4M11 17V9M16 17V5" /><path d="m9 11 3-3 3 1 5-5" /><path d="M17 4h3v3" /></>,
    business: <><path d="M4 9.5h16v9.2a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 18.7V9.5Z" /><path d="M8.5 9.5V7.2A2.2 2.2 0 0 1 10.7 5h2.6a2.2 2.2 0 0 1 2.2 2.2v2.3M4 13h16M10 13v2h4v-2" /></>,
    health: <><path d="M20.5 8.7c0 5-8.5 10.1-8.5 10.1S3.5 13.7 3.5 8.7A4.3 4.3 0 0 1 11 5.8L12 7l1-1.2a4.3 4.3 0 0 1 7.5 2.9Z" /><path d="m7.5 12 2 2 2.3-3 1.8 2 2.9-3" /></>,
    money: <><ellipse cx="12" cy="7" rx="5.6" ry="2.4" /><path d="M6.4 7v4.2c0 1.3 2.5 2.4 5.6 2.4s5.6-1.1 5.6-2.4V7M6.4 11.2v4.2c0 1.3 2.5 2.4 5.6 2.4s5.6-1.1 5.6-2.4v-4.2" /><path d="M12 9.2v2.1M10.8 10.2h2.3" /></>,
    career: <><path d="M7 4.5h10v15H7z" /><path d="M9.5 4.5V3h5v1.5M9.5 10.2h5M9.5 13.3h5M9.5 16.4h3" /><circle cx="12" cy="7.4" r="1.4" /></>,
    social: <><circle cx="12" cy="7" r="2.5" /><circle cx="6.6" cy="10" r="2" /><circle cx="17.4" cy="10" r="2" /><path d="M7.2 19c.4-3 2-4.7 4.8-4.7s4.4 1.7 4.8 4.7M2.8 18.5c.4-2.3 1.6-3.7 3.8-4.2M21.2 18.5c-.4-2.3-1.6-3.7-3.8-4.2" /></>,
    relationship: <><path d="m9.7 14.3-2.4 2.4a3.2 3.2 0 0 1-4.5-4.5l3.7-3.7A3.2 3.2 0 0 1 11 8" /><path d="m14.3 9.7 2.4-2.4a3.2 3.2 0 0 1 4.5 4.5l-3.7 3.7A3.2 3.2 0 0 1 13 16" /><path d="m8.8 15.2 6.4-6.4" /><path d="m10.3 11.7 1.7.9 1.7-.9" /></>,
    "monthly-cycle": <><circle cx="12" cy="12" r="7.5" /><path d="M8.2 9.3A5.1 5.1 0 0 1 16.5 8l1.3 1.5M15.8 14.7A5.1 5.1 0 0 1 7.5 16l-1.3-1.5M17.8 6.8v2.7h-2.7M6.2 17.2v-2.7h2.7" /><path d="M12 9v3l2 1.2" /></>,
    "monthly-next": <><rect x="4.5" y="5" width="12.5" height="14" rx="2" /><path d="M7.5 3v4M14 3v4M4.5 10h12.5M8 13h2M18 14h3M19.5 11.5l2.5 2.5-2.5 2.5" /></>,
    "annual-flow": <><path d="M4 17.5h16" /><path d="M5.5 14.5 9 11l3 2 5-6" /><circle cx="5.5" cy="14.5" r="1.2" /><circle cx="9" cy="11" r="1.2" /><circle cx="12" cy="13" r="1.2" /><circle cx="17" cy="7" r="1.2" /><path d="M16 7h2v2" /></>,
    "annual-next": <><rect x="4" y="5" width="12" height="14" rx="2" /><path d="M7 3v4M13 3v4M4 10h12M7 14h2" /><path d="m16 16 2.5-2.5L16 11M18.5 13.5H22" /></>,
    "three-year": <><path d="M4 17h16" /><circle cx="6" cy="14" r="1.5" /><circle cx="12" cy="10" r="1.5" /><circle cx="18" cy="6" r="1.5" /><path d="m7.2 13 3.6-2.2M13.2 9 16.8 6.8M18 10v4M12 14v3M6 18v1" /></>,
    "decade-cycle": <><circle cx="12" cy="12" r="7" /><path d="M12 7.5v4.8l3.2 1.8M7 8.2A7 7 0 0 1 17.8 7l1.4 1.8M17 15.8A7 7 0 0 1 6.2 17l-1.4-1.8M19.2 6.5v3h-3M4.8 17.5v-3h3" /></>,
    "lifetime-journey": <><path d="M4 18c2.2-4.7 4.6-6.5 7-5.4 2.8 1.3 3.9-3.9 8.7-6.6" /><circle cx="4" cy="18" r="1.5" /><path d="m18.4 5.2.6 1.4 1.5.2-1.1 1 .3 1.5-1.3-.7-1.3.7.3-1.5-1.1-1 1.5-.2.6-1.4Z" /><path d="M8 18h8" /></>,
  };

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

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
  const [savedProductIds, setSavedProductIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/premium-catalog/status")
      .then(async (response) => {
        const body = await response.json() as { paidAnalysis?: PaidAnalysisSummary[]; savedProductIds?: string[] };
        if (!cancelled && response.ok) {
          setSummaries(body.paidAnalysis ?? []);
          setSavedProductIds(new Set(body.savedProductIds ?? []));
        }
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
            {state === "none" || state === "generating" ? <span className="rounded-lg bg-stone-100 px-3 py-2 text-[11px] font-semibold text-stone-500">{ACTION_LABELS[state]}</span> : isOwned ? <Link href={href ?? "#"} className="rounded-lg border border-stone-300 px-3 py-2 text-[11px] font-semibold text-stone-700 hover:bg-stone-50">{ACTION_LABELS[state]}</Link> : <button type="button" onClick={() => setSelectedProductId(product.id)} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-[11px] font-semibold text-stone-700 hover:bg-stone-50">{ACTION_LABELS[state]}</button>}
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
        className={`flex min-h-[160px] min-w-0 flex-col items-center justify-center rounded-lg border px-3 py-5 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9a8050] focus-visible:ring-offset-1 hover:border-[#cdbb98] hover:bg-[#fbf7ef] ${selectedProductId === product.id ? "border-[#cdbb98] bg-[#fff8eb] shadow-sm" : "border-stone-200 bg-white shadow-[0_1px_2px_rgba(41,37,36,0.04)]"}`}
      >
        <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${selectedProductId === product.id ? "bg-[#ead8b8] text-[#765a2c]" : "bg-[#f4ede2] text-[#9a8050]"}`}><CatalogIcon name={PERIOD_ICONS[product.id] ?? "period"} className="h-7 w-7" /></span>
        <span className="mt-4 block max-w-full px-1 text-sm font-bold leading-5 text-stone-800">{product.title}</span>
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
      <div className="mt-7 flex w-full max-w-xl rounded-lg border border-stone-200 bg-white p-1.5 shadow-sm" role="tablist" aria-label="심층 분석 종류">
        {(["topic", "period"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => { setMode(item); setSelectedCategory(null); setSelectedProductId(null); }} className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9a8050] focus-visible:ring-offset-1 ${mode === item ? "border-[#cdbb98] bg-[#f3e6cf] text-stone-900 shadow-sm" : "border-transparent bg-white text-stone-500 hover:border-stone-200 hover:bg-stone-50 hover:text-stone-800"}`}><CatalogIcon name={item} className="h-4 w-4" />{item === "topic" ? "주제별 분석" : "기간별 분석"}</button>)}
      </div>
      {mode === "topic" ? (
        <div className="mt-8 max-w-5xl">
          <div className="border-b border-stone-200 pb-4">
            <p className="text-sm font-semibold text-stone-800">1. 관심 있는 영역을 선택하세요</p>
            <p className="mt-1.5 text-xs leading-5 text-stone-500">지금 더 깊이 살펴보고 싶은 주제를 선택해보세요.</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
            {topicGroups.map((group) => {
              const selected = selectedCategory === group.category;

              return (
                <button
                  key={group.category}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => { setSelectedCategory(group.category); setSelectedProductId(null); }}
                  className={`flex min-h-[160px] flex-col items-center justify-center rounded-lg border px-3 py-5 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9a8050] focus-visible:ring-offset-1 ${selected ? "border-[#cdbb98] bg-[#fff8eb] text-stone-900 shadow-sm" : "border-stone-200 bg-white text-stone-900 shadow-[0_1px_2px_rgba(41,37,36,0.04)] hover:border-[#cdbb98] hover:bg-[#fbf7ef]"}`}
                >
                  <span className={`flex h-16 w-16 items-center justify-center rounded-full ${selected ? "bg-[#ead8b8] text-[#765a2c]" : "bg-[#f4ede2] text-[#9a8050]"}`}><CatalogIcon name={CATEGORY_ICONS[group.category] ?? "topic"} className="h-7 w-7" /></span>
                  <span className="mt-4 text-sm font-bold text-stone-800">{group.label}</span>
                  <span className={`mt-1.5 text-xs ${selected ? "font-semibold text-[#765a2c]" : "text-stone-500"}`}>{group.products.length}개 분석</span>
                </button>
              );
            })}
          </div>
          {!activeGroup ? <div className="mt-6 flex min-h-[112px] items-center justify-center rounded-xl border border-stone-200 bg-white px-5 text-center"><div><p className="text-sm font-semibold text-stone-700">2. 지금 어떤 고민에 가장 가까우세요?</p><p className="mt-2 text-xs text-stone-500">영역을 선택하면 지금의 질문에 가까운 분석을 골라볼 수 있어요.</p></div></div> : <TopicDiscovery products={activeGroup.products} selectedProductId={selectedProductId} onSelect={setSelectedProductId} onClear={() => { setSelectedCategory(null); setSelectedProductId(null); }} stateByProductId={stateByProductId} profileId={profileId} savedProductIds={savedProductIds} />}
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
          savedProductIds={savedProductIds}
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
  savedProductIds,
}: {
  products: readonly PremiumProductDefinition[];
  selectedProductId: string | null;
  onSelect: (productId: string) => void;
  onClear: () => void;
  stateByProductId: ReadonlyMap<string, CatalogProductState>;
  profileId?: string;
  savedProductIds: ReadonlySet<string>;
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
          key={selectedProduct.id}
          product={selectedProduct}
          state={toPremiumAnalysisProductState(stateByProductId.get(selectedProduct.id))}
          profileId={profileId}
          onClear={() => onSelect("")}
          isSaved={savedProductIds.has(selectedProduct.id)}
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
  savedProductIds,
}: {
  products: readonly PremiumProductDefinition[];
  selectedProductId: string | null;
  onSelect: (productId: string) => void;
  onClear: () => void;
  renderTile: (product: PremiumProductDefinition) => ReactElement | null;
  stateByProductId: ReadonlyMap<string, CatalogProductState>;
  profileId?: string;
  savedProductIds: ReadonlySet<string>;
}) {
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;
  return (
    <div className="mt-8 max-w-5xl">
      <div className="border-b border-stone-200 pb-4">
        <p className="text-sm font-semibold text-stone-800">1. 어느 정도의 시간 범위를 살펴보고 싶으세요?</p>
        <p className="mt-1.5 text-xs leading-5 text-stone-500">가까운 흐름부터 긴 시간의 변화를 차례로 살펴볼 수 있어요.</p>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {products.map(renderTile)}
      </div>

      {selectedProduct?.purchaseDecision ? (
        <PremiumProductDetail
          key={selectedProduct.id}
          product={selectedProduct}
          state={toPremiumAnalysisProductState(stateByProductId.get(selectedProduct.id))}
          profileId={profileId}
          onClear={onClear}
          isSaved={savedProductIds.has(selectedProduct.id)}
        />
      ) : (
        <div className="mt-6 flex min-h-[104px] items-center justify-center rounded-xl border border-stone-200 bg-white px-5 text-center">
          <p className="text-xs text-stone-500">기간을 선택하면 분석 내용과 구매 전 안내를 확인할 수 있어요.</p>
        </div>
      )}
    </div>
  );
}
