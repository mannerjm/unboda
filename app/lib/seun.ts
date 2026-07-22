import { analyzeFortuneCycleItem } from "./fortuneCycle";
export interface SeunItem {
  year: number;
  age: number;
  ganji: string;
  analysis: ReturnType<typeof analyzeFortuneCycleItem>;
}

export interface SeunAnalysis {
  items: SeunItem[];
}

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

function getYearGanji(year: number): string {
  const stem = STEMS[(year - 4) % 10];
  const branch = BRANCHES[(year - 4) % 12];

  return `${stem}${branch}`;
}

export function calculateSeun(
  birthYear: number,
  startYear: number,
  dayStem: string,
  count = 10
): SeunAnalysis {
  const items: SeunItem[] = [];

  for (let i = 0; i < count; i++) {
    const year = startYear + i;

    const ganji = getYearGanji(year);

items.push({
  year,
  age: year - birthYear + 1,
  ganji,
  analysis: analyzeFortuneCycleItem(dayStem, ganji),
});
  }

  return { items };
}