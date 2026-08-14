
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
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import {
  claimFreeAnalysisResult,
  completeFreeAnalysisResult,
  failFreeAnalysisResult,
  type FreeAnalysisResultRecord,
} from "@/app/lib/freeAnalysisResults/server";
export async function POST(req: Request) {
  let claimedFreeResult: FreeAnalysisResultRecord | null = null;

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

    let {
      birthDate,
      birthTime,
      calendarType,
      isLeapMonth,
      gender,
      productId,
    } = body;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    if (!isProfileId(body.profileId)) return NextResponse.json({ error: "유효한 프로필을 선택해 주세요." }, { status: 400 });
    const profile = await getUserProfile(body.profileId, user.id);
    if (!profile) return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
    birthDate = profile.birthDate;
    birthTime = profile.birthTime;
    calendarType = profile.calendarType;
    isLeapMonth = profile.isLeapMonth ? "윤달" : "평달";
    gender = profile.gender;

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

const resolvedBirthDate = birthDate as string;
const resolvedBirthTime = birthTime as string;
const resolvedCalendarType = calendarType as "양력" | "음력";
const resolvedIsLeapMonth = isLeapMonth as "평달" | "윤달";
const resolvedGender = gender as "남성" | "여성";
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

if (productId === undefined) {
  const claim = await claimFreeAnalysisResult({ userId: user.id, profile });

  if (claim.state === "completed" && claim.record.content) {
    return NextResponse.json(claim.record.content);
  }

  if (claim.state === "generating") {
    return NextResponse.json({ status: "generating" }, { status: 202 });
  }

  claimedFreeResult = claim.record;
}

const saju = getSaju(
  resolvedBirthDate,
  resolvedBirthTime,
  resolvedCalendarType,
  resolvedIsLeapMonth,
  resolvedGender,
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
    elementAnalysis: recommendationAnalysis.elementAnalysis,
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
  profile: {
    id: profile.id,
    birthDate: profile.birthDate,
    birthTime: profile.birthTime,
    gender: profile.gender,
    calendarType: profile.calendarType,
    isLeapMonth: profile.isLeapMonth,
  },
  freeAnalysis,
  premiumAnalysis:
  productId === undefined
    ? undefined
    : recommendationAnalysis,
    productRecommendations,
    recommendationExplanation: generatedRecommendation,
};

if (claimedFreeResult) {
  await completeFreeAnalysisResult({
    record: claimedFreeResult,
    content: responseData,
  });
}

const response = NextResponse.json(responseData);

return response;
 } catch (error) {
  if (claimedFreeResult) {
    try {
      await failFreeAnalysisResult({
        record: claimedFreeResult,
        errorCode: "free-analysis-generation-failed",
      });
    } catch (persistError) {
      console.error("[free-analysis-results] fail status update failed", persistError);
    }
  }

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