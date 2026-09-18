import type { ProfileDto, ProfileInput } from "./profiles/types";

export type CanonicalAnalysisInput = Pick<
  ProfileInput,
  "birthDate" | "birthTime" | "gender" | "calendarType" | "isLeapMonth"
>;

export const CANONICAL_ANALYSIS_INPUT_KEYS = [
  "birthDate",
  "birthTime",
  "gender",
  "calendarType",
  "isLeapMonth",
] as const satisfies readonly (keyof CanonicalAnalysisInput)[];

export function canonicalAnalysisInputMatches(
  left: CanonicalAnalysisInput,
  right: CanonicalAnalysisInput,
): boolean {
  return CANONICAL_ANALYSIS_INPUT_KEYS.every((key) => left[key] === right[key]);
}

export function hasCanonicalAnalysisInputChanged(
  current: ProfileDto | ProfileInput,
  next: ProfileInput,
): boolean {
  return !canonicalAnalysisInputMatches(current, next);
}
