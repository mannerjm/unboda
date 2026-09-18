import { formatAnalysisEditionLabel } from "./analysisEditionLabel";
import { resolveAnalysisEditionForOrder } from "./analysisEditionForOrder";
import { getLaunchProductIds } from "./paidAnalysisTopicConfig";
import {
  ALL_PREMIUM_PRODUCTS,
  getPremiumCategoryLabel,
  getPremiumProduct,
} from "./premiumProductRegistry";
import { listUserEntitlements } from "./purchases/server";
import { PAID_ANALYSIS_RESOURCE_TYPE } from "./purchases/types";
import type { ProfileDto } from "./profiles/types";
import {
  getSpecialAnalysisProduct,
  isSpecialAnalysisProductId,
} from "./specialAnalysisProducts";

export type Phase9NextAnalysisRecommendation = {
  productId: string;
  title: string;
  categoryLabel: string;
  description: string;
  reason: string;
  href: string;
  analysisEditionKey: string | null;
  editionLabel: string | null;
  kind: "PREMIUM" | "SPECIAL";
};

export type Phase9SourceAnalysis = {
  productId: string;
  analysisEditionKey: string | null;
};

const PERIOD_NEXT: Readonly<Record<string, readonly string[]>> = {
  "monthly-current": ["monthly-next", "yearly-current"],
  "monthly-next": ["yearly-current", "monthly-12months"],
  "yearly-current": ["annual-next", "annual-3years"],
  "annual-next": ["annual-3years", "daeun-current"],
  "annual-3years": ["daeun-current", "lifetime-overview"],
  "monthly-12months": ["yearly-current", "annual-3years"],
  "daeun-current": ["lifetime-overview", "annual-3years"],
  "lifetime-overview": ["daeun-current", "yearly-current"],
};

