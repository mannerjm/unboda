import { getSaju } from "./manse";

type SajuResult = ReturnType<typeof getSaju>;

export type BuildMainAnalysisPromptInput = {
  sourcePrompt: string;
  saju: SajuResult;
};

export function buildMainAnalysisPrompt(
  input: BuildMainAnalysisPromptInput
): string {
    
 return [
  "아래의 사주 분석 자료를 바탕으로 사용자에게 이해하기 쉬운 해석을 작성하세요.",
  "",
 "## 사주 원국",
`년주: ${input.saju.yearPillar}`,
`월주: ${input.saju.monthPillar}`,
`일주: ${input.saju.dayPillar}`,
`시주: ${input.saju.hourPillar}`,
  "",
  input.sourcePrompt,
].join("\n");
}