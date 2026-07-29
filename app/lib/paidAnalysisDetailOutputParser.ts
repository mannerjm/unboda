import { z } from "zod";
import { PaidAnalysisDetailOutput } from "./paidAnalysisDetailOutput";

const PaidAnalysisDetailSchema = z.object({
  headline: z.string().min(1),
  whyThisAnalysis: z.string().min(1),
  currentFlow: z.string().min(1),

  questionsAnswered: z.array(z.string().min(1)).min(3),

  expectedBenefits: z.array(z.string().min(1)).min(3),

  whyNow: z.string().min(1),

  ctaMessage: z.string().min(1),
});

export function parsePaidAnalysisDetailOutput(
  value: unknown,
): PaidAnalysisDetailOutput {
  return PaidAnalysisDetailSchema.parse(value);
}