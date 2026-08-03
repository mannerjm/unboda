import {
  buildPaidAnalysisDetailPromptV2,
} from "../app/lib/paidAnalysisDetailPrompt";
2.

const prompt = buildPaidAnalysisDetailPromptV2({
  analysisType: "재물운 심층 분석",
  birthData: "테스트 출생 정보",

  originalChart: "테스트 원국 구조",
  coreInterpretation: "테스트 오행·강약·용신·격국 해석",
  fortuneTiming: "테스트 대운·세운·현재 운 흐름",

  sajuSummary: "테스트 사주 요약",
  currentFortuneFlow: "테스트 현재 운 흐름",
  userConcern: "이직과 투자 중 무엇을 먼저 선택해야 할지 고민",
});

if (!prompt.includes("재물운 심층 분석")) {
  throw new Error("analysisType이 프롬프트에 포함되지 않았습니다.");
}

console.log("paid analysis detail prompt regression passed");

console.log(
  "원국 상세 구조 포함:",
  prompt.includes("원국 상세 구조"),
);

console.log(
  "핵심 해석 포함:",
  prompt.includes("오행·강약·용신·격국 핵심 해석"),
);

console.log(
  "운 시기 정보 포함:",
  prompt.includes("대운·세운·현재 운 시기 정보"),
);

console.log(
  "명리 추론 순서 포함:",
  prompt.includes("명리 추론 순서"),
);

console.log(
  "원국 우선 분석 포함:",
  prompt.includes("명리 추론 순서"),
);

console.log(
  "JSON 최종 출력 규칙 포함:",
  prompt.includes("출력은 반드시 유효한 JSON 하나만 반환하세요"),
);