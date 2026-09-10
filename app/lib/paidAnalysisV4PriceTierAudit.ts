import { getPeriodAnalysisStrategy } from "./analysisPeriodStrategy";
import {
  getLaunchProductIds,
  getPaidAnalysisPremiumDepthContract,
  getPaidAnalysisTopicConfig,
  resolvePaidAnalysisLaunchSpecialization,
} from "./paidAnalysisTopicConfig";
import {
  getProductPricing,
  LAUNCH_V1_FAMILY_PRICES,
  type PricingFamily,
} from "./productPricing";

export type PaidAnalysisV4PriceTierAuditProduct = {
  productId: string;
  family: PricingFamily;
  amount: number;
  kind: "topic" | "period";
};

export type PaidAnalysisV4PriceTierAuditReport = {
  launchProductCount: number;
  familyCounts: Record<PricingFamily, number>;
  products: PaidAnalysisV4PriceTierAuditProduct[];
  errors: string[];
};

const EXPECTED_FAMILY_COUNTS: Readonly<Record<PricingFamily, number>> = {
  CORE: 41,
  DEEP: 8,
  LONG_RANGE: 4,
  SIGNATURE: 1,
};

const FAMILY_RANK: Readonly<Record<PricingFamily, number>> = {
  CORE: 1,
  DEEP: 2,
  LONG_RANGE: 3,
  SIGNATURE: 4,
};

function pushIf(errors: string[], condition: boolean, message: string): void {
  if (condition) errors.push(message);
}

function normalizedText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function tokenSet(value: string): Set<string> {
  return new Set(
    normalizedText(value)
      .split(/[^\p{L}\p{N}]+/u)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2),
  );
}

function overlap(left: string, right: string): number {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return shared / Math.max(leftTokens.size, rightTokens.size);
}

function periodValueSignature(productId: string): string {
  const strategy = getPeriodAnalysisStrategy(productId);
  if (!strategy) return "";
  return [
    strategy.coreQuestion,
    ...strategy.focus,
    ...strategy.requiredInsights.map((item) => item.title),
    strategy.evidenceArchitecture,
    strategy.causeArchitecture,
    strategy.reviewArtifact,
  ].join(" | ");
}

/**
 * Price-tier release gate.
 *
 * This intentionally measures contract responsibilities instead of raw text length.
 * A more expensive report must own stronger evidence/review responsibilities or a
 * materially broader time horizon; merely generating more characters is not value.
 */
