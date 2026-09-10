import { getPeriodAnalysisStrategy } from "./analysisPeriodStrategy";
import { getPaidAnalysisEngine } from "./paidAnalysisEngine";
import {
  getLaunchProductIds,
  getPaidAnalysisPremiumDepthContract,
  getPaidAnalysisTopicConfig,
  resolvePaidAnalysisLaunchSpecialization,
} from "./paidAnalysisTopicConfig";
import {
  validatePremiumDepthContract,
  validatePremiumDepthSiblingDistinction,
} from "./paidAnalysisV4QualityValidators";
import { getPremiumProduct } from "./premiumProductRegistry";
import { getProductPricing } from "./productPricing";

export type PaidAnalysisV4LaunchAuditProduct = {
  productId: string;
  kind: "topic" | "period";
  engine: string;
  pricingFamily: string;
};

export type PaidAnalysisV4LaunchAuditReport = {
  launchProductCount: number;
  topicProductCount: number;
  periodProductCount: number;
  products: PaidAnalysisV4LaunchAuditProduct[];
  errors: string[];
};

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function pushIf(errors: string[], condition: boolean, message: string): void {
  if (condition) errors.push(message);
}

function normalizedKey(values: readonly string[]): string {
  return values.map((value) => value.replace(/\s+/g, " ").trim()).join("|");
}

