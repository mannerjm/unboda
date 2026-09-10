import { getPeriodAnalysisStrategy } from "./analysisPeriodStrategy";
import type { ResolvedPaidAnalysisDetailV4 } from "./paidAnalysisDetailOutput";
import {
  getPaidAnalysisPremiumDepthContract,
  resolvePaidAnalysisLaunchSpecialization,
} from "./paidAnalysisTopicConfig";
import { getProductPricing, type PricingFamily } from "./productPricing";
import { reviewEvidenceLinkage } from "./paidAnalysisV4QualityValidators";

export type PaidAnalysisV4ActualTierIssue = {
  field: string;
  severity: "error" | "warning";
  message: string;
};

export type PaidAnalysisV4ActualTierMetrics = {
  evidenceCount: number;
  distinctEvidenceKeyCount: number;
  causeReasonCount: number;
  distinctCauseReasonCount: number;
  actionCount: number;
  distinctActionTargetCount: number;
  distinctActionCompletionCount: number;
  currentObservableSignalCount: number;
  distinctCurrentObservableSignalCount: number;
  timelineCount: number;
  distinctTimelineLabelCount: number;
  decisionCheckCount: number;
  confidenceEvidenceCount: number;
  linkageWarningCount: number;
  ownershipFocusHitCount: number;
  ownershipActionHitCount: number;
  periodTimelineItemCount: number;
  periodKeyPointCount: number;
  periodSegmentActionCount: number;
  periodSegmentCautionCount: number;
  depthUnits: number;
};

export type PaidAnalysisV4ActualTierAuditResult = {
  ok: boolean;
  productId: string;
  family: PricingFamily;
  metrics: PaidAnalysisV4ActualTierMetrics;
  issues: PaidAnalysisV4ActualTierIssue[];
};

export type PaidAnalysisV4ActualTierSample = {
  productId: string;
  output: ResolvedPaidAnalysisDetailV4;
};

export type PaidAnalysisV4ActualTierSampleAudit = {
  ok: boolean;
  results: PaidAnalysisV4ActualTierAuditResult[];
  familyAverageDepthUnits: Partial<Record<PricingFamily, number>>;
  issues: PaidAnalysisV4ActualTierIssue[];
};

const GENERIC_OWNERSHIP_TOKENS = new Set([
  "현재",
  "분석",
  "기준",
  "판단",
  "사용자",
  "확인",
  "설명",
  "운영",
  "행동",
  "조건",
  "결과",
  "변화",
  "흐름",
  "문제",
  "관련",
  "실제",
  "필요",
  "검토",
  "조정",
  "가능",
  "해야",
  "대한",
  "에서",
  "으로",
  "하고",
  "하는",
  "한다",
]);

function normalizedText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function tokens(value: string): Set<string> {
  return new Set(
    normalizedText(value)
      .split(/[^\p{L}\p{N}]+/u)
      .map((token) => token.trim())
      .filter(
        (token) => token.length >= 2 && !GENERIC_OWNERSHIP_TOKENS.has(token),
      ),
  );
}

function sharedTokenCount(left: string, right: string): number {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  return [...leftTokens].filter((token) => rightTokens.has(token)).length;
}

function countDistinct(values: string[]): number {
  return new Set(values.map(normalizedText).filter(Boolean)).size;
}

function pushIssue(
  issues: PaidAnalysisV4ActualTierIssue[],
  condition: boolean,
  field: string,
  message: string,
  severity: PaidAnalysisV4ActualTierIssue["severity"] = "error",
): void {
  if (condition) issues.push({ field, severity, message });
}

