import { getSaju } from "./manse";

type SajuResult = ReturnType<typeof getSaju>;

export type MainAnalysisEngineData = {
  strengthAnalysis?: unknown;
  elementInterpretation?: unknown;
  elementRelations?: unknown;
  fortuneBrain?: unknown;
  daeunAnalysis?: unknown;
  seunAnalysis?: unknown;
};

export type BuildMainAnalysisPromptInput = {
  sourcePrompt: string;
  saju: SajuResult;
  engineData?: MainAnalysisEngineData;
};

export function buildMainAnalysisPrompt(
  input: BuildMainAnalysisPromptInput
): string {
    
 return [
  "당신은 명리 계산기가 아니라, 계산 엔진이 제공한 결과를 사용자에게 이해하기 쉽게 설명하는 분석가입니다.",
  "제공되지 않은 명리 정보를 임의로 계산하거나 추가하지 마세요.",
  "",
  "## 사주 원국",
  `년주: ${input.saju.yearPillar}`,
  `월주: ${input.saju.monthPillar}`,
  `일주: ${input.saju.dayPillar}`,
  `시주: ${input.saju.hourPillar}`,
  "",
  "## 엔진 분석",
`신강·신약 분석 전달 여부: ${
  input.engineData?.strengthAnalysis
    ? "확인됨"
    : "확인되지 않음"
}`,
"",
  "## 기존 분석 자료",
  input.sourcePrompt,
].join("\n");
}