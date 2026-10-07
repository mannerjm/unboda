import {
  getAnalysisEditionPolicy,
  type AnalysisEditionPolicy,
} from "./analysisEditionPolicy";
import { getPeriodAnalysisStrategy } from "./analysisPeriodStrategy";
import {
  getLaunchProductIds,
  getPaidAnalysisTopicConfig,
} from "./paidAnalysisTopicConfig";
import {
  getProductPricing,
  type PricingFamily,
} from "./productPricing";
import type { PremiumProductDefinition } from "./premiumProductRegistry";

export type PaidAnalysisV4PreviewCard = {
  step: string;
  eyebrow: string;
  title: string;
  description: string;
};

export type PaidAnalysisV4PreviewValueNote = {
  badge: string;
  title: string;
  description: string;
};

export type PaidAnalysisV4PreviewModel = {
  kind: "topic" | "period";
  eyebrow: string;
  question: string;
  tier: PaidAnalysisV4PreviewValueNote & { family: PricingFamily };
  timeValue: PaidAnalysisV4PreviewValueNote;
  cards: readonly PaidAnalysisV4PreviewCard[];
  topicLabel: string;
  topics: readonly string[];
  footer: string;
};

export function normalizePaidAnalysisPreviewSentence(value: string): string {
  return value
    .trim()
    .replace(/노력কে/g, "노력을")
    .replace(/[?？.。]+$/, "");
}

const TIER_COPY: Readonly<Record<PricingFamily, PaidAnalysisV4PreviewValueNote>> = {
  CORE: {
    badge: "CORE",
    title: "핵심 판단에 필요한 구조를 끝까지 연결",
    description:
      "상품의 핵심 질문을 결론·원인·근거·현실 신호·행동 기준으로 이어서 실제 판단에 쓰기 쉽게 구성합니다.",
  },
  DEEP: {
    badge: "DEEP",
    title: "더 넓은 범위와 서로 다른 근거 축을 교차 확인",
    description:
      "핵심 통찰을 서로 다른 계산 근거와 연결하고, 인접한 다른 주제와의 경계까지 분리해 더 깊게 검토합니다.",
  },
  LONG_RANGE: {
    badge: "LONG RANGE",
    title: "긴 기간을 여러 전략 구간으로 나누어 비교",
    description:
      "연간·다년·대운 범위를 여러 변화 구간과 전략 책임으로 나누고, 다음 검토 시점까지 이어지는 기준을 만듭니다.",
  },
  SIGNATURE: {
    badge: "SIGNATURE",
    title: "생애 구간을 가로질러 반복 구조와 전환을 종합",
    description:
      "한 시점의 운세가 아니라 생애 전반의 반복 구조와 전환 구간을 함께 비교해 장기적인 판단 기준으로 정리합니다.",
  },
};

function buildTierValue(productId: string): PaidAnalysisV4PreviewModel["tier"] {
  const pricing = getProductPricing(productId);
  return {
    family: pricing.family,
    ...TIER_COPY[pricing.family],
  };
}

function buildTopicTimeValue(policy: AnalysisEditionPolicy | null): PaidAnalysisV4PreviewValueNote {
  if (policy === "MONTHLY") {
    return {
      badge: "월간 에디션",
      title: "구매한 달의 실제 월 흐름을 계산에 반영",
      description:
        "기준 월의 절기 월 흐름과 원국 관계를 계산 근거로 포함하고, 전문용어 대신 이번 달에 확인할 현실 조건·변화 신호·판단 기준으로 번역합니다.",
    };
  }

  if (policy === "YEARLY") {
    return {
      badge: "연간 에디션",
      title: "구매 연도의 실제 세운 흐름을 반영",
      description:
        "해당 연도의 세운을 실제 계산 근거에 포함하고, 그 해의 역할·자원·관계·생활 조건이 이 상품의 질문에 어떤 차이를 만드는지 설명합니다.",
    };
  }

  return {
    badge: "장기 기준",
    title: "특정 월·연도보다 반복되는 구조와 선택 기준에 집중",
    description:
      "평생형 주제는 억지로 현재 월이나 연도를 붙이지 않고, 반복되는 성향·조건·관찰 신호와 장기적인 재검토 기준을 중심으로 구성합니다.",
  };
}

