import type { calculateStrength } from "./strength";
import type { calculateWeightedElements } from "./elements";

type StrengthResult = ReturnType<typeof calculateStrength>;
type ElementAnalysisResult = ReturnType<typeof calculateWeightedElements>;

type FiveElement = "목" | "화" | "토" | "금" | "수";

export type YongshinResult = {
  primary: FiveElement;
  secondary: FiveElement[];
  scores: Record<FiveElement, number>;
  normalizedScores: Record<FiveElement, number>;
  scoreDetails: Record<
    FiveElement,
    {
       strength: number;
    balance: number;
    season: number;
    climate: number;
    passage: number;
    excess: number;
    total: number;
    }
  >;
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
  monthBranch: string,
  strength: StrengthResult,
  elements: ElementAnalysisResult
): YongshinResult {
  const dayElement = stemToElement[dayStem];

  if (!dayElement) {
    throw new Error(`일간 오행을 찾을 수 없습니다: ${dayStem}`);
  }

  const seasonByBranch: Record<string, string> = {
  寅: "목",
  卯: "목",
  辰: "토",
  巳: "화",
  午: "화",
  未: "토",
  申: "금",
  酉: "금",
  戌: "토",
  亥: "수",
  子: "수",
  丑: "토",
};

  const seasonElement = seasonByBranch[monthBranch] ?? "";
  
  const percentages = elements.percentages;

  const level = strength.level;

  const isWeak = level.includes("신약");
  const isStrong = level.includes("신강");

  const fiveElements: FiveElement[] = ["목", "화", "토", "금", "수"];

const scores: Record<FiveElement, number> = {
  목: 0,
  화: 0,
  토: 0,
  금: 0,
  수: 0,
};

const scoreDetails: YongshinResult["scoreDetails"] = {
  목: {
    strength: 0,
    balance: 0,
    season: 0,
    climate: 0,
    passage: 0,
    excess: 0,
    total: 0,
  },
  화: {
    strength: 0,
    balance: 0,
    season: 0,
    climate: 0,
    passage: 0,
    excess: 0,
    total: 0,
  },
  토: {
    strength: 0,
    balance: 0,
    season: 0,
    climate: 0,
    passage: 0,
    excess: 0,
    total: 0,
  },
  금: {
    strength: 0,
    balance: 0,
    season: 0,
    climate: 0,
    passage: 0,
    excess: 0,
    total: 0,
  },
  수: {
    strength: 0,
    balance: 0,
    season: 0,
    climate: 0,
    passage: 0,
    excess: 0,
    total: 0,
  },
};

// 1. 신강·신약에 따른 기본 가점
if (isWeak) {
  const resourceElement = findGeneratingElement(dayElement);

  scores[resourceElement] += 40;
scoreDetails[resourceElement].strength += 40;

scores[dayElement] += 25;
scoreDetails[dayElement].strength += 25;

} else if (isStrong) {
  const outputElement = generates[dayElement];
  const wealthElement = controls[dayElement];
  const officerElement = findControllingElement(dayElement);

 scores[outputElement] += 40;
scoreDetails[outputElement].strength += 40;
 scores[wealthElement] += 30;
scoreDetails[wealthElement].strength += 30;
  scores[officerElement] += 20;
scoreDetails[officerElement].strength += 20;
} else {
  // 중화에 가까운 경우는 부족한 오행을 더 중요하게 봄
  for (const element of fiveElements) {
    scores[element] += 20;
  }
}

// 2. 실제 오행 비율이 낮을수록 가점
for (const element of fiveElements) {
  const balanceScore = Math.max(0, 25 - percentages[element]);

  scores[element] += balanceScore;
  scoreDetails[element].balance += balanceScore;
}

// 3. 월령의 계절 오행이 이미 강하게 작용하는 경우 감점
if (seasonElement && seasonElement in scores) {
  const element = seasonElement as FiveElement;

  scores[element] -= 15;
  scoreDetails[element].season -= 15;
}

// 4. 지나치게 높은 오행은 용신 후보에서 감점
for (const element of fiveElements) {
  if (percentages[element] >= 30) {
    scores[element] -= 20;
    scoreDetails[element].excess -= 20;
  }

  if (percentages[element] >= 40) {
    scores[element] -= 15;
    scoreDetails[element].excess -= 15;
  }
  }

  // 5. 조후 보정
const hotBranches = ["巳", "午"];
const coldBranches = ["亥", "子"];
const dryBranches = ["申", "酉", "戌"];
const wetBranches = ["亥", "子", "丑"];

if (hotBranches.includes(monthBranch)) {
  scores["수"] += 25;
  scoreDetails["수"].climate += 25;

  scores["화"] -= 10;
  scoreDetails["화"].climate -= 10;
}

if (coldBranches.includes(monthBranch)) {
  scores["화"] += 25;
  scoreDetails["화"].climate += 25;

  scores["수"] -= 10;
  scoreDetails["수"].climate -= 10;
}

if (dryBranches.includes(monthBranch)) {
  scores["수"] += 10;
  scoreDetails["수"].climate += 10;
}

if (wetBranches.includes(monthBranch)) {
  scores["화"] += 10;
  scoreDetails["화"].climate += 10;
}
// 6. 통관 보정
const passageRules: Array<{
  first: FiveElement;
  second: FiveElement;
  mediator: FiveElement;
}> = [
  { first: "목", second: "금", mediator: "수" },
  { first: "화", second: "수", mediator: "목" },
  { first: "토", second: "목", mediator: "화" },
  { first: "금", second: "화", mediator: "토" },
  { first: "수", second: "토", mediator: "금" },
];

const passageCandidates = passageRules
  .filter((rule) => {
    const firstValue = percentages[rule.first];
    const secondValue = percentages[rule.second];

    return firstValue >= 15 && secondValue >= 15;
  })
  .map((rule) => {
    const firstValue = percentages[rule.first];
    const secondValue = percentages[rule.second];

    // 충돌하는 두 오행 중 약한 쪽을 기준으로 통관 필요도 계산
    const conflictStrength = Math.min(firstValue, secondValue);

    return {
      ...rule,
      conflictStrength,
    };
  })
  .sort((a, b) => b.conflictStrength - a.conflictStrength);

const bestPassage = passageCandidates[0];

if (bestPassage) {
  const passageBonus = 15;

  scores[bestPassage.mediator] += passageBonus;
  scoreDetails[bestPassage.mediator].passage += passageBonus;
}

// 7. 최종 점수 저장
for (const element of fiveElements) {
  scoreDetails[element].total = scores[element];
}

// 7.5 신강·신약 방향성 안전장치
if (isWeak) {
  const outputElement = generates[dayElement];
  const wealthElement = controls[dayElement];
  const officerElement = findControllingElement(dayElement);

  for (const element of [
    outputElement,
    wealthElement,
    officerElement,
  ]) {
    const detail = scoreDetails[element];

    // 신약 상태에서는 조후·통관 보정이
    // 억부 방향을 과도하게 뒤집지 못하도록 제한
    const auxiliaryBonus =
      detail.climate + detail.passage;

    if (auxiliaryBonus > 15) {
      const penalty = auxiliaryBonus - 15;

      scores[element] -= penalty;
      detail.total -= penalty;
    }
  }
}
// 7-6. 신약 최종 안전장치
if (isWeak) {
  const resourceElement = findGeneratingElement(dayElement);

  const supportiveCandidates: FiveElement[] = [
    resourceElement,
    dayElement,
  ];

  const bestSupportive = supportiveCandidates.reduce((best, current) =>
    scores[current] > scores[best] ? current : best
  );

  const currentTop = [...fiveElements].sort(
    (a, b) => scores[b] - scores[a]
  )[0];

  const isHarmfulTop =
    currentTop !== resourceElement &&
    currentTop !== dayElement;

  const scoreGap =
    scores[currentTop] - scores[bestSupportive];

  // 신약인데 식상·재성·관성이 1위라도
  // 인성·비겁 최고점과 10점 이내면 보조 오행을 우선시
  if (isHarmfulTop && scoreGap <= 10) {
    const bonus = scoreGap + 0.1;

    scores[bestSupportive] += bonus;
    scoreDetails[bestSupportive].strength += bonus;
  }
}

// 8. 최종 점수 순으로 정렬
const rankedCandidates = [...fiveElements].sort(
  (a, b) => scores[b] - scores[a]
);

const rawValues = rankedCandidates.map((element) => scores[element]);
const minScore = Math.min(...rawValues);
const maxScore = Math.max(...rawValues);

const normalizedScores = Object.fromEntries(
  fiveElements.map((element) => {
    const normalized =
      maxScore === minScore
        ? 50
        : ((scores[element] - minScore) / (maxScore - minScore)) * 100;

    return [element, Math.round(normalized * 10) / 10];
  })
) as Record<FiveElement, number>;

const primary = rankedCandidates[0] ?? dayElement;
const secondary = rankedCandidates.slice(1, 3);


const primaryDetail = scoreDetails[primary];
const isClimateDriven =
  primaryDetail.climate >= 20;

const isPassageDriven =
  primaryDetail.passage >= 15;

const exceptionalReason =
  isWeak && (isClimateDriven || isPassageDriven)
    ? "신약 구조이지만 조후 또는 통관 필요성이 강해 해당 오행을 우선 용신으로 판단했습니다. "
    : "";
const secondCandidate = secondary[0];
const scoreGap = secondCandidate
  ? scores[primary] - scores[secondCandidate]
  : 0;

const topicParticle = (value: string) =>
  ["화", "수"].includes(value) ? "는" : "은";

const objectParticle = (value: string) =>
  ["화", "수"].includes(value) ? "를" : "을";

const reason =
 exceptionalReason +
  `일간은 ${dayElement}이고 ${level}으로 판단되었습니다. ` +
  `월지 ${monthBranch}의 계절 오행은 ${seasonElement}입니다. ` +
  `${primary}${topicParticle(primary)} 신강·신약 구조, 계절 영향, 실제 오행 분포를 함께 점수화한 결과 ` +
  `가장 높은 보완 우선도를 보였습니다. ` +
  `2순위 ${secondary[0]}보다 원점수 기준 ${scoreGap.toFixed(1)}점 높습니다. ` +
  `따라서 ${primary}${objectParticle(primary)} 주 용신으로, ${secondary.join(", ")}을 보조 후보로 판단했습니다.`;

  return {
  primary,
  secondary,
  scores,
   normalizedScores,
  scoreDetails,
  reason,
};
}