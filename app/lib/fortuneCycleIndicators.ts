import { getTenGod } from "./tenGod";

const stemToHanja: Record<string, string> = {
  갑: "甲",
  을: "乙",
  병: "丙",
  정: "丁",
  무: "戊",
  기: "己",
  경: "庚",
  신: "辛",
  임: "壬",
  계: "癸",
};

const branchToHanja: Record<string, string> = {
  자: "子",
  축: "丑",
  인: "寅",
  묘: "卯",
  진: "辰",
  사: "巳",
  오: "午",
  미: "未",
  신: "申",
  유: "酉",
  술: "戌",
  해: "亥",
};

const branchMainHiddenStem: Record<string, string> = {
  子: "癸",
  丑: "己",
  寅: "甲",
  卯: "乙",
  辰: "戊",
  巳: "丙",
  午: "丁",
  未: "己",
  申: "庚",
  酉: "辛",
  戌: "戊",
  亥: "壬",
};

const twelveStages = [
  "장생",
  "목욕",
  "관대",
  "건록",
  "제왕",
  "쇠",
  "병",
  "사",
  "묘",
  "절",
  "태",
  "양",
] as const;

const branchOrder = [
  "子",
  "丑",
  "寅",
  "卯",
  "辰",
  "巳",
  "午",
  "未",
  "申",
  "酉",
  "戌",
  "亥",
] as const;

const stageStartBranch: Record<string, string> = {
  甲: "亥",
  乙: "午",
  丙: "寅",
  丁: "酉",
  戊: "寅",
  己: "酉",
  庚: "巳",
  辛: "子",
  壬: "申",
  癸: "卯",
};

const yangStems = new Set(["甲", "丙", "戊", "庚", "壬"]);

const twelveSpiritOrder = [
  "겁살",
  "재살",
  "천살",
  "지살",
  "년살",
  "월살",
  "망신살",
  "장성살",
  "반안살",
  "역마살",
  "육해살",
  "화개살",
] as const;

const twelveSpiritStartBranch: Record<string, string> = {
  寅: "亥",
  午: "亥",
  戌: "亥",
  申: "巳",
  子: "巳",
  辰: "巳",
  巳: "寅",
  酉: "寅",
  丑: "寅",
  亥: "申",
  卯: "申",
  未: "申",
};

function normalizeStem(value: string): string {
  return stemToHanja[value] ?? value;
}

function normalizeBranch(value: string): string {
  return branchToHanja[value] ?? value;
}

export function getFortuneCycleTwelveStage(dayStem: string, targetBranch: string): string {
  const normalizedDayStem = normalizeStem(dayStem);
  const normalizedTargetBranch = normalizeBranch(targetBranch);
  const startBranch = stageStartBranch[normalizedDayStem];

  if (!startBranch || !normalizedTargetBranch) return "";

  const startIndex = branchOrder.indexOf(startBranch as (typeof branchOrder)[number]);
  const targetIndex = branchOrder.indexOf(normalizedTargetBranch as (typeof branchOrder)[number]);
  if (startIndex === -1 || targetIndex === -1) return "";

  const distance = yangStems.has(normalizedDayStem)
    ? (targetIndex - startIndex + 12) % 12
    : (startIndex - targetIndex + 12) % 12;

  return twelveStages[distance];
}

export function getFortuneCycleTwelveSpirit(dayBranch: string, targetBranch: string): string {
  const normalizedDayBranch = normalizeBranch(dayBranch);
  const normalizedTargetBranch = normalizeBranch(targetBranch);
  const startBranch = twelveSpiritStartBranch[normalizedDayBranch];

  if (!startBranch || !normalizedTargetBranch) return "";

  const startIndex = branchOrder.indexOf(startBranch as (typeof branchOrder)[number]);
  const targetIndex = branchOrder.indexOf(normalizedTargetBranch as (typeof branchOrder)[number]);
  if (startIndex === -1 || targetIndex === -1) return "";

  return twelveSpiritOrder[(targetIndex - startIndex + 12) % 12];
}

export type FortuneCycleIndicators = {
  stemTenGod: string;
  branchTenGod: string;
  twelveStage: string;
  twelveSpirit: string;
};

export function getFortuneCycleIndicators({
  dayStem,
  dayBranch,
  ganji,
}: {
  dayStem: string;
  dayBranch: string;
  ganji: string;
}): FortuneCycleIndicators {
  const targetStem = normalizeStem(ganji[0] ?? "");
  const targetBranch = normalizeBranch(ganji[1] ?? "");
  const normalizedDayStem = normalizeStem(dayStem);
  const branchStem = branchMainHiddenStem[targetBranch] ?? "";

  return {
    stemTenGod: getTenGod(normalizedDayStem, targetStem),
    branchTenGod: getTenGod(normalizedDayStem, branchStem),
    twelveStage: getFortuneCycleTwelveStage(normalizedDayStem, targetBranch),
    twelveSpirit: getFortuneCycleTwelveSpirit(dayBranch, targetBranch),
  };
}
