import OpenAI from "openai";
import { getSaju } from "@/app/lib/manse";
import { NextResponse } from "next/server";
import { buildPrompt } from "@/app/lib/prompt/builder";
import { buildSajuResponse } from "@/app/lib/buildSajuResponse";
import { validateAnalyzeInput } from "@/app/lib/validateAnalyzeInput";
import { getAnalyzeErrorStatus } from "@/app/lib/getAnalyzeErrorStatus";
import { buildFreeAnalysis } from "@/app/lib/buildFreeAnalysis";
import { isPaidAnalysisProductId } from "@/app/lib/paidAnalysisProducts";
import { buildPremiumPrompt } from "@/app/lib/prompt/premiumBuilder";
import { buildPremiumAnalysis } from "@/app/lib/buildPremiumAnalysis";
import { buildAnalysisProductRecommendations } from "@/app/lib/analysisProductRecommendations";
import type {
  AnalyzeRequest,
  AnalyzeSuccessResponse,
  AnalyzeErrorResponse,
} from "@/app/lib/analyzeApiTypes";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  !isPaidAnalysisProductId(productId)
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

    console.log(
      "SAJU_RESULT:",
      JSON.stringify(saju, null, 2)
    );


const promptInput = {
  calendarType,
  isLeapMonth: isLeapMonthBoolean,
  birthDate,
  birthTime,
  gender,
  saju,
};

const modularPrompt =
  productId === undefined
    ? buildPrompt(promptInput)
    : buildPremiumPrompt({
        ...promptInput,
        productId,
      });

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
           content: modularPrompt,
        },
      ],
    });
   
  const recommendationAnalysis = buildPremiumAnalysis(saju);

const productRecommendations =
  buildAnalysisProductRecommendations({
    fortuneBrain: recommendationAnalysis.fortuneBrain,
  });

   const responseData: AnalyzeSuccessResponse = {
  result:
    completion.choices[0].message.content ||
    "AI 분석 결과를 생성하지 못했습니다.",
  saju: buildSajuResponse(saju),
  freeAnalysis: buildFreeAnalysis(saju),
  premiumAnalysis:
  productId === undefined
    ? undefined
    : recommendationAnalysis,
    productRecommendations,
};

return NextResponse.json(responseData);
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