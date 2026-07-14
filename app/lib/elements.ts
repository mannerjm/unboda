import {
  BRANCH_HIDDEN_STEMS,
  BRANCH_WEIGHT,
  HIDDEN_STEM_WEIGHT,
  STEM_WEIGHT,
} from "./weights";

export type Element = "목" | "화" | "토" | "금" | "수";

export const stemElementMap: Record<string, Element> = {
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

export const branchElementMap: Record<string, Element> = {
  子: "수",
  丑: "토",

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
};

export type ElementCounts = Record<Element, number>;

export type ElementAnalysis = {
  counts: ElementCounts;
  percentages: ElementCounts;
  total: number;
  strongest: Element[];
  weakest: Element[];
};

const elementOrder: Element[] = [
  "목",
  "화",
  "토",
  "금",
  "수",
];

function createEmptyCounts(): ElementCounts {
  return {
    목: 0,
    화: 0,
    토: 0,
    금: 0,
    수: 0,
  };
}

export function calculateElements(
  stems: string[],
  branches: string[]
): ElementAnalysis {
  const counts = createEmptyCounts();

  for (const stem of stems) {
    const element = stemElementMap[stem];

    if (element) {
      counts[element] += 1;
    }
  }

  for (const branch of branches) {
    const element = branchElementMap[branch];

    if (element) {
      counts[element] += 1;
    }
  }

  const total = Object.values(counts).reduce(
    (sum, value) => sum + value,
    0
  );

  const percentages = createEmptyCounts();

  for (const element of elementOrder) {
    percentages[element] =
      total === 0
        ? 0
        : Math.round((counts[element] / total) * 100);
  }

  const values = Object.values(counts);
  const highest = Math.max(...values);
  const lowest = Math.min(...values);

  const strongest = elementOrder.filter(
    (element) => counts[element] === highest
  );

  const weakest = elementOrder.filter(
    (element) => counts[element] === lowest
  );

  return {
    counts,
    percentages,
    total,
    strongest,
    weakest,
  };
}

export function calculateWeightedElements(
  stems: string[],
  branches: string[]
): ElementAnalysis {
  const counts = createEmptyCounts();

  // 천간 점수
  for (const stem of stems) {
    const element = stemElementMap[stem];

    if (element) {
      counts[element] += STEM_WEIGHT;
    }
  }

  // 지지 본체 점수와 지장간 점수
  for (const branch of branches) {
    const branchElement = branchElementMap[branch];

    if (branchElement) {
      counts[branchElement] += BRANCH_WEIGHT;
    }

    const hiddenStems = BRANCH_HIDDEN_STEMS[branch] ?? [];

    for (const hiddenStem of hiddenStems) {
      const hiddenElement = stemElementMap[hiddenStem.stem];

      if (!hiddenElement) {
        continue;
      }

      counts[hiddenElement] +=
        HIDDEN_STEM_WEIGHT[hiddenStem.position];
    }
  }

  const total = Object.values(counts).reduce(
    (sum, value) => sum + value,
    0
  );

  const percentages = createEmptyCounts();

  for (const element of elementOrder) {
    percentages[element] =
      total === 0
        ? 0
        : Number(
            ((counts[element] / total) * 100).toFixed(1)
          );
  }

  const values = Object.values(counts);
  const highest = Math.max(...values);
  const lowest = Math.min(...values);

  const strongest = elementOrder.filter(
    (element) => counts[element] === highest
  );

  const weakest = elementOrder.filter(
    (element) => counts[element] === lowest
  );

  return {
    counts,
    percentages,
    total,
    strongest,
    weakest,
  };
}