function buildPeriodTimeValue(
  policy: AnalysisEditionPolicy | null,
  timeGranularity: string,
): PaidAnalysisV4PreviewValueNote {
  if (policy === "TARGET_MONTH" || timeGranularity === "month") {
    return {
      badge: "월 기준 기간형",
      title: "결제 시점에 고정된 실제 기준 월을 따라 분석",
      description:
        "이번 달·다음 달처럼 선택한 기준 월을 고정하고, 월 안의 변화 구간과 실행·재검토 기준을 기간 전용 구조로 보여줍니다.",
    };
  }

  if (policy === "TARGET_YEAR" || timeGranularity === "year") {
    return {
      badge: "연 기준 기간형",
      title: "결제 시점에 고정된 실제 기준 연도를 따라 분석",
      description:
        "올해·내년의 연도 흐름을 고정해 연간 압력·자원·우선순위 변화와 다음 검토 기준을 기간 전용 구조로 나눕니다.",
    };
  }

  if (policy === "ROLLING_MULTIYEAR" || timeGranularity === "multi-year") {
    return {
      badge: "다년 기간형",
      title: "연속된 여러 해의 차이와 전환 순서를 비교",
      description:
        "3년처럼 이어지는 기간을 연도별 역할과 변화 구간으로 나누고, 앞선 해의 조건이 다음 해의 준비와 선택에 어떻게 이어지는지 비교합니다.",
    };
  }

  if (policy === "DAEUN" || timeGranularity === "daeun") {
    return {
      badge: "대운 기간형",
      title: "현재 대운 구간의 장기 역할과 전환을 분석",
      description:
        "현재 대운의 큰 조건을 여러 전략 구간으로 나누어, 유지할 구조·바꿀 조건·다음 전환 전에 준비할 기준을 정리합니다.",
    };
  }

  return {
    badge: "생애 종합형",
    title: "생애 전체의 반복 구조와 전환 구간을 종합",
    description:
      "특정 한 해의 좋고 나쁨보다 생애 구간을 가로지르는 반복 패턴과 전환 조건을 비교해 장기 재검토 기준으로 정리합니다.",
  };
}

function buildTopicPreview(product: PremiumProductDefinition): PaidAnalysisV4PreviewModel | null {
  const config = getPaidAnalysisTopicConfig(product.id);
  if (!config) return null;

  const pricing = getProductPricing(product.id);
  const policy = getAnalysisEditionPolicy(product.id);
  const analysisFocus = config.analysisFocus.filter(Boolean);
  const firstInsight = normalizePaidAnalysisPreviewSentence(
    config.requiredInsights[0]?.prompt ?? analysisFocus[0] ?? product.description,
  );
  const secondInsight = normalizePaidAnalysisPreviewSentence(
    config.requiredInsights[1]?.prompt ?? analysisFocus[1] ?? firstInsight,
  );
  const firstAction =
    config.actionFocus[0] ?? "현재 상황에서 먼저 실행할 행동과 다시 점검할 기준";
  const scopeItems =
    pricing.family === "DEEP"
      ? config.purchaseDecision.whatItAnalyzes.slice(0, 5)
      : analysisFocus.slice(0, 4);

  return {
    kind: "topic",
    eyebrow: "현재 V4 결과 구조에 맞춘 리포트 구성",
    question: normalizePaidAnalysisPreviewSentence(config.userQuestion),
    tier: buildTierValue(product.id),
    timeValue: buildTopicTimeValue(policy),
    cards: [
      {
        step: "01",
        eyebrow: "결론 먼저",
        title: "핵심 결론과 지금 바로 할 것",
        description: `“${normalizePaidAnalysisPreviewSentence(config.userQuestion)}”라는 질문에 먼저 방향을 제시하고, 바로 실행할 첫 행동까지 함께 정리합니다.`,
      },
      {
        step: "02",
        eyebrow: "문제·원인",
        title: "지금 중요한 문제와 왜 이런 판단이 나왔는지",
        description: `${firstInsight} ${secondInsight}`,
      },
      {
        step: "03",
        eyebrow: "판단 근거",
        title: "쉬운 설명과 전문 계산 근거를 분리",
        description:
          "고객 본문은 현실적인 말로 설명하고, 판단을 뒷받침한 전문 계산 내용은 필요할 때만 ‘계산 근거 펼쳐보기’에서 확인할 수 있게 구성합니다.",
      },
      {
        step: "04",
        eyebrow: "현재 흐름",
        title: "기회·주의와 앞으로 확인할 변화 신호",
        description:
          analysisFocus.slice(0, 2).join(" · ") ||
          "현재 활용할 수 있는 기회와 주의할 조건을 나누고, 판단이 달라질 현실 신호를 함께 봅니다.",
      },
      {
        step: "05",
        eyebrow: "행동 가이드",
        title:
          config.decisionType === "decision"
            ? "실행·피할 행동과 결정 전 확인"
            : "실행·피할 행동과 재검토 기준",
        description: `${firstAction} 실제 결과에서는 해야 할 행동과 피해야 할 행동을 나누고, ${config.decisionType === "decision" ? "결정 전 확인 질문까지" : "다시 판단할 조건까지"} 연결합니다.`,
      },
      {
        step: "06",
        eyebrow: "마지막 확인",
        title: "이 분석에서 참고할 범위와 한계",
        description:
          "비교적 분명하게 볼 수 있는 부분, 현실에서 추가로 확인해야 할 부분, 이 분석만으로 정할 수 없는 것을 나누어 보여드립니다.",
      },
    ],
    topicLabel:
      pricing.family === "DEEP"
        ? "이 DEEP 상품이 실제로 깊게 보는 범위"
        : "이 상품의 실제 생성 주제",
    topics: scopeItems,
    footer:
      config.decisionType === "decision"
        ? "실제 V4 결과는 결론만 밀어붙이지 않고, 판단 근거·현실 조건·결정 체크·행동 완료 기준까지 연결합니다."
        : "실제 V4 결과는 한 가지 결론으로 몰아가지 않고, 반복 구조·현재 신호·행동 기준·재검토 조건을 함께 정리합니다.",
  };
}

