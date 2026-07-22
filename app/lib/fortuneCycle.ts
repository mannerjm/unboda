import { getTenGod } from "./tenGod";

type FiveElement = "목" | "화" | "토" | "금" | "수";

export interface FortuneCycleItemAnalysis {
  ganji: string;
  stem: string;
  branch: string;
  stemTenGod: string;
  stemElement: FiveElement | "";
  branchElement: FiveElement | "";
}

const stemElementMap: Record<string, FiveElement> = {
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
};

const branchElementMap: Record<string, FiveElement> = {
  자: "수",
  축: "토",
  인: "목",
  묘: "목",
  진: "토",
  사: "화",
  오: "화",
  미: "토",
  신: "금",
  유: "금",
  술: "토",
  해: "수",
};

export function analyzeFortuneCycleItem(
  dayStem: string,
  ganji: string
): FortuneCycleItemAnalysis {
  const stem = ganji[0] ?? "";
  const branch = ganji[1] ?? "";

  return {
    ganji,
    stem,
    branch,
    stemTenGod: getTenGod(dayStem, stem),
    stemElement: stemElementMap[stem] ?? "",
    branchElement: branchElementMap[branch] ?? "",
  };
}