export function auditPaidAnalysisV4LaunchCatalog(): PaidAnalysisV4LaunchAuditReport {
  const launchIds = getLaunchProductIds();
  const errors: string[] = [];
  const products: PaidAnalysisV4LaunchAuditProduct[] = [];
  const uniqueIds = new Set(launchIds);

  pushIf(errors, launchIds.length !== 54, `Launch 상품은 정확히 54개여야 합니다. 현재 ${launchIds.length}개입니다.`);
  pushIf(errors, uniqueIds.size !== launchIds.length, "Launch 상품 ID가 중복됩니다.");

  const topicContracts: Array<{
    productId: string;
    engine: string;
    contract: ReturnType<typeof getPaidAnalysisPremiumDepthContract>;
  }> = [];
  const topicQuestions = new Map<string, string>();
  const periodQuestions = new Map<string, string>();
  const periodOwnershipKeys = new Map<string, string>();

  for (const productId of launchIds) {
    const premiumProduct = getPremiumProduct(productId);
    const engine = getPaidAnalysisEngine(productId);
    const pricing = getProductPricing(productId);
    const specialization = resolvePaidAnalysisLaunchSpecialization(productId);

    pushIf(errors, !premiumProduct, `${productId}: premium registry 상품이 없습니다.`);
    pushIf(errors, !engine, `${productId}: 분석 엔진을 확인할 수 없습니다.`);
    pushIf(errors, pricing.amount <= 0, `${productId}: 판매 가격이 0 이하입니다.`);
    pushIf(errors, specialization.kind === "none", `${productId}: Launch V4 전문화 계약이 없습니다.`);

    if (!engine) {
      continue;
    }

    if (specialization.kind === "topic") {
      const config = specialization.config;
      products.push({ productId, kind: "topic", engine, pricingFamily: pricing.family });

      pushIf(errors, config.productId !== productId, `${productId}: topic config ID가 canonical ID와 다릅니다.`);
      pushIf(errors, config.engine !== engine, `${productId}: topic config engine과 runtime engine이 다릅니다.`);
      pushIf(errors, !hasText(config.userQuestion), `${productId}: 고객 핵심 질문이 비어 있습니다.`);
      pushIf(errors, config.analysisFocus.length < 3, `${productId}: 분석 초점은 최소 3개여야 합니다.`);
      pushIf(errors, config.requiredInsights.length < 4, `${productId}: 필수 통찰은 최소 4개여야 합니다.`);
      pushIf(errors, config.evidenceFocus.length < 4, `${productId}: 우선 명리 근거는 최소 4개여야 합니다.`);
      pushIf(errors, config.actionFocus.length < 3, `${productId}: 행동 책임은 최소 3개여야 합니다.`);
      pushIf(errors, config.prohibitedClaims.length < 3, `${productId}: 금지 주장은 최소 3개여야 합니다.`);
      pushIf(errors, (config.excludedFocus?.length ?? 0) < 2, `${productId}: 인접 상품과의 제외 경계는 최소 2개여야 합니다.`);

      const insightIds = config.requiredInsights.map((item) => item.id);
      pushIf(errors, new Set(insightIds).size !== insightIds.length, `${productId}: 필수 통찰 ID가 중복됩니다.`);
      pushIf(errors, config.requiredInsights.some((item) => !hasText(item.prompt)), `${productId}: 비어 있는 필수 통찰 문구가 있습니다.`);
      pushIf(errors, config.analysisFocus.some((item) => !hasText(item)), `${productId}: 비어 있는 분석 초점이 있습니다.`);
      pushIf(errors, config.actionFocus.some((item) => !hasText(item)), `${productId}: 비어 있는 행동 책임이 있습니다.`);
      pushIf(errors, config.prohibitedClaims.some((item) => !hasText(item)), `${productId}: 비어 있는 금지 주장이 있습니다.`);

      const customerConfig = getPaidAnalysisTopicConfig(productId);
      pushIf(errors, !customerConfig, `${productId}: 고객용 구매 판단 계약을 확인할 수 없습니다.`);
      if (customerConfig) {
        const purchaseDecision = customerConfig.purchaseDecision;
        pushIf(errors, purchaseDecision.recommendedFor.length < 3, `${productId}: 구매 추천 상황이 3개 미만입니다.`);
        pushIf(errors, purchaseDecision.whatItAnalyzes.length < 3, `${productId}: 구매 전 분석 범위 설명이 3개 미만입니다.`);
        pushIf(errors, purchaseDecision.expectedUnderstanding.length < 3, `${productId}: 구매 후 기대 이해가 3개 미만입니다.`);
        pushIf(errors, !hasText(purchaseDecision.distinction), `${productId}: 인접 상품 차이 설명이 없습니다.`);
        pushIf(errors, !hasText(purchaseDecision.decisionQuestion), `${productId}: 구매 판단 질문이 없습니다.`);
      }

      const normalizedQuestion = config.userQuestion.replace(/\s+/g, " ").trim();
      const previousQuestionProduct = topicQuestions.get(normalizedQuestion);
      pushIf(errors, Boolean(previousQuestionProduct), `${productId}: 고객 핵심 질문이 ${previousQuestionProduct}와 완전히 같습니다.`);
      topicQuestions.set(normalizedQuestion, productId);

      const contract = getPaidAnalysisPremiumDepthContract(config);
      const depthValidation = validatePremiumDepthContract(contract);
      for (const issue of depthValidation.issues) {
        errors.push(`${productId}: ${issue.field} - ${issue.message}`);
      }
      topicContracts.push({ productId, engine, contract });
      continue;
    }

    if (specialization.kind === "period") {
      const strategy = getPeriodAnalysisStrategy(productId);
      products.push({ productId, kind: "period", engine, pricingFamily: pricing.family });

      pushIf(errors, !strategy, `${productId}: 기간 분석 전략이 없습니다.`);
      if (!strategy) continue;

      pushIf(errors, strategy.productId !== productId, `${productId}: period strategy ID가 canonical ID와 다릅니다.`);
      pushIf(errors, !hasText(strategy.coreQuestion), `${productId}: 기간 핵심 질문이 비어 있습니다.`);
      pushIf(errors, strategy.focus.length < 3, `${productId}: 기간 분석 초점은 최소 3개여야 합니다.`);
      pushIf(errors, strategy.timelineSpec.labels.length < 4, `${productId}: 기간 타임라인은 최소 4구간이어야 합니다.`);
      pushIf(errors, !hasText(strategy.timelineSpec.rule), `${productId}: 기간 타임라인 규칙이 없습니다.`);
      pushIf(errors, strategy.requiredInsights.length < 4, `${productId}: 기간 필수 통찰은 최소 4개여야 합니다.`);
      pushIf(errors, strategy.prohibitedPatterns.length < 3, `${productId}: 기간 금지 패턴은 최소 3개여야 합니다.`);
      pushIf(errors, !hasText(strategy.evidenceArchitecture), `${productId}: 기간 evidence architecture가 없습니다.`);
      pushIf(errors, !hasText(strategy.causeArchitecture), `${productId}: 기간 cause architecture가 없습니다.`);
      pushIf(errors, !hasText(strategy.reviewArtifact), `${productId}: 기간 review artifact가 없습니다.`);

      const responsibilityIds = strategy.requiredInsights.map((item) => item.id);
      pushIf(errors, new Set(responsibilityIds).size !== responsibilityIds.length, `${productId}: 기간 필수 통찰 ID가 중복됩니다.`);
      pushIf(
        errors,
        strategy.requiredInsights.some((item) =>
          [item.title, item.evidenceInterpretation, item.mechanismResponsibility, item.observableSignal, item.actionResponsibility]
            .some((value) => !hasText(value)),
        ),
        `${productId}: 기간 통찰의 근거·메커니즘·관찰신호·행동책임 중 비어 있는 값이 있습니다.`,
      );

      const normalizedQuestion = strategy.coreQuestion.replace(/\s+/g, " ").trim();
      const previousQuestionProduct = periodQuestions.get(normalizedQuestion);
      pushIf(errors, Boolean(previousQuestionProduct), `${productId}: 기간 핵심 질문이 ${previousQuestionProduct}와 완전히 같습니다.`);
      periodQuestions.set(normalizedQuestion, productId);

      const ownershipKey = normalizedKey([
        ...strategy.focus,
        ...strategy.requiredInsights.map((item) => item.title),
        strategy.reviewArtifact,
      ]);
      const previousOwnershipProduct = periodOwnershipKeys.get(ownershipKey);
      pushIf(errors, Boolean(previousOwnershipProduct), `${productId}: 기간 분석 소유권이 ${previousOwnershipProduct}와 완전히 같습니다.`);
      periodOwnershipKeys.set(ownershipKey, productId);
    }
  }

  for (let leftIndex = 0; leftIndex < topicContracts.length; leftIndex += 1) {
    const left = topicContracts[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < topicContracts.length; rightIndex += 1) {
      const right = topicContracts[rightIndex];
      if (left.engine !== right.engine) continue;

      const distinction = validatePremiumDepthSiblingDistinction(left.contract, right.contract);
      if (!distinction.ok) {
        errors.push(`${left.productId} ↔ ${right.productId}: 같은 영역의 두 상품이 V4 긍정적 분석 소유권 기준에서 과도하게 겹칩니다.`);
      }
    }
  }

  const topicProductCount = products.filter((item) => item.kind === "topic").length;
  const periodProductCount = products.filter((item) => item.kind === "period").length;
  pushIf(errors, topicProductCount !== 47, `주제별 Launch 상품은 정확히 47개여야 합니다. 현재 ${topicProductCount}개입니다.`);
  pushIf(errors, periodProductCount !== 7, `기간별 Launch 상품은 정확히 7개여야 합니다. 현재 ${periodProductCount}개입니다.`);
  pushIf(errors, products.length !== 54, `V4 감사 대상이 정확히 54개여야 합니다. 현재 ${products.length}개입니다.`);

  return {
    launchProductCount: launchIds.length,
    topicProductCount,
    periodProductCount,
    products,
    errors,
  };
}

export function assertPaidAnalysisV4LaunchCatalogReady(): PaidAnalysisV4LaunchAuditReport {
  const report = auditPaidAnalysisV4LaunchCatalog();
  if (report.errors.length > 0) {
    throw new Error(`V4 Launch 54 상품 정적 감사 실패:\n${report.errors.join("\n")}`);
  }
  return report;
}
