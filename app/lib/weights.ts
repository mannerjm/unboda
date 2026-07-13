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