export function auditPaidAnalysisV4PriceTiers(): PaidAnalysisV4PriceTierAuditReport {
  const launchIds = getLaunchProductIds();
  const errors: string[] = [];
  const products: PaidAnalysisV4PriceTierAuditProduct[] = [];
  const familyCounts: Record<PricingFamily, number> = {
    CORE: 0,
    DEEP: 0,
    LONG_RANGE: 0,
    SIGNATURE: 0,
  };

  for (const productId of launchIds) {
    const pricing = getProductPricing(productId);
    const specialization = resolvePaidAnalysisLaunchSpecialization(productId);
    familyCounts[pricing.family] += 1;

    pushIf(
      errors,
      pricing.amount !== LAUNCH_V1_FAMILY_PRICES[pricing.family],
      `${productId}: ${pricing.family} 가격이 Launch V1 기준과 다릅니다.`,
    );

    if (specialization.kind === "none") {
      errors.push(`${productId}: 가격은 있으나 V4 전문화 계약이 없습니다.`);
      continue;
    }

    products.push({
      productId,
      family: pricing.family,
      amount: pricing.amount,
      kind: specialization.kind,
    });

    if (pricing.family === "DEEP") {
      pushIf(errors, specialization.kind !== "topic", `${productId}: DEEP 상품은 주제형 심층 계약이어야 합니다.`);
      if (specialization.kind !== "topic") continue;

      const config = specialization.config;
      const customerConfig = getPaidAnalysisTopicConfig(productId);
      const depthContract = getPaidAnalysisPremiumDepthContract(config);
      const distinctEvidenceKeys = new Set(
        depthContract.insightOwnership.map((item) => item.evidenceKey),
      );

      pushIf(errors, config.analysisFocus.length < 3, `${productId}: DEEP 분석 초점은 최소 3개여야 합니다.`);
      pushIf(errors, config.requiredInsights.length < 4, `${productId}: DEEP 필수 통찰은 최소 4개여야 합니다.`);
      pushIf(errors, config.actionFocus.length < 3, `${productId}: DEEP 행동 책임은 최소 3개여야 합니다.`);
      pushIf(errors, (config.excludedFocus?.length ?? 0) < 3, `${productId}: DEEP 인접상품 경계는 최소 3개여야 합니다.`);
      pushIf(errors, config.prohibitedClaims.length < 4, `${productId}: DEEP 안전·과장 금지 경계는 최소 4개여야 합니다.`);
      pushIf(errors, depthContract.insightOwnership.length < 4, `${productId}: DEEP 통찰별 깊이 책임은 최소 4개여야 합니다.`);
      pushIf(errors, distinctEvidenceKeys.size < 4, `${productId}: DEEP 핵심 통찰은 최소 4개의 서로 다른 명리 근거 축에 연결되어야 합니다.`);
      pushIf(errors, !customerConfig, `${productId}: DEEP 고객용 구매 가치 설명이 없습니다.`);
      if (customerConfig) {
        pushIf(errors, customerConfig.purchaseDecision.whatItAnalyzes.length < 5, `${productId}: DEEP 구매 전 분석 범위는 최소 5개 항목이어야 합니다.`);
        pushIf(errors, customerConfig.purchaseDecision.expectedUnderstanding.length < 3, `${productId}: DEEP 구매 후 기대 이해는 최소 3개 항목이어야 합니다.`);
      }
    }

    if (pricing.family === "LONG_RANGE" || pricing.family === "SIGNATURE") {
      pushIf(errors, specialization.kind !== "period", `${productId}: ${pricing.family} 상품은 기간형 전략 계약이어야 합니다.`);
      if (specialization.kind !== "period") continue;

      const strategy = getPeriodAnalysisStrategy(productId);
      if (!strategy) {
        errors.push(`${productId}: ${pricing.family} 기간 전략을 찾을 수 없습니다.`);
        continue;
      }

      const insightIds = strategy.requiredInsights.map((item) => normalizedText(item.id));
      const observableSignals = strategy.requiredInsights.map((item) => normalizedText(item.observableSignal));
      const actionResponsibilities = strategy.requiredInsights.map((item) => normalizedText(item.actionResponsibility));
      const timelineLabels = strategy.timelineSpec.labels.map(normalizedText);

      pushIf(errors, strategy.requiredInsights.length < 4, `${productId}: ${pricing.family} 전략 통찰은 최소 4개여야 합니다.`);
      pushIf(errors, new Set(insightIds).size !== insightIds.length, `${productId}: ${pricing.family} 전략 통찰 ID가 중복됩니다.`);
      pushIf(errors, new Set(observableSignals).size !== observableSignals.length, `${productId}: ${pricing.family} 관찰 신호가 서로 다른 전략 책임으로 분리되지 않았습니다.`);
      pushIf(errors, new Set(actionResponsibilities).size !== actionResponsibilities.length, `${productId}: ${pricing.family} 행동 책임이 서로 다른 전략 단계로 분리되지 않았습니다.`);
      pushIf(errors, timelineLabels.length < 4, `${productId}: ${pricing.family} 타임라인은 최소 4구간이어야 합니다.`);
      pushIf(errors, new Set(timelineLabels).size !== timelineLabels.length, `${productId}: ${pricing.family} 타임라인 구간이 중복됩니다.`);
      pushIf(errors, normalizedText(strategy.reviewArtifact).length < 10, `${productId}: ${pricing.family} 검토 산출물이 구체적이지 않습니다.`);

      if (pricing.family === "LONG_RANGE") {
        pushIf(
          errors,
          !["year", "multi-year", "daeun"].includes(strategy.timeGranularity),
          `${productId}: LONG_RANGE는 연간·다년·대운 수준의 시간 범위를 소유해야 합니다.`,
        );
      } else {
        pushIf(errors, strategy.timeGranularity !== "lifetime", `${productId}: SIGNATURE는 생애 단위 시간 범위를 소유해야 합니다.`);
        pushIf(errors, !strategy.causeArchitecture.includes("cross-phase synthesis"), `${productId}: SIGNATURE는 생애 구간을 가로지르는 cross-phase synthesis 책임이 필요합니다.`);
        pushIf(errors, !strategy.reviewArtifact.includes("synthesis"), `${productId}: SIGNATURE 검토 산출물에는 생애 synthesis가 명시되어야 합니다.`);
      }
    }

    if (pricing.family === "CORE" && specialization.kind === "period") {
      const strategy = getPeriodAnalysisStrategy(productId);
      pushIf(errors, !strategy, `${productId}: CORE 기간 상품 전략이 없습니다.`);
      if (strategy) {
        pushIf(errors, strategy.timeGranularity !== "month", `${productId}: CORE 기간 상품은 월 단위 단기 전략이어야 합니다.`);
      }
    }
  }

  for (const family of Object.keys(EXPECTED_FAMILY_COUNTS) as PricingFamily[]) {
    pushIf(
      errors,
      familyCounts[family] !== EXPECTED_FAMILY_COUNTS[family],
      `${family}: Launch 가격군은 ${EXPECTED_FAMILY_COUNTS[family]}개여야 하나 현재 ${familyCounts[family]}개입니다.`,
    );
  }

  const periodProducts = products.filter((item) => item.kind === "period");
  for (const expensive of periodProducts) {
    if (expensive.family === "CORE") continue;
    const expensiveSignature = periodValueSignature(expensive.productId);

    for (const cheaper of periodProducts) {
      if (FAMILY_RANK[cheaper.family] >= FAMILY_RANK[expensive.family]) continue;
      const cheaperSignature = periodValueSignature(cheaper.productId);
      const ownershipOverlap = overlap(expensiveSignature, cheaperSignature);
      pushIf(
        errors,
        ownershipOverlap >= 0.85,
        `${expensive.productId}: 더 저렴한 ${cheaper.productId}와 기간 전략 소유권이 과도하게 겹칩니다 (${ownershipOverlap.toFixed(2)}).`,
      );
    }
  }

  pushIf(errors, products.length !== 54, `가격 단계 감사 대상은 정확히 54개여야 합니다. 현재 ${products.length}개입니다.`);

  return {
    launchProductCount: launchIds.length,
    familyCounts,
    products,
    errors,
  };
}

export function assertPaidAnalysisV4PriceTiersReady(): PaidAnalysisV4PriceTierAuditReport {
  const report = auditPaidAnalysisV4PriceTiers();
  if (report.errors.length > 0) {
    throw new Error(`V4 가격 단계 품질 감사 실패:\n${report.errors.join("\n")}`);
  }
  return report;
}
