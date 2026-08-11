
import { getSaju } from "@/app/lib/manse";
import { NextResponse } from "next/server";
import { buildSajuResponse } from "@/app/lib/buildSajuResponse";
import { validateAnalyzeInput } from "@/app/lib/validateAnalyzeInput";
import { getAnalyzeErrorStatus } from "@/app/lib/getAnalyzeErrorStatus";
import { buildFreeAnalysis } from "@/app/lib/buildFreeAnalysis";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import { buildPremiumAnalysis } from "@/app/lib/buildPremiumAnalysis";
import { buildAnalysisProductRecommendations } from "@/app/lib/analysisProductRecommendations";
import { buildAnalysisRecommendation } from "@/app/lib/analysisRecommendationBuilder";
import { buildMainAnalysisPrompt } from "@/app/lib/mainAnalysisPrompt";
import { buildMainAnalysisCompactFacts } from "../../lib/mainAnalysisCompactFacts";
import {
  generateMainAnalysis,
  generateRecommendationExplanation,
} from "@/app/lib/analysisAIService";
import type {
  AnalyzeRequest,
  AnalyzeSuccessResponse,
  AnalyzeErrorResponse,
} from "@/app/lib/analyzeApiTypes";
export async function POST(req: Request) {
  try {
    let body: AnalyzeRequest;

    try {
      body = (await req.json()) as AnalyzeRequest;
    } catch {
      const errorResponse: AnalyzeErrorResponse = {
        error: "요청 데이터가 올바른 JSON 형식이 아닙니다.",
      };

      return NextResponse.json(
        errorResponse,
        { status: 400 }
      );
    }

const {
  birthDate,
  birthTime,
  calendarType,
  isLeapMonth,
  gender,
  productId,
} = body;

const isLeapMonthBoolean = isLeapMonth === "윤달";

const validation = validateAnalyzeInput({
  birthDate,
  birthTime,
  calendarType,
  isLeapMonth,
  gender,
});

if (!validation.valid) {
  const errorResponse: AnalyzeErrorResponse = {
    error: validation.error,
  };

  return NextResponse.json(
    errorResponse,
    { status: 400 }
  );
}
if (
  productId !== undefined &&
  !getPremiumProduct(productId)
) {
  const errorResponse: AnalyzeErrorResponse = {
    error: "유효하지 않은 유료 분석 상품입니다.",
  };

  return NextResponse.json(
    errorResponse,
    { status: 400 }
  );
}

const saju = getSaju(
  birthDate,
  birthTime,
  calendarType,
  isLeapMonth,
  gender
);

const freeAnalysis =
  buildFreeAnalysis(saju);

const compactFacts = buildMainAnalysisCompactFacts({
  saju,
  freeAnalysis,
});

const mainAnalysisPrompt = buildMainAnalysisPrompt({
  compactFacts,
});

const recommendationAnalysis = buildPremiumAnalysis(saju);

const productRecommendations =
  buildAnalysisProductRecommendations({
    fortuneBrain: recommendationAnalysis.fortuneBrain,
    strengthAnalysis: recommendationAnalysis.strengthAnalysis,
    elementRelations: recommendationAnalysis.elementRelations,
    fortuneFlow: recommendationAnalysis.fortuneFlowAnalysis,
  });

if (!productRecommendations.engineResult) {
  throw new Error("Recommendation engine result is missing");
}

const analysisRecommendation = buildAnalysisRecommendation({
  engineResult: productRecommendations.engineResult,
});
const [mainAnalysis, generatedRecommendation] = await Promise.all([
  generateMainAnalysis(mainAnalysisPrompt),
  generateRecommendationExplanation(analysisRecommendation),
]);

const responseData: AnalyzeSuccessResponse = {
  result:
  mainAnalysis ||
  "AI 분석 결과를 생성하지 못했습니다.",

  saju: buildSajuResponse(saju),
  freeAnalysis,
  premiumAnalysis:
  productId === undefined
    ? undefined
    : recommendationAnalysis,
    productRecommendations,
    recommendationExplanation: generatedRecommendation,
};

const response = NextResponse.json(responseData);

return response;
 } catch (error) {
  console.error("OpenAI 또는 만세력 오류:", error);

  const message =
    error instanceof Error
      ? error.message
      : "알 수 없는 오류가 발생했습니다.";


  const errorResponse: AnalyzeErrorResponse = {
  error: message,
};

return NextResponse.json(
  errorResponse,
  { status: getAnalyzeErrorStatus(error) }
);
}
}