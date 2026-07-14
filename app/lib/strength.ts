import {
  stemElementMap,
  type Element,
  type ElementAnalysis,
} from "./elements";

export type StrengthLevel =
  | "매우 신강"
  | "신강"
  | "중화"
  | "신약"
  | "매우 신약";

export type StrengthAnalysis = {
  dayElement: Element | "";
  resourceElement: Element | "";
  supportScore: number;
  opposingScore: number;
  level: StrengthLevel;
  summary: string;
};

/**
 * 일간 오행을 생하는 인성 오행
 *
 * 목은 수의 생을 받고,
 * 화는 목의 생을 받으며,
 * 토는 화의 생을 받고,
 * 금은 토의 생을 받으며,
 * 수는 금의 생을 받는다.
 */
const resourceElementMap: Record<Element, Element> = {
  목: "수",
  화: "목",
  토: "화",
  금: "토",
  수: "금",
};

function getStrengthLevel(
  supportScore: number
): StrengthLevel {
  if (supportScore >= 65) {
    return "매우 신강";
  }

  if (supportScore >= 55) {
    return "신강";
  }

  if (supportScore >= 45) {
    return "중화";
  }

  if (supportScore >= 35) {
    return "신약";
  }

  return "매우 신약";
}

export function calculateStrength(
  dayStem: string,
  elementAnalysis: ElementAnalysis
): StrengthAnalysis {
  const dayElement = stemElementMap[dayStem];

  if (!dayElement) {
    return {
      dayElement: "",
      resourceElement: "",
      supportScore: 0,
      opposingScore: 0,
      level: "중화",
      summary: "일간 오행을 확인할 수 없습니다.",
    };
  }

  const resourceElement =
    resourceElementMap[dayElement];

  const dayElementScore =
    elementAnalysis.percentages[dayElement];

  const resourceScore =
    elementAnalysis.percentages[resourceElement];

  /*
   * 일간과 같은 오행(비겁) +
   * 일간을 생하는 오행(인성)을
   * 일간을 돕는 힘으로 계산한다.
   */
  const supportScore = Number(
    (dayElementScore + resourceScore).toFixed(1)
  );

  const opposingScore = Number(
    Math.max(0, 100 - supportScore).toFixed(1)
  );

  const level = getStrengthLevel(supportScore);

  return {
    dayElement,
    resourceElement,
    supportScore,
    opposingScore,
    level,
    summary:
      `일간은 ${dayElement}이며, ` +
      `${dayElement}와 이를 생하는 ${resourceElement}의 ` +
      `합산 비율은 ${supportScore}%입니다. ` +
      `현재 v1 기준으로 ${level} 범주입니다.`,
  };
}