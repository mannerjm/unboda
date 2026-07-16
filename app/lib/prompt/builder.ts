import { buildOutputPrompt } from "./outputPrompt";
import { buildRulePrompt } from "./rulePrompt";
import { buildBasePrompt } from "./basePrompt";
import { buildFortunePrompt } from "./fortunePrompt";
import { buildInputPrompt } from "./inputPrompt";
import type { getSaju } from "../manse";

type SajuResult = ReturnType<typeof getSaju>;

export type PromptBuilderInput = {
  calendarType: string;
  isLeapMonth: boolean;
  birthDate: string;
  birthTime: string;
  gender: string;
  saju: SajuResult;
};

export function buildPrompt(
  input: PromptBuilderInput
): string {
  const {
    calendarType,
    isLeapMonth,
    birthDate,
    birthTime,
    gender,
    saju,
  } = input;

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
    buildRulePrompt(),
     buildOutputPrompt(),
  ].join("\n\n");
}