function collectOwnershipText(output: ResolvedPaidAnalysisDetailV4): string {
  return [
    output.conclusion.headline,
    output.conclusion.focus,
    output.conclusion.rationale,
    output.conclusion.immediateAction,
    output.coreProblem.title,
    output.coreProblem.description,
    output.coreProblem.whyItMatters,
    output.cause.summary,
    ...output.cause.reasons.flatMap((item) => [
      item.title,
      item.realWorldPattern,
      item.problemLinkage,
    ]),
    ...output.evidence.flatMap((item) => [item.meaning, item.linkage]),
    ...output.timeline.flatMap((item) => [
      item.label,
      item.changeSignal,
      item.preparation,
    ]),
    ...output.action.flatMap((item) => [
      item.action,
      item.target,
      item.condition,
      item.completionCriteria,
    ]),
  ].join(" ");
}

function collectActionText(output: ResolvedPaidAnalysisDetailV4): string {
  return [
    output.conclusion.immediateAction,
    ...output.action.flatMap((item) => [
      item.action,
      item.target,
      item.condition,
      item.completionCriteria,
    ]),
  ].join(" ");
}

function familyMinimums(family: PricingFamily): {
  evidence: number;
  action: number;
  confidenceEvidence: number;
} {
  if (family === "CORE") {
    return { evidence: 3, action: 2, confidenceEvidence: 2 };
  }

  return { evidence: 4, action: 3, confidenceEvidence: 3 };
}

function computeDepthUnits(metrics: Omit<PaidAnalysisV4ActualTierMetrics, "depthUnits">): number {
  return (
    metrics.distinctEvidenceKeyCount * 3 +
    metrics.distinctCauseReasonCount * 2 +
    metrics.distinctActionTargetCount * 2 +
    metrics.distinctActionCompletionCount +
    Math.min(metrics.distinctCurrentObservableSignalCount, 6) +
    metrics.confidenceEvidenceCount +
    metrics.ownershipFocusHitCount +
    metrics.ownershipActionHitCount +
    metrics.periodTimelineItemCount * 2 +
    metrics.periodKeyPointCount +
    metrics.periodSegmentActionCount +
    metrics.periodSegmentCautionCount
  );
}

