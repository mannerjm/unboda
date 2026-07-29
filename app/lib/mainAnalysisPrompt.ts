import { getSaju } from "./manse";
import type { FreeAnalysisResponse } from "./buildFreeAnalysis";

type SajuResult = ReturnType<typeof getSaju>;



export type BuildMainAnalysisPromptInput = {
  sourcePrompt: string;
  saju: SajuResult;
  freeAnalysis: FreeAnalysisResponse;
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
"## 신강·신약",

`판정: ${input.freeAnalysis.strengthAnalysis.level}`,

`엔진 요약: ${input.freeAnalysis.strengthAnalysis.summary}`,

"",

"## 오행 분석",

`엔진 요약: ${input.freeAnalysis.elementInterpretation.summary}`,

"",

"## 용신 분석",

`주 용신: ${input.freeAnalysis.yongshinAnalysis.primary}`,

`보조 용신: ${
  input.freeAnalysis.yongshinAnalysis.secondary.length > 0
    ? input.freeAnalysis.yongshinAnalysis.secondary.join(", ")
    : "없음"
}`,

`선정 근거: ${input.freeAnalysis.yongshinAnalysis.reason}`,

"",
"## 격국 분석",

`주 격국: ${input.freeAnalysis.gyeokgukAnalysis.primary}`,

`후보 격국: ${
  input.freeAnalysis.gyeokgukAnalysis.candidates.length > 0
    ? input.freeAnalysis.gyeokgukAnalysis.candidates.join(", ")
    : "없음"
}`,

`판단 근거: ${input.freeAnalysis.gyeokgukAnalysis.reason}`,

"",
"## 현재 대운",

`현재 대운: ${
  input.freeAnalysis.currentDaeun
    ? input.freeAnalysis.currentDaeun.ganji
    : "현재 대운을 확인할 수 없음"
}`,

"",
"## 현재 세운",

`현재 세운: ${
  input.freeAnalysis.currentSeun
    ? input.freeAnalysis.currentSeun.ganji
    : "현재 세운을 확인할 수 없음"
}`,

"",
"## 운세 흐름",

`종합 운세 흐름: ${
  input.freeAnalysis.fortuneFlowAnalysis
    ? input.freeAnalysis.fortuneFlowAnalysis.summary
    : "운세 흐름 정보를 확인할 수 없음"
}`,

"",
"## 기회 요인",

`기회 요인: ${
  input.freeAnalysis.fortuneFlowAnalysis?.opportunities.length
    ? input.freeAnalysis.fortuneFlowAnalysis.opportunities.join(" / ")
    : "확인된 기회 요인 없음"
}`,

"",

"## 주의 요인",

`주의 요인: ${
  input.freeAnalysis.fortuneFlowAnalysis?.cautions.length
    ? input.freeAnalysis.fortuneFlowAnalysis.cautions.join(" / ")
    : "확인된 주의 요인 없음"
}`,

"",

"## 분야별 가이드",

`직업: ${input.freeAnalysis.fortuneFlowAnalysis?.topicGuides.career ?? "정보 없음"}`,

`재물: ${input.freeAnalysis.fortuneFlowAnalysis?.topicGuides.wealth ?? "정보 없음"}`,

`관계: ${input.freeAnalysis.fortuneFlowAnalysis?.topicGuides.relationship ?? "정보 없음"}`,

`건강: ${input.freeAnalysis.fortuneFlowAnalysis?.topicGuides.health ?? "정보 없음"}`,

"",

  "## 기존 분석 자료",
  input.sourcePrompt,
].join("\n");
}