import { z } from "zod";
import { ReferencePeriodSnapshotSchema } from "./analysisReferencePeriod";
import { PeriodAnalysisBlockSchema } from "./analysisPeriodOutput";
import { PAID_ANALYSIS_DETAIL_SCHEMA_VERSION_V4 } from "./paidAnalysisDetailOutput";
import type {
  PaidAnalysisDetailOutput,
  PaidAnalysisDetailOutputV2,
  PaidAnalysisDetailOutputV3,
  PaidAnalysisDetailOutputV4,
  ResolvedPaidAnalysisDetailV4,
  StoredPaidAnalysisDetail,
} from "./paidAnalysisDetailOutput";

const PaidAnalysisDetailSchema = z.object({
  headline: z.string().min(1),
  whyThisAnalysis: z.string().min(1),
  currentFlow: z.string().min(1),

  questionsAnswered: z.array(z.string().min(1)).min(3),

  expectedBenefits: z.array(z.string().min(1)).min(3),

  whyNow: z.string().min(1),

  ctaMessage: z.string().min(1),
});

const PaidAnalysisDetailV2Schema = z.object({
  heroSummary: z.object({
    headline: z.string().min(1),
    subheadline: z.string().min(1),
    keyMessage: z.string().min(1),
  }),

  decisionAnchor: z.object({
  direction: z.enum(["확대", "유지", "조정", "보류"]),
  focus: z.string().trim().min(1),
  rationale: z.string().trim().min(10),
}),

  causeAnalysis: z.object({
    summary: z.string().min(1),
    reasons: z.array(z.string().min(1)).min(3),
  }),

  fortuneStructure: z.object({
    summary: z.string().min(1),
    items: z
      .array(
        z.object({
          label: z.string().min(1),
          value: z.string().min(1),
          interpretation: z.string().min(1),
        }),
      )
      .min(3),
  }),

  currentSituation: z.object({
    summary: z.string().min(1),
    opportunities: z.array(z.string().min(1)).min(3),
    cautions: z.array(z.string().min(1)).min(3),
  }),

  futureTimeline: z
    .array(
      z.object({
        period: z.string().min(1),
        title: z.string().min(1),
        description: z.string().min(1),
      }),
    )
    .min(4),

  actionGuide: z.array(z.string().trim().min(10)).min(2),

avoidGuide: z.array(z.string().trim().min(10)).min(4),

  coachMessage: z.object({
    title: z.string().min(1),
    message: z.string().min(1),
  }),

  checklist: z.array(z.string().min(1)).min(5),

  recommendations: z.array(
    z.object({
      productId: z.string().min(1),
      title: z.string().min(1),
      reason: z.string().min(1),
    }),
  ),
});

const PaidAnalysisDetailV3Schema =
  PaidAnalysisDetailV2Schema.extend({
    // Absent on model output and on reports stored before P0-8E.
    referencePeriod: ReferencePeriodSnapshotSchema.optional(),

    // PERIOD-only; a missing block must never fail the whole report.
    periodAnalysis: PeriodAnalysisBlockSchema.optional(),

    aiInsight: z.object({
      headline: z.string().trim().min(10),
      explanation: z.string().trim().min(30),
    }),

    pastPattern: z.object({
      summary: z.string().trim().min(20),
      periods: z
        .array(
          z.object({
            period: z.string().trim().min(1),
            pattern: z.string().trim().min(20),
            verificationQuestion: z.string().trim().min(10),
          }),
        )
        .min(1)
        .max(3),
    }),

    currentCoreProblem: z.object({
      title: z.string().trim().min(5),
      description: z.string().trim().min(20),
      whyItMatters: z.string().trim().min(20),
    }),

    confidence: z.object({
      level: z.enum(["높음", "중간", "낮음"]),
      strongestEvidence: z
        .array(z.string().trim().min(10))
        .min(2),
      uncertaintyFactors: z
        .array(z.string().trim().min(10))
        .min(1),
      limitations: z.string().trim().min(20),
    }),
  });

export function parsePaidAnalysisDetailOutput(
  value: unknown,
): PaidAnalysisDetailOutput {
  return PaidAnalysisDetailSchema.parse(value);
}

export function parsePaidAnalysisDetailOutputV2(
  value: unknown,
): PaidAnalysisDetailOutputV2 {
  return PaidAnalysisDetailV2Schema.parse(value);
}

export function parsePaidAnalysisDetailOutputV3(
  value: unknown,
): PaidAnalysisDetailOutputV3 {
  return PaidAnalysisDetailV3Schema.parse(value);
}

const PaidAnalysisEvidenceKeySchema = z.enum([
  "strength",
  "yongshin",
  "gyeokguk",
  "element_balance",
  "fortune_flow",
  "daeun",
  "seun",
  "element_relations",
  "fortune_brain",
]);

