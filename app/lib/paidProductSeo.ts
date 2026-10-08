import { getPaidAnalysisTopicConfig } from "./paidAnalysisTopicConfig";
import { getPremiumProductDisplayTitle } from "./premiumPresentation";
import type { PremiumProductDefinition } from "./premiumProductRegistry";

/**
 * Public, non-personalized search guidance only.
 * The paid product registry and the generation/purchase contracts remain
 * the sole sources of truth for each product's actual scope.
 */
const SEARCH_INTENTS: Readonly<Record<string, { term: string; question: string }>> = {
  "career": { term: "직업운", question: "지금 내 일에서 유지할 부분과 조정할 부분은 무엇일까요?" },
  "career-job-change": { term: "이직운", question: "지금 이직을 준비할지, 현재 자리에 남을지 어떤 기준으로 판단할까요?" },
  "career-job-fit": { term: "직업 적성", question: "어떤 업무 방식과 환경에서 내 강점이 잘 발휘될까요?" },
  "career-promotion-readiness": { term: "승진운", question: "더 큰 역할을 맡기 전에 어떤 준비와 근거를 확인해야 할까요?" },
  "career-workplace-adaptation": { term: "직장운", question: "현재 직장에서 적응을 어렵게 하는 조건은 무엇일까요?" },
  "career-freelance-transition": { term: "프리랜서 전환", question: "독립적으로 일하기 전에 어떤 준비를 확인해야 할까요?" },
  "wealth": { term: "재물운", question: "수입과 지출, 책임과 비용을 어떤 순서로 점검하면 좋을까요?" },
  "money-wealth-accumulation": { term: "돈복·재물운", question: "돈을 모으기 위해 어떤 반복 패턴과 조건을 살펴봐야 할까요?" },
  "money-income-stability": { term: "수입운", question: "지금 수입이 안정적으로 이어지려면 무엇을 확인해야 할까요?" },
  "money-leak-risk": { term: "지출 관리", question: "반복해서 돈이 빠져나가는 상황에서 어떤 신호를 살펴봐야 할까요?" },
  "money-debt-repayment": { term: "부채 상환", question: "빚을 갚는 순서와 감당 가능한 부담을 어떻게 점검할까요?" },
  "relationship": { term: "연애운", question: "관계에서 반복되는 내 반응과 거리 조절을 어떻게 이해할까요?" },
  "relationship-new-connection": { term: "새 인연·연애운", question: "새로운 인연 앞에서 어떤 관계 패턴을 살펴봐야 할까요?" },
  "relationship-marriage": { term: "결혼운", question: "결혼을 고민할 때 어떤 관계와 생활 조건을 확인해야 할까요?" },
  "relationship-conflict": { term: "연애 갈등", question: "반복되는 갈등을 줄이려면 어떤 반응과 회복 방식을 살펴봐야 할까요?" },
  "relationship-reunion": { term: "재회운", question: "다시 만나는 관계에서 무엇을 먼저 점검해야 할까요?" },
  "health-energy-recovery": { term: "건강운", question: "일상에서 부담과 회복의 균형을 어떻게 살펴볼까요?" },
  "study-exam-preparation": { term: "시험운", question: "시험을 앞두고 준비 과정에서 무엇을 우선 확인해야 할까요?" },
  "business-startup-readiness": { term: "창업운", question: "창업을 시작하기 전에 어떤 준비 조건을 검토해야 할까요?" },
  "monthly-current": { term: "이번 달 운세", question: "이번 달에는 어떤 생활 영역부터 살펴보면 좋을까요?" },
  "monthly-next": { term: "다음 달 운세", question: "다음 달을 준비하면서 무엇을 미리 점검해야 할까요?" },
  "yearly-current": { term: "올해 운세", question: "올해의 전체 흐름에서 무엇을 우선하면 좋을까요?" },
  "annual-next": { term: "내년 운세", question: "내년을 준비하며 어떤 변화를 미리 살펴봐야 할까요?" },
  "annual-3years": { term: "3년 운세", question: "향후 3년의 흐름은 어떤 차이를 보일까요?" },
  "daeun-current": { term: "대운·10년 운세", question: "현재 장기 흐름은 어떤 국면에 있을까요?" },
  "lifetime-overview": { term: "평생운", question: "삶에서 반복되는 강점과 전환의 패턴을 어떻게 이해할까요?" },
};

export type PaidProductSeoGuide = {
  searchTitle: string;
  headline: string;
  question: string;
  focus: readonly string[];
  distinction: string;
  description: string;
};

export function getPaidProductSeoGuide(product: PremiumProductDefinition): PaidProductSeoGuide {
  const displayTitle = getPremiumProductDisplayTitle(product.id, product.title);
  const intent = SEARCH_INTENTS[product.id];
  const topic = product.kind === "TOPIC" ? getPaidAnalysisTopicConfig(product.id) : undefined;
  const periodDecision = product.kind === "PERIOD" ? product.purchaseDecision : undefined;
  const question = intent?.question ??
    (topic?.userQuestion ?? periodDecision?.primaryQuestion ?? displayTitle);
  const focus = topic?.analysisFocus.slice(0, 3) ??
    periodDecision?.analysisScope.slice(0, 3) ??
    product.details?.slice(0, 3) ?? [];
  const distinction = topic?.purchaseDecision.distinction ??
    periodDecision?.distinction ?? product.description;

  return {
    searchTitle: intent?.term && !displayTitle.includes(intent.term)
      ? `${intent.term} · ${displayTitle}`
      : displayTitle,
    headline: displayTitle,
    question,
    focus,
    distinction,
    description: product.description,
  };
}
