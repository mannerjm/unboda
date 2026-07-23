import OpenAI from "openai";
import { getSaju } from "@/app/lib/manse";
import { NextResponse } from "next/server";
import { buildPrompt } from "@/app/lib/prompt/builder";
import { buildSajuResponse } from "@/app/lib/buildSajuResponse";
import { validateAnalyzeInput } from "@/app/lib/validateAnalyzeInput";
import { getAnalyzeErrorStatus } from "@/app/lib/getAnalyzeErrorStatus";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    let body;

try {
  body = await req.json();
} catch {
  return NextResponse.json(
    { error: "요청 데이터가 올바른 JSON 형식이 아닙니다." },
    { status: 400 }
  );
}

const {
  birthDate,
  birthTime,
  calendarType,
  isLeapMonth,
  gender,
} = body;

const validation = validateAnalyzeInput({
  birthDate,
  birthTime,
  calendarType,
  isLeapMonth,
  gender,
});

if (!validation.valid) {
  return NextResponse.json(
    { error: validation.error },
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


const modularPrompt = buildPrompt({
  calendarType,
  isLeapMonth,
  birthDate,
  birthTime,
  gender,
  saju,
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

    return NextResponse.json({
  result:
    completion.choices[0].message.content ||
    "AI 분석 결과를 생성하지 못했습니다.",
  saju: buildSajuResponse(saju),

});
 } catch (error) {
  console.error("OpenAI 또는 만세력 오류:", error);

  const message =
    error instanceof Error
      ? error.message
      : "알 수 없는 오류가 발생했습니다.";


  return NextResponse.json(
    { error: message },
    { status: getAnalyzeErrorStatus(error) }
  );
}
}