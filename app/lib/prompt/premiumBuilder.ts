import type { PaidAnalysisProductId } from "../paidAnalysisProducts";
import type { getSaju } from "../manse";

import { buildBasePrompt } from "./basePrompt";
import { buildFortunePrompt } from "./fortunePrompt";
import { buildInputPrompt } from "./inputPrompt";
import { buildOutputPrompt } from "./outputPrompt";
import { buildProductPrompt } from "./productPrompt";
import { buildRulePrompt } from "./rulePrompt";

type SajuResult = ReturnType<typeof getSaju>;

type BuildPremiumPromptInput = {
  productId: PaidAnalysisProductId;
  calendarType: string;
  isLeapMonth: boolean;
  birthDate: string;
  birthTime: string;
  gender: string;
  saju: SajuResult;
};

export function buildPremiumPrompt({
  productId,
  calendarType,
  isLeapMonth,
  birthDate,
  birthTime,
  gender,
  saju,
}: BuildPremiumPromptInput): string {
  return [
    buildBasePrompt(),
    buildFortunePrompt(),
    buildInputPrompt(
      calendarType,
      isLeapMonth,
      birthDate,
      birthTime,
      gender,
      saju
    ),
    buildProductPrompt(productId),
    buildRulePrompt(),
    buildOutputPrompt(),
  ].join("\n\n");
}