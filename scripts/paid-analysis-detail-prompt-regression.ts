import {
  buildPaidAnalysisDetailPrompt,
} from "../app/lib/paidAnalysisDetailPrompt";

const prompt = buildPaidAnalysisDetailPrompt({
  analysisType: "재물운 심층 분석",
  birthData: "1990년 1월 1일 오전 9시",
  sajuSummary: "재성과 관성의 균형을 점검해야 하는 구조",
  currentFortuneFlow: "현재 재물 선택과 직업 방향이 함께 변하는 흐름",
  userConcern: "이직과 투자 중 무엇을 먼저 선택해야 할지 고민",
});

if (!prompt.includes("재물운 심층 분석")) {
  throw new Error("analysisType이 프롬프트에 포함되지 않았습니다.");
}

console.log("paid analysis detail prompt regression passed");