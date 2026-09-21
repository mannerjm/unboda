"use client";
import { getReadablePaidQuestion } from "@/app/lib/premiumQuestionDisplay";

import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { groupTopicCatalogProductsByCategory, listPeriodCatalogProducts } from "@/app/lib/premiumCatalog";
import type { PremiumProductDefinition } from "@/app/lib/premiumProductRegistry";
import { getProductPricing } from "@/app/lib/productPricing";
import PremiumProductDetail from "@/app/components/PremiumProductDetail";
import type { PaidAnalysisSummary } from "@/app/lib/paidReports/server";
import { toPremiumAnalysisProductState, type PremiumAnalysisProductState } from "@/app/lib/premiumAnalysisNavigation";
import { getPaidAnalysisTopicConfig } from "@/app/lib/paidAnalysisTopicConfig";

type CatalogMode = "topic" | "period";
type CatalogProductState = PremiumAnalysisProductState;
type PremiumCatalogSectionProps = {
  profileId?: string;
  recommendedProductIds?: readonly string[];
  initialMode?: CatalogMode;
  initialCategory?: string;
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

const CATEGORY_META: Record<string, { prompt: string; detail: string; accent: string; iconSurface: string }> = {
  relationship: {
    prompt: "연애와 관계 선택이 궁금해요",
    detail: "현재 관계, 새로운 인연, 갈등과 거리 조절",
    accent: "from-[#fff5f8] via-white to-[#faf7ff]",
    iconSurface: "bg-[#f7e8ef] text-[#a24f79]",
  },
  career: {
    prompt: "일과 커리어 방향이 궁금해요",
    detail: "적성, 직장, 이직, 성과와 전문성",
    accent: "from-[#f2f6ff] via-white to-[#f8f8ff]",
    iconSurface: "bg-[#e8eefb] text-[#526fba]",
  },
  money: {
    prompt: "돈의 흐름과 운영이 궁금해요",
    detail: "수입, 지출, 축적, 투자와 전환점",
    accent: "from-[#fff8ea] via-white to-[#fbf8f1]",
    iconSurface: "bg-[#f6ecd4] text-[#9b7731]",
  },
  growth: {
    prompt: "배우는 방식과 성장이 궁금해요",
    detail: "학업, 시험, 자기계발과 변화 적응",
    accent: "from-[#eefaf5] via-white to-[#f5faf8]",
    iconSurface: "bg-[#e2f3eb] text-[#397a61]",
  },
  social: {
    prompt: "사람 사이의 연결이 궁금해요",
    detail: "신뢰, 도움 관계, 사회적 거리와 협업",
    accent: "from-[#f5f1ff] via-white to-[#faf8ff]",
    iconSurface: "bg-[#eee8fb] text-[#6e59a6]",
  },
  business: {
    prompt: "사업과 독립의 선택이 궁금해요",
    detail: "창업, 운영, 확장과 책임 배분",
    accent: "from-[#fff5ec] via-white to-[#fbf7f2]",
    iconSurface: "bg-[#f7eadc] text-[#a26a3a]",
  },
  health: {
    prompt: "생활 리듬과 회복 흐름이 궁금해요",
    detail: "컨디션, 과부하, 생활 리듬과 회복 기준",
    accent: "from-[#eef9f8] via-white to-[#f5fbfb]",
    iconSurface: "bg-[#e3f2f0] text-[#427d78]",
  },
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

const STATUS_LABELS: Record<CatalogProductState, string> = {
  not_purchased: "",
  none: "보유 · 분석 준비 중",
  generating: "분석 준비 중",
  completed: "리포트 완료",
  failed: "생성 실패",
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

function resolveInitialCategory(initialCategory: string | undefined, categories: readonly string[]): string | null {
  return initialCategory && categories.includes(initialCategory) ? initialCategory : null;
}

export default function PremiumCatalogSection({
  profileId,
  recommendedProductIds = [],
  initialMode = "topic",
  initialCategory,
}: PremiumCatalogSectionProps) {
  const topicGroups = useMemo(() => groupTopicCatalogProductsByCategory(), []);
  const periodProducts = useMemo(() => listPeriodCatalogProducts(), []);
  const categories = useMemo(() => topicGroups.map((group) => group.category), [topicGroups]);
  const recommendedIdSet = useMemo(() => new Set(recommendedProductIds), [recommendedProductIds]);
  const [mode, setMode] = useState<CatalogMode>(initialMode);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => initialMode === "topic" ? resolveInitialCategory(initialCategory, categories) : null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<PaidAnalysisSummary[]>([]);
  const [currentOwnedProductIds, setCurrentOwnedProductIds] = useState<ReadonlySet<string>>(new Set());
  const [savedProductIds, setSavedProductIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/premium-catalog/status")
      .then(async (response) => {
        const body = await response.json() as { paidAnalysis?: PaidAnalysisSummary[]; savedProductIds?: string[]; currentOwnedProductIds?: string[] };
        if (!cancelled && response.ok) {
          setSummaries(body.paidAnalysis ?? []);
          setSavedProductIds(new Set(body.savedProductIds ?? []));
          setCurrentOwnedProductIds(new Set(body.currentOwnedProductIds ?? []));
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const stateByProductId = useMemo(() => {
    const states = new Map<string, CatalogProductState>();
    for (const summary of summaries) {
      if ((!profileId || summary.profileId === profileId) && currentOwnedProductIds.has(summary.productId)) {
        states.set(summary.productId, toPremiumAnalysisProductState(summary.reportStatus));
      }
    }
    return states;
  }, [summaries, profileId, currentOwnedProductIds]);

  const activeGroup = topicGroups.find((group) => group.category === selectedCategory) ?? null;

  const switchMode = (nextMode: CatalogMode) => {
    setMode(nextMode);
    setSelectedCategory(null);
    setSelectedProductId(null);
  };

  return (
    <section id="premium-analysis" className="py-8 sm:py-10">
      <div className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-[0_18px_55px_rgba(28,25,23,0.06)] sm:p-7 lg:p-8">
        <header className="flex flex-col gap-5 border-b border-stone-200 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-black tracking-[0.15em] text-[#765ee7]">질문으로 찾는 심층 분석</p>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-stone-950 sm:text-3xl">무엇이 궁금한지부터 선택하세요.</h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">전체 상품을 훑지 않아도 돼요. 주제나 시기를 고르면 실제 고민에 가까운 질문만 먼저 보여드립니다.</p>
          </div>
          <div className="grid w-full gap-2 rounded-2xl bg-stone-100 p-1.5 sm:grid-cols-2 lg:w-[30rem]" role="tablist" aria-label="심층 분석 찾는 방식">
            {(["topic", "period"] as const).map((item) => {
              const selected = mode === item;
              return (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => switchMode(item)}
                  className={`flex min-h-14 items-center gap-3 rounded-xl px-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8069ec] ${selected ? "bg-[#111831] text-white shadow-sm" : "text-stone-600 hover:bg-white hover:text-stone-900"}`}
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${selected ? "bg-[#7862e8] text-white" : "bg-white text-stone-500"}`}><CatalogIcon name={item} className="h-4 w-4" /></span>
                  <span><strong className="block text-sm">{item === "topic" ? "주제로 찾기" : "시기로 찾기"}</strong><span className={`mt-0.5 block text-[11px] ${selected ? "text-[#bdc0d4]" : "text-stone-500"}`}>{item === "topic" ? "일·돈·연애·성장 등" : "이번 달·올해·장기 흐름"}</span></span>
                </button>
              );
            })}
          </div>
        </header>

        {mode === "topic" ? (
          <div className="pt-7">
            <div>
              <p className="text-xs font-black tracking-[0.12em] text-stone-400">STEP 1</p>
              <h3 className="mt-2 text-lg font-black text-stone-900">어떤 영역이 마음에 걸리나요?</h3>
              <p className="mt-1.5 text-sm text-stone-500">상품 카테고리가 아니라 지금 고민에 가까운 영역을 고르면 돼요.</p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {topicGroups.map((group) => {
                const selected = selectedCategory === group.category;
                const meta = CATEGORY_META[group.category] ?? {
                  prompt: group.label,
                  detail: "관련 심층 분석을 질문 중심으로 살펴봐요",
                  accent: "from-stone-50 via-white to-stone-50",
                  iconSurface: "bg-stone-100 text-stone-600",
                };
                return (
                  <button
                    key={group.category}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => { setSelectedCategory(group.category); setSelectedProductId(null); }}
                    className={`group relative min-h-[172px] overflow-hidden rounded-[1.5rem] border bg-gradient-to-br p-5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8069ec] ${meta.accent} ${selected ? "border-[#8a75e8] shadow-[0_12px_32px_rgba(108,86,208,0.13)]" : "border-stone-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-[0_10px_28px_rgba(28,25,23,0.06)]"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={`grid h-11 w-11 place-items-center rounded-2xl ${meta.iconSurface}`}><CatalogIcon name={CATEGORY_ICONS[group.category] ?? "topic"} className="h-5 w-5" /></span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${selected ? "bg-[#7560df] text-white" : "bg-white/80 text-stone-500"}`}>{group.products.length}개 질문</span>
                    </div>
                    <p className="mt-5 text-sm font-black text-stone-900">{group.label}</p>
                    <p className="mt-1.5 text-[15px] font-bold leading-6 tracking-[-0.02em] text-stone-800">{meta.prompt}</p>
                    <p className="mt-2 text-xs leading-5 text-stone-500">{meta.detail}</p>
                  </button>
                );
              })}
            </div>

            {activeGroup ? (
              <TopicDiscovery
                products={activeGroup.products}
                selectedProductId={selectedProductId}
                onSelect={setSelectedProductId}
                onClear={() => { setSelectedCategory(null); setSelectedProductId(null); }}
                stateByProductId={stateByProductId}
                profileId={profileId}
                savedProductIds={savedProductIds}
                recommendedIdSet={recommendedIdSet}
              />
            ) : (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50 px-6 py-8 text-center">
                <p className="text-sm font-bold text-stone-700">영역을 하나 고르면 다음 단계에서 실제 질문이 보여요.</p>
                <p className="mt-2 text-xs leading-5 text-stone-500">상품명을 모르더라도 괜찮아요. 질문을 읽고 가장 가까운 것을 선택하면 됩니다.</p>
              </div>
            )}
          </div>
        ) : (
          <PeriodDiscovery
            products={periodProducts}
            selectedProductId={selectedProductId}
            onSelect={setSelectedProductId}
            onClear={() => setSelectedProductId(null)}
            stateByProductId={stateByProductId}
            profileId={profileId}
            savedProductIds={savedProductIds}
            recommendedIdSet={recommendedIdSet}
          />
        )}
      </div>
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
  recommendedIdSet,
}: {
  products: readonly PremiumProductDefinition[];
  selectedProductId: string | null;
  onSelect: (productId: string) => void;
  onClear: () => void;
  stateByProductId: ReadonlyMap<string, CatalogProductState>;
  profileId?: string;
  savedProductIds: ReadonlySet<string>;
  recommendedIdSet: ReadonlySet<string>;
}) {
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;
  const selectedConfig = selectedProduct ? getPaidAnalysisTopicConfig(selectedProduct.id) : undefined;
  const purchaseDecision = selectedConfig?.purchaseDecision;

  return (
    <div className="mt-8 border-t border-stone-200 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.12em] text-[#765ee7]">STEP 2</p>
          <h3 className="mt-2 text-lg font-black text-stone-900">지금 어떤 질문에 가장 가까우세요?</h3>
          <p className="mt-1.5 text-sm text-stone-500">질문을 먼저 고르면 실제 분석 상품과 구매 전 내용을 이어서 확인할 수 있어요.</p>
        </div>
        <button type="button" onClick={onClear} className="rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-bold text-stone-600 transition hover:bg-stone-50">다른 영역 고르기</button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {products.map((product) => {
          const decision = getPaidAnalysisTopicConfig(product.id)?.purchaseDecision;
          if (!decision) return null;
          const state = toPremiumAnalysisProductState(stateByProductId.get(product.id));
          const selected = selectedProductId === product.id;
          const owned = state !== "not_purchased";
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => onSelect(product.id)}
              className={`rounded-[1.35rem] border p-5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8069ec] ${selected ? "border-[#8069ec] bg-[#f7f5ff] shadow-[0_10px_28px_rgba(105,83,204,0.1)]" : "border-stone-200 bg-white hover:border-[#b8acec] hover:bg-[#fcfbff]"}`}
            >
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-500">{product.title}</span>
                {recommendedIdSet.has(product.id) ? <span className="rounded-full bg-[#eeeaff] px-2.5 py-1 text-[#6f58d7]">내 추천</span> : null}
                {owned ? <span className="rounded-full bg-[#eef3f0] px-2.5 py-1 text-[#52705f]">{STATUS_LABELS[state]}</span> : null}
              </div>
              <p className="mt-3 text-[17px] font-black leading-7 tracking-[-0.025em] text-stone-900">{getReadablePaidQuestion(product.id, decision.decisionQuestion)}</p>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-stone-100 pt-3">
                <span className="text-xs text-stone-500">{product.details?.[0] ?? product.description}</span>
                <span className="shrink-0 text-xs font-black text-stone-700">{formatPrice(product.id)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedProduct && purchaseDecision ? (
        <div className="mt-6 rounded-[1.6rem] border border-[#dce1ef] bg-[#f7f8fc] p-1 sm:p-2">
          <PremiumProductDetail
            key={selectedProduct.id}
            product={selectedProduct}
            state={toPremiumAnalysisProductState(stateByProductId.get(selectedProduct.id))}
            profileId={profileId}
            onClear={() => onSelect("")}
            isSaved={savedProductIds.has(selectedProduct.id)}
          />
        </div>
      ) : (
        <div className="mt-5 rounded-[1.35rem] border border-dashed border-[#cfd5e6] bg-[#f7f8fc] px-5 py-6 text-center">
          <p className="text-xs text-stone-500">질문을 선택하면 분석 내용, 가격, 리포트 구조와 구매 전 안내가 열려요.</p>
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
  stateByProductId,
  profileId,
  savedProductIds,
  recommendedIdSet,
}: {
  products: readonly PremiumProductDefinition[];
  selectedProductId: string | null;
  onSelect: (productId: string) => void;
  onClear: () => void;
  stateByProductId: ReadonlyMap<string, CatalogProductState>;
  profileId?: string;
  savedProductIds: ReadonlySet<string>;
  recommendedIdSet: ReadonlySet<string>;
}) {
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;

  return (
    <div className="pt-7">
      <div>
        <p className="text-xs font-black tracking-[0.12em] text-stone-400">STEP 1</p>
        <h3 className="mt-2 text-lg font-black text-stone-900">어느 시간의 흐름이 궁금하세요?</h3>
        <p className="mt-1.5 text-sm text-stone-500">기간 상품명보다, 지금 알고 싶은 시간 범위와 질문을 먼저 골라보세요.</p>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => {
          const decision = product.purchaseDecision;
          if (!decision) return null;
          const selected = selectedProductId === product.id;
          const state = toPremiumAnalysisProductState(stateByProductId.get(product.id));
          const owned = state !== "not_purchased";
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => onSelect(product.id)}
              className={`rounded-[1.45rem] border p-5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8069ec] ${selected ? "border-[#8069ec] bg-[#f7f5ff] shadow-[0_10px_28px_rgba(105,83,204,0.1)]" : "border-stone-200 bg-white hover:-translate-y-0.5 hover:border-[#b8acec] hover:shadow-[0_10px_28px_rgba(28,25,23,0.05)]"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${selected ? "bg-[#7862e8] text-white" : "bg-[#f0edfb] text-[#6e5bc8]"}`}><CatalogIcon name={PERIOD_ICONS[product.id] ?? "period"} className="h-5 w-5" /></span>
                <div className="flex flex-wrap justify-end gap-1.5 text-[10px] font-bold">
                  {recommendedIdSet.has(product.id) ? <span className="rounded-full bg-[#eeeaff] px-2.5 py-1 text-[#6f58d7]">내 추천</span> : null}
                  {owned ? <span className="rounded-full bg-[#eef3f0] px-2.5 py-1 text-[#52705f]">{STATUS_LABELS[state]}</span> : null}
                </div>
              </div>
              <p className="mt-4 text-xs font-black tracking-[0.08em] text-[#7662c6]">{product.title}</p>
              <p className="mt-2 text-[16px] font-black leading-7 tracking-[-0.025em] text-stone-900">{getReadablePaidQuestion(product.id, decision.primaryQuestion)}</p>
              <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-xs">
                <span className="text-stone-500">{decision.recommendedFor[0]}</span>
                <span className="ml-3 shrink-0 font-black text-stone-700">{formatPrice(product.id)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedProduct?.purchaseDecision ? (
        <div className="mt-6 rounded-[1.6rem] border border-[#dce1ef] bg-[#f7f8fc] p-1 sm:p-2">
          <PremiumProductDetail
            key={selectedProduct.id}
            product={selectedProduct}
            state={toPremiumAnalysisProductState(stateByProductId.get(selectedProduct.id))}
            profileId={profileId}
            onClear={onClear}
            isSaved={savedProductIds.has(selectedProduct.id)}
          />
        </div>
      ) : (
        <div className="mt-5 rounded-[1.35rem] border border-dashed border-[#cfd5e6] bg-[#f7f8fc] px-5 py-6 text-center">
          <p className="text-xs text-stone-500">시간 범위를 선택하면 분석 내용, 가격, 리포트 구조와 구매 전 안내가 열려요.</p>
        </div>
      )}
    </div>
  );
}
