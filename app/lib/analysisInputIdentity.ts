import type { ProfileDto, ProfileInput } from "./profiles/types";

export type CanonicalAnalysisInput = Pick<
  ProfileInput,
  "birthDate" | "birthTime" | "birthTimeKnown" | "gender" | "calendarType" | "isLeapMonth"
>;

export const CANONICAL_ANALYSIS_INPUT_KEYS = [
  "birthDate",
  "birthTime",
  "birthTimeKnown",
  "gender",
  "calendarType",
  "isLeapMonth",
] as const satisfies readonly (keyof CanonicalAnalysisInput)[];

export function canonicalAnalysisInputMatches(
  left: CanonicalAnalysisInput,
  right: CanonicalAnalysisInput,
): boolean {
  return CANONICAL_ANALYSIS_INPUT_KEYS.every((key) => key === "birthTimeKnown"
    ? (left.birthTimeKnown ?? null) === (right.birthTimeKnown ?? null)
    : left[key] === right[key]);
}

export function hasCanonicalAnalysisInputChanged(
  current: ProfileDto | ProfileInput,
  next: ProfileInput,
): boolean {
  return !canonicalAnalysisInputMatches(current, next);
}
