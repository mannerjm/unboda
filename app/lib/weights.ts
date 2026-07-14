export const STEM_WEIGHT = 10;

export const BRANCH_WEIGHT = 8;

export const HIDDEN_STEM_WEIGHT = {
  primary: 7,
  secondary: 3,
  tertiary: 1,
} as const;

export const SEASON_WEIGHT = {
  veryStrong: 15,
  strong: 10,
  normal: 0,
  weak: -8,
  veryWeak: -15,
} as const;

export type HiddenStemPosition =
  | "primary"
  | "secondary"
  | "tertiary";

export const BRANCH_HIDDEN_STEMS: Record<
  string,
  {
    stem: string;
    position: HiddenStemPosition;
  }[]
> = {
  子: [
    { stem: "癸", position: "primary" },
  ],

  丑: [
    { stem: "己", position: "primary" },
    { stem: "癸", position: "secondary" },
    { stem: "辛", position: "tertiary" },
  ],

  寅: [
    { stem: "甲", position: "primary" },
    { stem: "丙", position: "secondary" },
    { stem: "戊", position: "tertiary" },
  ],

  卯: [
    { stem: "乙", position: "primary" },
  ],

  辰: [
    { stem: "戊", position: "primary" },
    { stem: "乙", position: "secondary" },
    { stem: "癸", position: "tertiary" },
  ],

  巳: [
    { stem: "丙", position: "primary" },
    { stem: "戊", position: "secondary" },
    { stem: "庚", position: "tertiary" },
  ],

  午: [
    { stem: "丁", position: "primary" },
    { stem: "己", position: "secondary" },
  ],

  未: [
    { stem: "己", position: "primary" },
    { stem: "丁", position: "secondary" },
    { stem: "乙", position: "tertiary" },
  ],

  申: [
    { stem: "庚", position: "primary" },
    { stem: "壬", position: "secondary" },
    { stem: "戊", position: "tertiary" },
  ],

  酉: [
    { stem: "辛", position: "primary" },
  ],

  戌: [
    { stem: "戊", position: "primary" },
    { stem: "辛", position: "secondary" },
    { stem: "丁", position: "tertiary" },
  ],

  亥: [
    { stem: "壬", position: "primary" },
    { stem: "甲", position: "secondary" },
  ],
};