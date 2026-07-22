export type FortuneRelationType =
  | "합"
  | "충"
  | "형"
  | "파"
  | "해";

export interface FortuneRelation {
  type: FortuneRelationType;
  target: string;
  description: string;
}

const BRANCH_CLASHES: [string, string][] = [
  ["자", "오"],
  ["축", "미"],
  ["인", "신"],
  ["묘", "유"],
  ["진", "술"],
  ["사", "해"],
];

export function findBranchClash(
  first: string,
  second: string
): boolean {
  return BRANCH_CLASHES.some(
    ([a, b]) =>
      (first === a && second === b) ||
      (first === b && second === a)
  );
}

const BRANCH_COMBINATIONS: [string, string][] = [
  ["자", "축"],
  ["인", "해"],
  ["묘", "술"],
  ["진", "유"],
  ["사", "신"],
  ["오", "미"],
];

export function findBranchCombination(
  first: string,
  second: string
): boolean {
  return BRANCH_COMBINATIONS.some(
    ([a, b]) =>
      (first === a && second === b) ||
      (first === b && second === a)
  );
}

const BRANCH_PUNISHMENTS: [string, string][] = [
  ["인", "사"],
  ["사", "신"],
  ["신", "인"],
  ["축", "술"],
  ["술", "미"],
  ["미", "축"],
  ["자", "묘"],
];

const SELF_PUNISHMENTS = ["진", "오", "유", "해"];

export function findBranchPunishment(
  first: string,
  second: string
): boolean {
  if (first === second && SELF_PUNISHMENTS.includes(first)) {
    return true;
  }

  return BRANCH_PUNISHMENTS.some(
    ([a, b]) =>
      (first === a && second === b) ||
      (first === b && second === a)
  );
}

const BRANCH_BREAKS: [string, string][] = [
  ["자", "유"],
  ["축", "진"],
  ["인", "해"],
  ["묘", "오"],
  ["사", "신"],
  ["미", "술"],
];

export function findBranchBreak(
  first: string,
  second: string
): boolean {
  return BRANCH_BREAKS.some(
    ([a, b]) =>
      (first === a && second === b) ||
      (first === b && second === a)
  );
}

const BRANCH_HARMS: [string, string][] = [
  ["자", "미"],
  ["축", "오"],
  ["인", "사"],
  ["묘", "진"],
  ["신", "해"],
  ["유", "술"],
];

export function findBranchHarm(
  first: string,
  second: string
): boolean {
  return BRANCH_HARMS.some(
    ([a, b]) =>
      (first === a && second === b) ||
      (first === b && second === a)
  );
}