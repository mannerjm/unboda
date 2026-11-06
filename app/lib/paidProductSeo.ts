import { getPaidAnalysisTopicConfig } from "./paidAnalysisTopicConfig";
import { getPremiumProductDisplayTitle } from "./premiumPresentation";
import type { PremiumProductDefinition } from "./premiumProductRegistry";
import { getPublishedMagazineArticles } from "./magazine";

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

type PublicReadingExample = Readonly<{
  situation: string;
  reading: string;
  nextStep: string;
}>;

// Editorial examples explain how to use the existing product scope. They are
// fictional reading exercises, never a customer's result or a new deliverable.
const PUBLIC_READING_EXAMPLES: Readonly<Record<string, PublicReadingExample>> = {
  career: {
    situation: "회의와 실무가 겹쳐 늘 바쁘지만, 어떤 업무부터 줄일지 모르겠어요.",
    reading: "직업운의 전체 흐름을 읽을 때는 맡은 책임, 힘이 드는 업무 조합, 우선순위가 충돌하는 조건을 나누어 봅니다. 이 안내만으로 적합한 직업이나 퇴사 여부를 정하지는 않습니다.",
    nextStep: "일주일 동안 맡은 일과 소요 시간, 지친 순간을 기록한 뒤 유지할 일·조정할 일·먼저 처리할 일을 한 가지씩 골라보세요. 이직 자체가 질문이라면 이직 판단 분석의 범위를 확인하세요.",
  },
  "career-job-change": {
    situation: "지금 직장이 힘든데, 바로 옮길지 준비하며 기다릴지 고민돼요.",
    reading: "남기·준비하기·이동하기의 조건을 구별해 읽습니다. 일시적인 불만과 지속되는 문제를 나누고, 옮긴 뒤 역할과 환경에 적응할 준비가 있는지 확인하는 데 초점을 둡니다.",
    nextStep: "현재 업무에서 바꿀 수 있는 조건과 새 자리에서 확인할 역할·보상·근무 조건을 따로 적어 비교하세요. 분석의 시기 설명을 합격이나 이직 날짜의 보장으로 읽지 마세요.",
  },
  "career-job-fit": {
    situation: "혼자 집중할 때와 사람들과 조율할 때 중 어느 쪽이 나에게 맞는지 궁금해요.",
    reading: "직업 이름 하나를 정답으로 고르기보다, 강점이 드러나는 역할과 일하는 방식, 조직의 규칙과 자율성 같은 환경 조건을 구분해 읽습니다.",
    nextStep: "최근 잘 마친 업무 두 가지에서 집중 시간·협업 방식·도움이 된 환경을 비교하세요. 풀이와 실제 경험이 맞는 부분과 다른 부분을 표시하면 다음 업무를 고를 질문이 구체화됩니다.",
  },
  wealth: {
    situation: "수입은 있는데 여러 지출과 책임이 겹쳐 돈의 흐름이 잘 보이지 않아요.",
    reading: "재물운의 전체 안내에서는 수입·지출·책임·계약이 어떻게 연결되는지 살펴봅니다. 특정 투자 종목이나 수익을 예측하는 설명으로 사용하지 않습니다.",
    nextStep: "이번 달 수입, 정기 지출, 공동 부담, 계약 의무를 한 장에 나누어 적고 먼저 확인할 항목을 고르세요. 실제 금액과 계약 조건은 본인이 가진 자료로 확인해야 합니다.",
  },
  "money-income-stability": {
    situation: "월별 수입 차이가 커서 고정 지출을 늘려도 될지 걱정돼요.",
    reading: "수입원의 의존도, 지급 지연, 반복 수요와 고정비 부담을 구별해 읽습니다. 수입이 얼마까지 늘어난다는 예측보다 지속성을 점검하는 질문에 집중합니다.",
    nextStep: "최근 수입의 발생일·입금일과 매달 꼭 나가는 비용을 나란히 적어보세요. 분석이 제시한 관찰 신호를 실제 기록과 대조하고 새 고정비를 약속하기 전에 감당 범위를 확인하세요.",
  },
  "money-leak-risk": {
    situation: "작은 결제와 공동 비용이 쌓여 예상보다 돈이 많이 빠져나가요.",
    reading: "지출·계약·공동 부담 가운데 통제하기 어려워지는 조건과 충동적인 판단 신호를 살펴봅니다. 손실 금액이나 발생 날짜를 맞히는 방식으로 읽지 않습니다.",
    nextStep: "결제 내역에서 자동 결제, 해지 조건이 있는 계약, 공동 부담을 구분하고 확인하지 못한 조건부터 표시하세요. 손실을 만회하려는 추가 지출은 필요성과 비용을 다시 검토하세요.",
  },
  relationship: {
    situation: "상대가 달라져도 내가 먼저 맞추다가 지치는 일이 반복돼요.",
    reading: "여러 관계에서 반복되는 거리 조절·반응·정서적 부담과 상호성을 살펴봅니다. 특정 상대의 속마음이나 두 사람의 궁합을 대신 확정하는 분석은 아닙니다.",
    nextStep: "최근 관계 두세 곳에서 내가 맡은 부탁, 거절하기 어려웠던 순간, 상대의 반응을 따로 적어보세요. 다음 대화에서는 조정하고 싶은 경계를 한 문장으로 정리해볼 수 있습니다.",
  },
  "relationship-conflict": {
    situation: "같은 주제로 다투고 화해하지만 다음에는 또 반복돼요.",
    reading: "갈등을 촉발한 상황, 충돌을 키운 반응, 대화를 다시 시작할 신호를 나누어 읽습니다. 상대의 성격을 단정하거나 관계 유지 여부를 숫자로 결정하지 않습니다.",
    nextStep: "최근 다툼 한 번을 상황·내 반응·상대 반응·회복 행동 순서로 적어보세요. 다시 대화할 시간과 서로 지킬 행동을 하나씩 정하고 이후 실제로 달라졌는지 확인하세요.",
  },
};

export type PaidProductSeoGuide = {
  searchTitle: string;
  headline: string;
  question: string;
  focus: readonly string[];
  distinction: string;
  description: string;
  example?: PublicReadingExample;
  relatedArticles: readonly { href: string; title: string }[];
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
    example: PUBLIC_READING_EXAMPLES[product.id],
    relatedArticles: getPublishedMagazineArticles()
      .filter(article => article.slug === "saju-birth-time-unknown" ||
        (product.category === "money" && article.slug === "money-fortune-budget-review") ||
        (["relationship", "social"].includes(product.category) && article.slug === "compatibility-conversation-first"))
      .map(article => ({ href: `/blog/${article.slug}`, title: article.title })),
  };
}
