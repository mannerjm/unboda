"use client";

import Link from "next/link";
import { getPaidAnalysisTopicConfig } from "@/app/lib/paidAnalysisTopicConfig";
import { getPremiumAnalysisHref, type PremiumAnalysisProductState } from "@/app/lib/premiumAnalysisNavigation";
import type { PremiumProductDefinition } from "@/app/lib/premiumProductRegistry";
import { getProductPricing } from "@/app/lib/productPricing";

type PremiumProductDetailProps = {
  product: PremiumProductDefinition;
  state: PremiumAnalysisProductState;
  profileId?: string;
  onClear?: () => void;
};

const ACTION_LABELS: Record<PremiumAnalysisProductState, string> = {
  not_purchased: "이 분석 시작하기",
  none: "심층 분석 생성하기",
  generating: "생성 중",
  completed: "리포트 보기",
  failed: "다시 생성하기",
};

function formatPrice(productId: string): string {
  return `${getProductPricing(productId).amount.toLocaleString("ko-KR")}원`;
}

function DetailList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="mt-5">
      <p className="text-xs font-semibold text-stone-700">{title}</p>
      <ul className="mt-2 space-y-1 text-sm leading-6 text-stone-600">
        {items.map((item) => <li key={item}>· {item}</li>)}
      </ul>
    </div>
  );
}

export default function PremiumProductDetail({
  product,
  state,
  profileId,
  onClear,
}: PremiumProductDetailProps) {
  const topicDecision = getPaidAnalysisTopicConfig(product.id)?.purchaseDecision;
  const periodDecision = product.purchaseDecision;
  const isPeriod = product.kind === "PERIOD";
  const primaryQuestion = isPeriod
    ? periodDecision?.primaryQuestion
    : topicDecision?.decisionQuestion;
  const recommendedFor = isPeriod
    ? periodDecision?.recommendedFor
    : topicDecision?.recommendedFor.slice(0, 3);
  const analysisScope = isPeriod
    ? periodDecision?.analysisScope
    : topicDecision?.whatItAnalyzes.slice(0, 4);
  const expectedUnderstanding = isPeriod
    ? periodDecision?.expectedUnderstanding
    : topicDecision?.expectedUnderstanding.slice(0, 3);
  const distinction = isPeriod
    ? periodDecision?.distinction
    : topicDecision?.distinction;
  const href = getPremiumAnalysisHref(product.id, state, profileId);

  if (!primaryQuestion || !recommendedFor || !analysisScope || !expectedUnderstanding || !distinction) {
    return null;
  }

  return (
    <section className="mt-6 rounded-xl border border-[#cdbb98] bg-[#fffdf8] p-5 sm:p-6" aria-labelledby="selected-product-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-stone-500">
            {isPeriod ? "선택한 기간 분석" : "선택한 분석"}
          </p>
          <h3 id="selected-product-title" className="mt-2 text-xl font-bold text-stone-900">{product.title}</h3>
        </div>
        {onClear ? (
          <button type="button" onClick={onClear} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600">
            {isPeriod ? "다른 기간 선택" : "다른 분석 선택"}
          </button>
        ) : null}
      </div>
      <p className="mt-4 text-sm font-semibold leading-6 text-stone-900">{primaryQuestion}</p>
      <DetailList title={isPeriod ? "이런 때 살펴보세요" : "이런 고민이 있다면"} items={recommendedFor} />
      <DetailList title="이 분석이 확인하는 것" items={analysisScope} />
      <DetailList title={isPeriod ? "분석 후 이해할 수 있는 것" : "분석을 받고 나면"} items={expectedUnderstanding} />
      <div className="mt-5 border-t border-stone-200 pt-4">
        <p className="text-xs font-semibold text-stone-700">{isPeriod ? "다른 기간 분석과의 차이" : "비슷한 분석과의 차이"}</p>
        <p className="mt-2 text-sm leading-6 text-stone-600">{distinction}</p>
      </div>
      {!isPeriod ? (
        <p className="mt-5 border-t border-stone-200 pt-4 text-sm leading-6 text-stone-700">
          그래서 이 분석으로 {expectedUnderstanding[0]}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4">
        <span className="text-sm font-medium text-stone-500">{formatPrice(product.id)}</span>
        {state === "generating" ? (
          <span className="rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-500">{ACTION_LABELS[state]}</span>
        ) : href ? (
          <Link href={href} className="rounded-lg bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800">
            {ACTION_LABELS[state]}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