export function auditPaidAnalysisV4ActualOutputTier(
  productId: string,
  output: ResolvedPaidAnalysisDetailV4,
): PaidAnalysisV4ActualTierAuditResult {
  const pricing = getProductPricing(productId);
  const specialization = resolvePaidAnalysisLaunchSpecialization(productId);
  const issues: PaidAnalysisV4ActualTierIssue[] = [];
  const minimums = familyMinimums(pricing.family);

  if (specialization.kind === "none") {
    return {
      ok: false,
      productId,
      family: pricing.family,
      metrics: {
        evidenceCount: 0,
        distinctEvidenceKeyCount: 0,
        causeReasonCount: 0,
        distinctCauseReasonCount: 0,
        actionCount: 0,
        distinctActionTargetCount: 0,
        distinctActionCompletionCount: 0,
        currentObservableSignalCount: 0,
        distinctCurrentObservableSignalCount: 0,
        timelineCount: 0,
        distinctTimelineLabelCount: 0,
        decisionCheckCount: 0,
        confidenceEvidenceCount: 0,
        linkageWarningCount: 0,
        ownershipFocusHitCount: 0,
        ownershipActionHitCount: 0,
        periodTimelineItemCount: 0,
        periodKeyPointCount: 0,
        periodSegmentActionCount: 0,
        periodSegmentCautionCount: 0,
        depthUnits: 0,
      },
      issues: [
        {
          field: "productId",
          severity: "error",
          message: "Launch V4 전문화 계약이 없는 상품입니다.",
        },
      ],
    };
  }

  const evidenceKeys = output.evidence.map((item) => item.evidenceKey);
  const causeReasonSignatures = output.cause.reasons.map(
    (item) => `${item.title}|${item.realWorldPattern}|${item.problemLinkage}`,
  );
  const actionTargets = output.action.map((item) => item.target);
  const actionCompletions = output.action.map((item) => item.completionCriteria);
  const currentSignals = [
    ...output.current.opportunities.map((item) => item.observableSignal),
    ...output.current.cautions.map((item) => item.observableSignal),
  ];
  const timelineLabels = output.timeline.map((item) => item.label);
  const linkageWarnings = reviewEvidenceLinkage(output);
  const ownershipText = collectOwnershipText(output);
  const actionText = collectActionText(output);

  let ownershipFocusHitCount = 0;
  let ownershipActionHitCount = 0;

  if (specialization.kind === "topic") {
    const config = specialization.config;
    ownershipFocusHitCount = config.analysisFocus.filter(
      (focus) => sharedTokenCount(focus, ownershipText) >= 1,
    ).length;
    ownershipActionHitCount = config.actionFocus.filter(
      (focus) => sharedTokenCount(focus, actionText) >= 1,
    ).length;
  } else {
    const strategy = specialization.strategy;
    ownershipFocusHitCount = strategy.focus.filter(
      (focus) => sharedTokenCount(focus, ownershipText) >= 1,
    ).length;
    ownershipActionHitCount = strategy.requiredInsights.filter(
      (item) => sharedTokenCount(item.actionResponsibility, actionText) >= 1,
    ).length;
  }

  const periodTimelineItems = output.periodAnalysis?.timelineItems ?? [];
  const periodKeyPoints = output.periodAnalysis?.keyPoints ?? [];
  const periodSegmentActionCount = periodTimelineItems.filter(
    (item) => (item.actions?.length ?? 0) > 0,
  ).length;
  const periodSegmentCautionCount = periodTimelineItems.filter(
    (item) => (item.cautions?.length ?? 0) > 0,
  ).length;

  const metricsWithoutDepth: Omit<
    PaidAnalysisV4ActualTierMetrics,
    "depthUnits"
  > = {
    evidenceCount: output.evidence.length,
    distinctEvidenceKeyCount: new Set(evidenceKeys).size,
    causeReasonCount: output.cause.reasons.length,
    distinctCauseReasonCount: countDistinct(causeReasonSignatures),
    actionCount: output.action.length,
    distinctActionTargetCount: countDistinct(actionTargets),
    distinctActionCompletionCount: countDistinct(actionCompletions),
    currentObservableSignalCount: currentSignals.length,
    distinctCurrentObservableSignalCount: countDistinct(currentSignals),
    timelineCount: output.timeline.length,
    distinctTimelineLabelCount: countDistinct(timelineLabels),
    decisionCheckCount: output.decisionCheck?.length ?? 0,
    confidenceEvidenceCount: output.confidence.strongestEvidence.length,
    linkageWarningCount: linkageWarnings.length,
    ownershipFocusHitCount,
    ownershipActionHitCount,
    periodTimelineItemCount: periodTimelineItems.length,
    periodKeyPointCount: periodKeyPoints.length,
    periodSegmentActionCount,
    periodSegmentCautionCount,
  };
  const metrics: PaidAnalysisV4ActualTierMetrics = {
    ...metricsWithoutDepth,
    depthUnits: computeDepthUnits(metricsWithoutDepth),
  };

  pushIssue(
    issues,
    metrics.evidenceCount < minimums.evidence,
    "evidence",
    `${pricing.family} 실제 출력은 서로 다른 근거 축을 최소 ${minimums.evidence}개 실현해야 합니다.`,
  );
  pushIssue(
    issues,
    metrics.distinctEvidenceKeyCount !== metrics.evidenceCount,
    "evidence",
    "실제 출력의 evidenceKey가 중복되어 근거 깊이가 축소되었습니다.",
  );
  pushIssue(
    issues,
    metrics.distinctCauseReasonCount !== metrics.causeReasonCount,
    "cause.reasons",
    "원인 분석 3개가 서로 다른 메커니즘으로 분리되지 않았습니다.",
  );
  pushIssue(
    issues,
    metrics.actionCount < minimums.action,
    "action",
    `${pricing.family} 실제 출력은 최소 ${minimums.action}개의 독립 행동 책임이 필요합니다.`,
  );
  pushIssue(
    issues,
    metrics.distinctActionTargetCount !== metrics.actionCount,
    "action.target",
    "행동 항목이 같은 판단 대상을 반복하고 있습니다.",
  );
  pushIssue(
    issues,
    metrics.distinctActionCompletionCount !== metrics.actionCount,
    "action.completionCriteria",
    "행동 완료 기준이 서로 다른 검토 책임으로 분리되지 않았습니다.",
  );
  pushIssue(
    issues,
    metrics.distinctCurrentObservableSignalCount < 5,
    "current.observableSignal",
    "현재 상황의 관찰 신호가 충분히 분리되지 않았습니다.",
  );
  pushIssue(
    issues,
    metrics.distinctTimelineLabelCount !== metrics.timelineCount,
    "timeline.label",
    "타임라인 단계가 서로 다른 검토 단계로 분리되지 않았습니다.",
  );
  pushIssue(
    issues,
    metrics.confidenceEvidenceCount < minimums.confidenceEvidence,
    "confidence.strongestEvidence",
    `${pricing.family} 실제 출력은 최소 ${minimums.confidenceEvidence}개의 핵심 근거를 신뢰도 설명에 연결해야 합니다.`,
  );
  pushIssue(
    issues,
    metrics.linkageWarningCount === metrics.evidenceCount,
    "evidence.linkage",
    "모든 근거가 결론 방향·대상과 명시적으로 연결되지 않아 유료 판단 근거로 부족합니다.",
  );
  pushIssue(
    issues,
    metrics.linkageWarningCount > 0 && metrics.linkageWarningCount < metrics.evidenceCount,
    "evidence.linkage",
    `근거 ${metrics.linkageWarningCount}개는 결론 연결 문구가 약해 수동 검토가 필요합니다.`,
    "warning",
  );
  pushIssue(
    issues,
    metrics.ownershipFocusHitCount === 0,
    "productOwnership.focus",
    "상품 고유 분석 초점이 실제 결론·근거·타임라인에 드러나지 않습니다.",
  );
  pushIssue(
    issues,
    metrics.ownershipActionHitCount === 0,
    "productOwnership.action",
    "상품 고유 행동 책임이 실제 action에 드러나지 않습니다.",
  );

  if (specialization.kind === "topic") {
    const config = specialization.config;
    const depthContract = getPaidAnalysisPremiumDepthContract(config);
    const requiredEvidenceKeys = new Set(depthContract.evidenceFocus);
    const realizedRequiredEvidence = output.evidence.filter((item) =>
      requiredEvidenceKeys.has(item.evidenceKey),
    ).length;
    const minimumRequiredEvidence =
      pricing.family === "DEEP"
        ? Math.min(4, requiredEvidenceKeys.size)
        : Math.min(3, requiredEvidenceKeys.size);

    pushIssue(
      issues,
      realizedRequiredEvidence < minimumRequiredEvidence,
      "evidence",
      `상품 계약이 요구한 근거 축 중 최소 ${minimumRequiredEvidence}개가 실제 출력에 반영되어야 합니다.`,
    );

    if (config.decisionType === "decision") {
      pushIssue(
        issues,
        metrics.decisionCheckCount < 3,
        "decisionCheck",
        "의사결정형 상품은 실제 출력에 3~5개의 decisionCheck가 필요합니다.",
      );
    } else {
      pushIssue(
        issues,
        metrics.decisionCheckCount > 0,
        "decisionCheck",
        "탐색형 상품은 하나의 결정을 강요하는 decisionCheck를 만들면 안 됩니다.",
      );
    }

    if (pricing.family === "DEEP") {
      pushIssue(
        issues,
        metrics.evidenceCount !== 4,
        "evidence",
        "DEEP 실제 출력은 4개의 근거 축을 모두 사용해야 가격 단계 차이가 보존됩니다.",
      );
      pushIssue(
        issues,
        metrics.actionCount !== 3,
        "action",
        "DEEP 실제 출력은 3개의 독립 행동 책임을 제공해야 합니다.",
      );
      pushIssue(
        issues,
        metrics.ownershipFocusHitCount < 2,
        "productOwnership.focus",
        "DEEP 실제 출력은 상품 분석 초점 최소 2개를 직접 실현해야 합니다.",
      );
      pushIssue(
        issues,
        metrics.ownershipActionHitCount < 2,
        "productOwnership.action",
        "DEEP 실제 출력은 상품 행동 초점 최소 2개를 직접 실현해야 합니다.",
      );
    }
  } else {
    const strategy = getPeriodAnalysisStrategy(productId);
    if (!strategy) {
      pushIssue(
        issues,
        true,
        "periodAnalysis",
        "기간 상품 전략을 찾을 수 없습니다.",
      );
    } else {
      pushIssue(
        issues,
        !output.referencePeriod,
        "referencePeriod",
        "기간 상품 실제 출력에는 서버가 고정한 기준 기간이 필요합니다.",
      );
      pushIssue(
        issues,
        !output.periodAnalysis,
        "periodAnalysis",
        "기간 상품 실제 출력에는 구조화된 periodAnalysis가 필요합니다.",
      );

      if (output.periodAnalysis) {
        pushIssue(
          issues,
          output.periodAnalysis.productId !== strategy.productId,
          "periodAnalysis.productId",
          "기간 출력의 productId가 전략 계약과 다릅니다.",
        );
        pushIssue(
          issues,
          output.periodAnalysis.scale !== strategy.periodType,
          "periodAnalysis.scale",
          "기간 출력의 분석 스케일이 전략 계약과 다릅니다.",
        );
        pushIssue(
          issues,
          metrics.periodTimelineItemCount !== strategy.timelineSpec.labels.length,
          "periodAnalysis.timelineItems",
          `기간 출력은 전략 계약의 ${strategy.timelineSpec.labels.length}개 구간을 정확히 보존해야 합니다.`,
        );

        const labelsMatch =
          output.periodAnalysis.timelineItems.length ===
            strategy.timelineSpec.labels.length &&
          output.periodAnalysis.timelineItems.every(
            (item, index) => item.label === strategy.timelineSpec.labels[index],
          );
        pushIssue(
          issues,
          !labelsMatch,
          "periodAnalysis.timelineItems.label",
          "기간 출력의 구간 라벨 또는 순서가 전략 계약과 다릅니다.",
        );
      }

      if (pricing.family === "LONG_RANGE") {
        pushIssue(
          issues,
          metrics.evidenceCount !== 4,
          "evidence",
          "LONG_RANGE 실제 출력은 4개의 근거 축을 사용해야 합니다.",
        );
        pushIssue(
          issues,
          metrics.actionCount !== 3,
          "action",
          "LONG_RANGE 실제 출력은 3개의 독립 행동 책임을 제공해야 합니다.",
        );
        pushIssue(
          issues,
          metrics.periodKeyPointCount < 3,
          "periodAnalysis.keyPoints",
          "LONG_RANGE 실제 출력은 기간 전체 핵심을 최소 3개로 요약해야 합니다.",
        );
        pushIssue(
          issues,
          metrics.periodSegmentActionCount < Math.min(3, metrics.periodTimelineItemCount),
          "periodAnalysis.timelineItems.actions",
          "LONG_RANGE 실제 출력은 최소 3개 기간 구간에 실행 책임을 연결해야 합니다.",
        );
        pushIssue(
          issues,
          metrics.periodSegmentCautionCount < Math.min(3, metrics.periodTimelineItemCount),
          "periodAnalysis.timelineItems.cautions",
          "LONG_RANGE 실제 출력은 최소 3개 기간 구간에 주의 기준을 연결해야 합니다.",
        );
      }

      if (pricing.family === "SIGNATURE") {
        pushIssue(
          issues,
          strategy.timeGranularity !== "lifetime",
          "periodAnalysis.scale",
          "SIGNATURE는 생애 단위 전략이어야 합니다.",
        );
        pushIssue(
          issues,
          metrics.evidenceCount !== 4,
          "evidence",
          "SIGNATURE 실제 출력은 4개의 근거 축을 사용해야 합니다.",
        );
        pushIssue(
          issues,
          metrics.actionCount !== 3,
          "action",
          "SIGNATURE 실제 출력은 3개의 독립 행동 책임을 제공해야 합니다.",
        );
        pushIssue(
          issues,
          metrics.periodKeyPointCount < 4,
          "periodAnalysis.keyPoints",
          "SIGNATURE 실제 출력은 생애 전체 synthesis 핵심을 최소 4개로 제공해야 합니다.",
        );
        pushIssue(
          issues,
          metrics.periodSegmentActionCount !== metrics.periodTimelineItemCount,
          "periodAnalysis.timelineItems.actions",
          "SIGNATURE는 모든 생애 구간에 실행·검토 책임을 연결해야 합니다.",
        );
        pushIssue(
          issues,
          metrics.periodSegmentCautionCount !== metrics.periodTimelineItemCount,
          "periodAnalysis.timelineItems.cautions",
          "SIGNATURE는 모든 생애 구간에 주의·재검토 기준을 연결해야 합니다.",
        );
      }
    }
  }

  return {
    ok: !issues.some((issue) => issue.severity === "error"),
    productId,
    family: pricing.family,
    metrics,
    issues,
  };
}

