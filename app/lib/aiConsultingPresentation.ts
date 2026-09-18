import { formatAnalysisEditionLabel } from "./analysisEditionLabel";
import { getPremiumProduct } from "./premiumProductRegistry";
import { getPremiumProductDisplayTitle } from "./premiumPresentation";
import {
  COMPATIBILITY_BUSINESS_PRODUCT_ID,
  COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID,
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID,
  COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID,
  COMPATIBILITY_FRIEND_PRODUCT_ID,
  COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  COMPATIBILITY_WORKPLACE_PRODUCT_ID,
  getSpecialAnalysisProduct,
} from "./specialAnalysisProducts";

export type AiConsultingPresentation = {
  productTitle: string;
  editionLabel: string;
  scopeLabel: string;
  suggestedQuestions: readonly string[];
};

const DEFAULT_SUGGESTED_QUESTIONS = [
  "이 리포트에서 지금 가장 먼저 행동으로 옮길 부분은 뭐야?",
  "주의 신호가 실제 생활에서는 어떤 모습으로 나타날 수 있어?",
  "다음에 다시 확인해야 할 기준을 3가지로 정리해줘.",
] as const;

const PERIOD_SUGGESTED_QUESTIONS = [
  "이 기간에서 가장 먼저 확인해야 할 변화 신호는 뭐야?",
  "기회와 주의 흐름을 실제 일정에 어떻게 적용하면 좋아?",
  "다음 점검 시점에는 무엇을 비교해서 보면 돼?",
] as const;

const COMPATIBILITY_QUESTIONS: Readonly<Record<string, readonly string[]>> = {
  [COMPATIBILITY_ROMANTIC_PRODUCT_ID]: [
    "우리 관계에서 반복되기 쉬운 갈등 패턴은 뭐야?",
    "서로 대화할 때 오해를 줄이려면 어떤 순서가 좋아?",
    "지금 관계에서 내가 먼저 조정해볼 수 있는 행동은 뭐야?",
  ],
  [COMPATIBILITY_WORKPLACE_PRODUCT_ID]: [
    "업무 방식이 부딪히기 쉬운 지점은 어디야?",
    "역할과 책임을 어떻게 나누면 갈등을 줄일 수 있어?",
    "피드백이나 의사결정을 맞출 때 무엇을 먼저 조정하면 좋아?",
  ],
  [COMPATIBILITY_FRIEND_PRODUCT_ID]: [
    "우리 사이에서 오해가 반복되기 쉬운 지점은 뭐야?",
    "연락과 거리감을 서로 부담 없이 맞추려면 어떻게 하면 좋아?",
    "서운함이 생겼을 때 관계를 회복하는 방법은 뭐야?",
  ],
  [COMPATIBILITY_BUSINESS_PRODUCT_ID]: [
    "동업에서 역할과 책임이 충돌하기 쉬운 지점은 뭐야?",
    "의사결정 속도와 권한을 어떻게 나누는 게 좋아?",
    "돈과 성과 기준이 다를 때 어떤 합의를 먼저 확인해야 해?",
  ],
  [COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID]: [
    "부모와 자녀 사이 기대와 독립의 균형을 어떻게 잡는 게 좋아?",
    "대화가 막힐 때 어떤 방식으로 먼저 풀어가면 좋아?",
    "서로의 경계를 지키면서 관계를 회복하려면 무엇부터 해야 해?",
  ],
  [COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID]: [
    "형제·자매 사이 비교와 경쟁이 심해질 때 어떻게 조정하면 좋아?",
    "오래 굳어진 역할 때문에 생기는 갈등을 어떻게 풀 수 있어?",
    "서로에게 부담되지 않는 경계를 어떻게 정하면 좋아?",
  ],
  [COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID]: [
    "가족 사이 연락과 도움의 경계를 어떻게 정하는 게 좋아?",
    "역할과 기대가 어긋날 때 대화를 어떻게 시작하면 좋아?",
    "관계를 무리 없이 유지하려면 내가 먼저 조정할 부분은 뭐야?",
  ],
};

export function getAiConsultingPresentation(
  productId: string,
  edition: string,
): AiConsultingPresentation {
  const special = getSpecialAnalysisProduct(productId);
  if (special) {
    const pairEdition = edition.match(/^PAIR_YEAR:(\d{4}):[a-f0-9]{16}$/);
    return {
      productTitle: special.title,
      editionLabel: pairEdition
        ? `${pairEdition[1]}년 ${special.shortTitle ?? "궁합"}`
        : formatAnalysisEditionLabel(edition),
      scopeLabel: "이 궁합 리포트에 저장된 관계 해석과 구매 연도 범위 안에서 답변합니다.",
      suggestedQuestions: COMPATIBILITY_QUESTIONS[productId] ?? DEFAULT_SUGGESTED_QUESTIONS,
    };
  }

  const premium = getPremiumProduct(productId);
  if (premium) {
    return {
      productTitle: getPremiumProductDisplayTitle(premium.id, premium.title),
      editionLabel: formatAnalysisEditionLabel(edition),
      scopeLabel: "이 구매 리포트의 계산 결과와 해석 범위 안에서 다음 질문을 이어갑니다.",
      suggestedQuestions: premium.kind === "PERIOD"
        ? PERIOD_SUGGESTED_QUESTIONS
        : DEFAULT_SUGGESTED_QUESTIONS,
    };
  }

  return {
    productTitle: "구매한 분석",
    editionLabel: formatAnalysisEditionLabel(edition),
    scopeLabel: "구매한 리포트의 범위 안에서 다음 질문을 이어갑니다.",
    suggestedQuestions: DEFAULT_SUGGESTED_QUESTIONS,
  };
}
