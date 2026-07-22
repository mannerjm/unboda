import type { Element } from "./elements";

export interface FortuneElementFlow {
  original: Record<Element, number>;
  adjusted: Record<Element, number>;
  changes: Record<Element, number>;
  strongest: Element[];
  weakest: Element[];
}

const ELEMENTS: Element[] = ["목", "화", "토", "금", "수"];

export function analyzeFortuneElementFlow(
  original: Record<Element, number>,
  addedElements: Element[]
): FortuneElementFlow {
  const adjusted = { ...original };

  for (const element of addedElements) {
    adjusted[element] = (adjusted[element] ?? 0) + 1;
  }

  const changes = {} as Record<Element, number>;

  for (const element of ELEMENTS) {
    changes[element] = adjusted[element] - original[element];
  }

  const values = ELEMENTS.map((element) => adjusted[element]);
  const max = Math.max(...values);
  const min = Math.min(...values);

  return {
    original,
    adjusted,
    changes,
    strongest: ELEMENTS.filter((element) => adjusted[element] === max),
    weakest: ELEMENTS.filter((element) => adjusted[element] === min),
  };
}