function buildPeriodPreview(product: PremiumProductDefinition): PaidAnalysisV4PreviewModel | null {
  const strategy = getPeriodAnalysisStrategy(product.id);
  if (!strategy) return null;

  const policy = getAnalysisEditionPolicy(product.id);
  const responsibilities = strategy.requiredInsights.map((insight) => insight.title);
  const timelineLabels = strategy.timelineSpec.labels;
  const firstResponsibility = strategy.requiredInsights[0];

  return {
    kind: "period",
    eyebrow: "현재 V4 기간형 결과 구조에 맞춘 리포트 구성",
    question: normalizePaidAnalysisPreviewSentence(strategy.coreQuestion),
    tier: buildTierValue(product.id),
    timeValue: buildPeriodTimeValue(policy, strategy.timeGranularity),
    cards: [
      {
        step: "01",
        eyebrow: "결론 먼저",
        title: "기간 전체 핵심 흐름과 우선 판단",
        description: `${normalizePaidAnalysisPreviewSentence(strategy.coreQuestion)}를 기준으로 이 기간을 관통하는 결론과 먼저 볼 기준을 정리합니다.`,
      },
      {
        step: "02",
        eyebrow: "기간 고유 원인",
        title: firstResponsibility?.title ?? "이 기간에서 가장 먼저 볼 구조",
        description:
          firstResponsibility?.mechanismResponsibility ??
          strategy.focus[0] ??
          product.description,
      },
      {
        step: "03",
        eyebrow: "판단 근거",
        title: "기간 계산 근거와 현실적인 의미를 연결",
        description:
          "기간에 맞는 계산 근거는 전문 근거로 분리하고, 고객 본문에서는 실제 생활·역할·자원·관계에서 확인할 조건으로 번역합니다.",
      },
      {
        step: "04",
        eyebrow: "변화 구간",
        title: "기간별 기회·주의와 변화 신호",
        description: timelineLabels.join(" · "),
      },
      {
        step: "05",
        eyebrow: "행동·재검토",
        title: "구간별 실행과 다음 검토 기준",
        description: strategy.reviewArtifact,
      },
      {
        step: "06",
        eyebrow: "마지막 확인",
        title: "이 기간 분석에서 참고할 범위와 한계",
        description:
          "기간 흐름에서 비교적 분명한 부분과 현실 조건에 따라 달라질 부분을 나누고, 확정할 수 없는 결과는 따로 구분합니다.",
      },
    ],
    topicLabel: "이 기간 상품의 실제 생성 주제",
    topics: responsibilities.slice(0, 4),
    footer: `실제 V4 결과는 ${timelineLabels.join(" · ")} 흐름을 기준으로 나누며, 결제 시점에 고정된 기준 기간에 맞춰 판단 근거와 재검토 기준을 생성합니다.`,
  };
}

export function buildPaidAnalysisV4PreviewModel(
  product: PremiumProductDefinition,
): PaidAnalysisV4PreviewModel | null {
  if (!getLaunchProductIds().includes(product.id)) return null;

  return product.kind === "PERIOD"
    ? buildPeriodPreview(product)
    : buildTopicPreview(product);
}
