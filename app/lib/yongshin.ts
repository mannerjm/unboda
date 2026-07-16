import type { calculateStrength } from "./strength";
import type { calculateWeightedElements } from "./elements";

type StrengthResult = ReturnType<typeof calculateStrength>;
type ElementAnalysisResult = ReturnType<typeof calculateWeightedElements>;

type FiveElement = "목" | "화" | "토" | "금" | "수";

export type YongshinResult = {
  primary: FiveElement;
  secondary: FiveElement[];
  reason: string;
};

const stemToElement: Record<string, FiveElement> = {
  갑: "목",
  을: "목",
  병: "화",
  정: "화",
  무: "토",
  기: "토",
  경: "금",
  신: "금",
  임: "수",
  계: "수",

  甲: "목",
  乙: "목",
  丙: "화",
  丁: "화",
  戊: "토",
  己: "토",
  庚: "금",
  辛: "금",
  壬: "수",
  癸: "수",
};

const generates: Record<FiveElement, FiveElement> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

const controls: Record<FiveElement, FiveElement> = {
  목: "토",
  화: "금",
  토: "수",
  금: "목",
  수: "화",
};

function findGeneratingElement(target: FiveElement): FiveElement {
  const entry = Object.entries(generates).find(
    ([, generated]) => generated === target
  );

  return (entry?.[0] as FiveElement) ?? target;
}

function findControllingElement(target: FiveElement): FiveElement {
  const entry = Object.entries(controls).find(
    ([, controlled]) => controlled === target
  );

  return (entry?.[0] as FiveElement) ?? target;
}

export function analyzeYongshin(
  dayStem: string,
  strength: StrengthResult,
  elements: ElementAnalysisResult
): YongshinResult {
  const dayElement = stemToElement[dayStem];

  if (!dayElement) {
    throw new Error(`일간 오행을 찾을 수 없습니다: ${dayStem}`);
  }

  const percentages = elements.percentages;

  const level = strength.level;

  const isWeak = level.includes("신약");
  const isStrong = level.includes("신강");

  let candidates: FiveElement[];

  if (isWeak) {
    // 신약: 나를 생해주는 기운 → 나와 같은 기운 순으로 우선
    const resourceElement = findGeneratingElement(dayElement);

    candidates = [
      resourceElement,
      dayElement,
    ];
  } else if (isStrong) {
    // 신강: 내 기운을 빼주는 기운 → 내가 극하는 기운 → 나를 극하는 기운
    const outputElement = generates[dayElement];
    const wealthElement = controls[dayElement];
    const officerElement = findControllingElement(dayElement);

    candidates = [
      outputElement,
      wealthElement,
      officerElement,
    ];
  } else {
    // 중화에 가까우면 실제 비율이 부족한 오행을 우선
    candidates = (
      Object.entries(percentages) as [FiveElement, number][]
    )
      .sort(([, a], [, b]) => a - b)
      .map(([element]) => element);
  }

  // 같은 후보가 중복될 가능성 제거
  const uniqueCandidates = [...new Set(candidates)];

  // 후보들 중 실제 비율이 더 낮은 오행을 우선
  const rankedCandidates = uniqueCandidates.sort(
    (a, b) => percentages[a] - percentages[b]
  );

  const primary = rankedCandidates[0] ?? dayElement;
  const secondary = rankedCandidates.slice(1, 3);

  const reason = isWeak
    ? `일간은 ${dayElement}이고 ${level}으로 판단되었습니다. 본인의 기운을 보충하는 흐름을 우선 고려하여 ${primary}을 주 용신 후보로 판단했습니다.`
    : isStrong
      ? `일간은 ${dayElement}이고 ${level}으로 판단되었습니다. 과한 기운을 자연스럽게 소모하거나 조절하는 흐름을 우선 고려하여 ${primary}을 주 용신 후보로 판단했습니다.`
      : `일간은 ${dayElement}이고 현재 구조는 한쪽으로 크게 치우치지 않은 것으로 판단되었습니다. 전체 오행 비율을 비교해 상대적으로 보완 가치가 높은 ${primary}을 주 용신 후보로 판단했습니다.`;

  return {
    primary,
    secondary,
    reason,
  };
}