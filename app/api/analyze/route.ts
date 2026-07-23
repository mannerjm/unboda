import OpenAI from "openai";
import { getSaju } from "@/app/lib/manse";
import { NextResponse } from "next/server";
import { buildPrompt } from "@/app/lib/prompt/builder";
import { buildSajuResponse } from "@/app/lib/buildSajuResponse";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const {
  birthDate,
  birthTime,
  calendarType,
  isLeapMonth,
  gender,
} = await req.json();

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
      { status: 500 }
    );
  }
}