const PaidAnalysisSituationItemV4Schema = z.object({
  situation: z.string().trim().min(10),
  implication: z.string().trim().min(10),
  observableSignal: z.string().trim().min(10),
});

const PaidAnalysisDetailV4Schema = z.object({
  schemaVersion: z.literal(PAID_ANALYSIS_DETAIL_SCHEMA_VERSION_V4),

  conclusion: z.object({
    headline: z.string().trim().min(1),
    direction: z.enum(["확대", "유지", "조정", "보류"]),
    focus: z.string().trim().min(1),
    rationale: z.string().trim().min(10),
    immediateAction: z.string().trim().min(10),
  }),

  coreProblem: z.object({
    title: z.string().trim().min(5),
    description: z.string().trim().min(20),
    whyItMatters: z.string().trim().min(20),
  }),

  cause: z.object({
    summary: z.string().trim().min(10),
    reasons: z
      .array(
        z.object({
          title: z.string().trim().min(1),
          observedStructure: z.string().trim().min(10),
          realWorldPattern: z.string().trim().min(10),
          problemLinkage: z.string().trim().min(10),
        }),
      )
      .min(3)
      .max(3),
  }),

  evidence: z
    .array(
      z.object({
        evidenceKey: PaidAnalysisEvidenceKeySchema,
        meaning: z.string().trim().min(10),
        linkage: z.string().trim().min(10),
      }),
    )
    .min(3)
    .max(4),

  current: z.object({
    summary: z.string().trim().min(10),
    opportunities: z.array(PaidAnalysisSituationItemV4Schema).min(3).max(3),
    cautions: z.array(PaidAnalysisSituationItemV4Schema).min(3).max(3),
  }),

  timeline: z
    .array(
      z.object({
        label: z.string().trim().min(1),
        changeSignal: z.string().trim().min(10),
        preparation: z.string().trim().min(10),
      }),
    )
    .min(4)
    .max(4),

  timelineSource: z
    .enum(["topic-relative", "period-year", "period-daeun", "lifetime"])
    .optional(),

  action: z
    .array(
      z.object({
        action: z.string().trim().min(5),
        target: z.string().trim().min(2),
        condition: z.string().trim().min(10),
        completionCriteria: z.string().trim().min(10),
      }),
    )
    .min(2)
    .max(3),

  avoid: z
    .array(
      z.object({
        type: z.enum(["misjudgment", "risky_action", "bad_condition"]),
        behavior: z.string().trim().min(10),
        reason: z.string().trim().min(10),
      }),
    )
    .min(2)
    .max(3),

  decisionCheck: z.array(z.string().trim().min(10)).min(3).max(5).optional(),

  confidence: z.object({
    level: z.enum(["높음", "중간", "낮음"]),
    strongestEvidence: z.array(z.string().trim().min(10)).min(2),
    uncertaintyFactors: z.array(z.string().trim().min(10)).min(1),
    limitations: z.string().trim().min(20),
  }),

  referencePeriod: ReferencePeriodSnapshotSchema.optional(),

  periodAnalysis: PeriodAnalysisBlockSchema.optional(),
});

export function parsePaidAnalysisDetailOutputV4(
  value: unknown,
): PaidAnalysisDetailOutputV4 {
  return PaidAnalysisDetailV4Schema.parse(value);
}

// Stored and rendered reports must carry the server-resolved fact, never a bare key.
const ResolvedPaidAnalysisDetailV4Schema = PaidAnalysisDetailV4Schema.extend({
  evidence: z
    .array(
      z.object({
        evidenceKey: PaidAnalysisEvidenceKeySchema,
        label: z.string().trim().min(1),
        fact: z.string().trim().min(1),
        meaning: z.string().trim().min(10),
        linkage: z.string().trim().min(10),
      }),
    )
    .min(3)
    .max(4),
});

export function parseResolvedPaidAnalysisDetailV4(
  value: unknown,
): ResolvedPaidAnalysisDetailV4 {
  return ResolvedPaidAnalysisDetailV4Schema.parse(value);
}

/** Reads both the legacy V3 rows already in paid_reports and new V4 rows. */
export function parseStoredPaidAnalysisDetail(
  value: unknown,
): StoredPaidAnalysisDetail {
  const schemaVersion =
    typeof value === "object" && value !== null
      ? (value as { schemaVersion?: unknown }).schemaVersion
      : undefined;

  if (schemaVersion === PAID_ANALYSIS_DETAIL_SCHEMA_VERSION_V4) {
    return parseResolvedPaidAnalysisDetailV4(value);
  }

  return parsePaidAnalysisDetailOutputV3(value);
}