const SPECIAL_FOLLOW_UP: Readonly<Record<string, readonly string[]>> = {
  "compatibility-romantic": ["relationship-current", "relationship-conflict", "yearly-current"],
  "compatibility-family-parent-child": ["social-family", "relationship-boundary", "yearly-current"],
  "compatibility-family-siblings": ["social-family", "relationship-conflict", "yearly-current"],
  "compatibility-family-other": ["social-family", "relationship-boundary", "yearly-current"],
  "compatibility-workplace": ["career-workplace-relationships", "career-organization-fit", "yearly-current"],
  "compatibility-friend": ["relationship-friendship", "relationship-boundary", "yearly-current"],
  "compatibility-business": ["business-team-management", "business-startup-readiness", "yearly-current"],
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function genericCompatibilityRecommendation(profileId: string): Phase9NextAnalysisRecommendation {
  return {
    productId: "compatibility",
    title: "궁합 분석",
    categoryLabel: "전문 분석 · 궁합",
    description: "연인·배우자, 가족, 직장·동료, 친구·지인, 사업·동업 관계를 선택해 두 사람의 관계 구조와 현재 흐름을 함께 살펴봅니다.",
    reason: "개인의 관계 흐름을 실제 두 사람의 관계 구조로 확장해 확인할 수 있습니다.",
    href: `/special-analysis/compatibility?profileId=${encodeURIComponent(profileId)}`,
    analysisEditionKey: null,
    editionLabel: null,
    kind: "SPECIAL",
  };
}

function candidateIdsForSource(source: Phase9SourceAnalysis | null): string[] {
  if (!source) return ["yearly-current", "career", "wealth", "relationship"];

  if (isSpecialAnalysisProductId(source.productId)) {
    return [...(SPECIAL_FOLLOW_UP[source.productId] ?? ["relationship", "yearly-current"])];
  }

  const sourceProduct = getPremiumProduct(source.productId);
  if (!sourceProduct) return ["yearly-current", "career", "wealth"];

  if (sourceProduct.kind === "PERIOD") {
    // Include the same product first so a genuinely new current edition can be
    // suggested later, while the exact edition already being viewed stays excluded.
    return unique([
      source.productId,
      ...(PERIOD_NEXT[source.productId] ?? ["yearly-current", "annual-3years"]),
    ]);
  }

  const launchIds = new Set(getLaunchProductIds());
  const sameCategory = ALL_PREMIUM_PRODUCTS
    .filter((product) =>
      product.kind === "TOPIC"
      && product.category === sourceProduct.category
      && product.id !== source.productId
      && launchIds.has(product.id),
    )
    .map((product) => product.id);

  return unique([
    source.productId,
    ...sameCategory,
    "yearly-current",
  ]);
}

function reasonForPremiumCandidate(
  source: Phase9SourceAnalysis | null,
  candidateId: string,
  candidateEditionKey: string,
): string {
  if (source?.productId === candidateId && source.analysisEditionKey !== candidateEditionKey) {
    return "이 리포트 이후 새 기준 시기가 열렸습니다. 같은 질문을 최신 흐름으로 다시 확인할 수 있습니다.";
  }

  const sourceProduct = source ? getPremiumProduct(source.productId) : undefined;
  const candidate = getPremiumProduct(candidateId);
  if (sourceProduct?.kind === "TOPIC" && candidate?.kind === "TOPIC" && sourceProduct.category === candidate.category) {
    return "같은 주제 안에서 다음으로 이어지는 질문을 더 구체적으로 확인할 수 있습니다.";
  }
  if (candidate?.kind === "PERIOD") {
    return "지금까지 확인한 내용을 현재 시기의 흐름과 연결해 다음 판단 기준을 살펴볼 수 있습니다.";
  }
  if (source && isSpecialAnalysisProductId(source.productId)) {
    return "관계 리포트에서 확인한 패턴을 내 개인 흐름과 선택 기준으로 다시 살펴볼 수 있습니다.";
  }
  return "현재 보유한 분석과 겹치지 않는 다음 질문으로 자연스럽게 이어갈 수 있습니다.";
}

export async function getPhase9NextAnalysisRecommendations(input: {
  userId: string;
  profile: ProfileDto;
  source?: Phase9SourceAnalysis | null;
  limit?: number;
}): Promise<Phase9NextAnalysisRecommendation[]> {
  const limit = Math.max(1, Math.min(input.limit ?? 2, 2));
  const source = input.source ?? null;
  const entitlements = (await listUserEntitlements(input.userId)).filter(
    (entitlement) =>
      entitlement.profileId === input.profile.id
      && entitlement.resourceType === PAID_ANALYSIS_RESOURCE_TYPE,
  );
  const ownsExact = (productId: string, editionKey: string) =>
    entitlements.some(
      (entitlement) =>
        entitlement.resourceId === productId
        && entitlement.analysisEditionKey === editionKey,
    );

  const recommendations: Phase9NextAnalysisRecommendation[] = [];
  const sourceProduct = source ? getPremiumProduct(source.productId) : undefined;

  // SPECIAL pair exception: owning one pair/year must not hide the compatibility
  // discovery entry, because the next partner/family pair resolves a different
  // exact edition only after that pair is selected.
  if (
    sourceProduct
    && sourceProduct.kind === "TOPIC"
    && (sourceProduct.category === "relationship" || sourceProduct.category === "social")
  ) {
    recommendations.push(genericCompatibilityRecommendation(input.profile.id));
  }

  const launchIds = new Set(getLaunchProductIds());
  for (const candidateId of candidateIdsForSource(source)) {
    if (recommendations.length >= limit) break;
    if (!launchIds.has(candidateId)) continue;

    const product = getPremiumProduct(candidateId);
    if (!product) continue;

    let editionKey: string;
    try {
      editionKey = (await resolveAnalysisEditionForOrder({
        userId: input.userId,
        profileId: input.profile.id,
        profile: input.profile,
        productId: candidateId,
      })).editionKey;
    } catch {
      continue;
    }

    if (source?.productId === candidateId && source.analysisEditionKey === editionKey) {
      continue;
    }
    if (ownsExact(candidateId, editionKey)) {
      continue;
    }

    recommendations.push({
      productId: candidateId,
      title: product.title,
      categoryLabel: getPremiumCategoryLabel(product.category),
      description: product.description,
      reason: reasonForPremiumCandidate(source, candidateId, editionKey),
      href: `/paid-analysis/${encodeURIComponent(candidateId)}?profileId=${encodeURIComponent(input.profile.id)}`,
      analysisEditionKey: editionKey,
      editionLabel: formatAnalysisEditionLabel(editionKey),
      kind: "PREMIUM",
    });
  }

  if (
    recommendations.length < limit
    && source
    && !isSpecialAnalysisProductId(source.productId)
    && sourceProduct
    && (sourceProduct.category === "relationship" || sourceProduct.category === "social")
    && !recommendations.some((item) => item.kind === "SPECIAL")
  ) {
    recommendations.push(genericCompatibilityRecommendation(input.profile.id));
  }

  return recommendations.slice(0, limit);
}

export function getPhase9SourceTitle(productId: string): string {
  return getSpecialAnalysisProduct(productId)?.title
    ?? getPremiumProduct(productId)?.title
    ?? productId;
}
