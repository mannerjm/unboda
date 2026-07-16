type StemInfo = {
  element: "목" | "화" | "토" | "금" | "수";
  polarity: "양" | "음";
};

const stemInfoMap: Record<string, StemInfo> = {
  甲: { element: "목", polarity: "양" },
  乙: { element: "목", polarity: "음" },
  丙: { element: "화", polarity: "양" },
  丁: { element: "화", polarity: "음" },
  戊: { element: "토", polarity: "양" },
  己: { element: "토", polarity: "음" },
  庚: { element: "금", polarity: "양" },
  辛: { element: "금", polarity: "음" },
  壬: { element: "수", polarity: "양" },
  癸: { element: "수", polarity: "음" },
};

const generates: Record<StemInfo["element"], StemInfo["element"]> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

const controls: Record<StemInfo["element"], StemInfo["element"]> = {
  목: "토",
  화: "금",
  토: "수",
  금: "목",
  수: "화",
};

export function getTenGod(dayStem: string, targetStem: string) {
  const day = stemInfoMap[dayStem];
  const target = stemInfoMap[targetStem];

  if (!day || !target) {
    return "";
  }

  const samePolarity = day.polarity === target.polarity;

  if (day.element === target.element) {
    return samePolarity ? "비견" : "겁재";
  }

  if (generates[day.element] === target.element) {
    return samePolarity ? "식신" : "상관";
  }

  if (controls[day.element] === target.element) {
    return samePolarity ? "편재" : "정재";
  }

  if (controls[target.element] === day.element) {
    return samePolarity ? "편관" : "정관";
  }

  if (generates[target.element] === day.element) {
    return samePolarity ? "편인" : "정인";
  }

  return "";
}