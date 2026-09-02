import { z } from "zod";
import type { ProfileDto } from "./profiles/types";

/**
 * Immutable commercial input snapshot (STEP 57D-48F-D2). Captures ONLY the
 * canonical saju calculation inputs actually consumed by getSaju()/
 * buildFreeAnalysis() — never the full profiles row. label/relationshipType/
 * account metadata are presentation/organizational only and are deliberately
 * excluded; freezing them would be unnecessary personal-data retention.
 */
export const ANALYSIS_INPUT_SNAPSHOT_VERSION = 1 as const;

export const AnalysisInputSnapshotSchema = z.object({
  version: z.literal(ANALYSIS_INPUT_SNAPSHOT_VERSION),
  birthData: z.object({
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    birthTime: z.string().regex(/^\d{2}:\d{2}$/),
    calendarType: z.enum(["양력", "음력"]),
    isLeapMonth: z.boolean(),
    gender: z.enum(["남성", "여성"]),
  }),
});

export type AnalysisInputSnapshot = z.infer<typeof AnalysisInputSnapshotSchema>;

export class InvalidAnalysisInputSnapshotError extends Error {
  constructor() {
    super("분석 입력 스냅샷이 유효하지 않습니다.");
    this.name = "InvalidAnalysisInputSnapshotError";
  }
}

/** Server-side only; never accepts browser-supplied birth data. */
export function buildAnalysisInputSnapshot(profile: ProfileDto): AnalysisInputSnapshot {
  return {
    version: ANALYSIS_INPUT_SNAPSHOT_VERSION,
    birthData: {
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
      calendarType: profile.calendarType,
      isLeapMonth: profile.isLeapMonth,
      gender: profile.gender,
    },
  };
}

/** Fails closed (throws) on malformed/tampered snapshots rather than silently falling back. */
export function parseAnalysisInputSnapshot(raw: unknown): AnalysisInputSnapshot {
  const parsed = AnalysisInputSnapshotSchema.safeParse(raw);

  if (!parsed.success) {
    throw new InvalidAnalysisInputSnapshotError();
  }

  return parsed.data;
}
