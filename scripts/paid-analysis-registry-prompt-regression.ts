import { buildPaidAnalysisDetailPromptV2 } from "../app/lib/paidAnalysisDetailPrompt";

const prompt = buildPaidAnalysisDetailPromptV2({
  productId: "money-wealth-accumulation",
  analysisType: "재물이 쌓이는 구조",
  birthData: "test-birth-data",
  originalChart: "test-original-chart",
  coreInterpretation: "test-core-interpretation",
  fortuneTiming: "test-fortune-timing",
  sajuSummary: "test-saju-summary",
  currentFortuneFlow: "test-current-fortune-flow",
});

if (!prompt.includes("MONEY")) {
  throw new Error(
    "money-wealth-accumulation이 MONEY Plugin context를 포함하지 않습니다.",
  );
}

if (!prompt.includes("money-wealth-accumulation")) {
  throw new Error(
    "Prompt에 Registry productId가 포함되지 않았습니다.",
  );
}

if (!prompt.includes("재물이 쌓이는 구조")) {
  throw new Error(
    "Prompt에 Registry 상품 title이 포함되지 않았습니다.",
  );
}

const annualPrompt = buildPaidAnalysisDetailPromptV2({
  productId: "annual-current",
  analysisType: "올해 세운 종합 분석",
  birthData: "test-birth-data",
  originalChart: "test-original-chart",
  coreInterpretation: "test-core-interpretation",
  fortuneTiming: "test-fortune-timing",
  sajuSummary: "test-saju-summary",
  currentFortuneFlow: "test-current-fortune-flow",
});

if (!annualPrompt.includes("상품별 분석 규칙 - 시기·운세")) {
  throw new Error(
    "annual-current가 FORTUNE Prompt Rules를 포함하지 않습니다.",
  );
}

if (!annualPrompt.includes("annual-current")) {
  throw new Error(
    "annual-current Prompt에 Registry productId가 포함되지 않았습니다.",
  );
}

if (!annualPrompt.includes("올해 세운 종합 분석")) {
  throw new Error(
    "annual-current Prompt에 Registry 상품 title이 포함되지 않았습니다.",
  );
}

if (!annualPrompt.includes("Plugin: FORTUNE")) {
  throw new Error(
    "annual-current Prompt에 Registry FORTUNE plugin metadata가 포함되지 않았습니다.",
  );
}

console.log("paid analysis registry prompt regression passed");