export function auditPaidAnalysisV4ActualTierSample(
  samples: readonly PaidAnalysisV4ActualTierSample[],
): PaidAnalysisV4ActualTierSampleAudit {
  const results = samples.map((sample) =>
    auditPaidAnalysisV4ActualOutputTier(sample.productId, sample.output),
  );
  const issues: PaidAnalysisV4ActualTierIssue[] = [];
  const familyAverageDepthUnits: Partial<Record<PricingFamily, number>> = {};

  for (const family of ["CORE", "DEEP", "LONG_RANGE", "SIGNATURE"] as const) {
    const familyResults = results.filter((result) => result.family === family);
    if (familyResults.length === 0) continue;
    familyAverageDepthUnits[family] = Number(
      (
        familyResults.reduce(
          (sum, result) => sum + result.metrics.depthUnits,
          0,
        ) / familyResults.length
      ).toFixed(2),
    );
  }

  const coreDepth = familyAverageDepthUnits.CORE;
  const deepDepth = familyAverageDepthUnits.DEEP;
  const longRangeDepth = familyAverageDepthUnits.LONG_RANGE;
  const signatureDepth = familyAverageDepthUnits.SIGNATURE;

  pushIssue(
    issues,
    coreDepth !== undefined && deepDepth !== undefined && deepDepth <= coreDepth,
    "familyDepth.DEEP",
    `DEEP 평균 실제 책임 깊이(${deepDepth})가 CORE(${coreDepth})보다 높지 않습니다.`,
  );
  pushIssue(
    issues,
    deepDepth !== undefined &&
      longRangeDepth !== undefined &&
      longRangeDepth <= deepDepth,
    "familyDepth.LONG_RANGE",
    `LONG_RANGE 평균 실제 책임 깊이(${longRangeDepth})가 DEEP(${deepDepth})보다 높지 않습니다.`,
  );
  pushIssue(
    issues,
    longRangeDepth !== undefined &&
      signatureDepth !== undefined &&
      signatureDepth < longRangeDepth,
    "familyDepth.SIGNATURE",
    `SIGNATURE 실제 책임 깊이(${signatureDepth})가 LONG_RANGE 평균(${longRangeDepth})보다 낮습니다.`,
  );

  for (const result of results) {
    for (const issue of result.issues.filter((item) => item.severity === "error")) {
      issues.push({
        ...issue,
        field: `${result.productId}:${issue.field}`,
      });
    }
  }

  return {
    ok: issues.length === 0,
    results,
    familyAverageDepthUnits,
    issues,
  };
}
