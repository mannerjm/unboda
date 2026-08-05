import { z } from "zod";
import type {
  PaidAnalysisDetailOutput,
  PaidAnalysisDetailOutputV2,
  PaidAnalysisDetailOutputV3,
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

  actionGuide: z.array(z.string().trim().min(10)).min(5),

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