import OpenAI from "openai";
import { getSaju } from "@/app/lib/manse";
import { NextResponse } from "next/server";
import { buildBasePrompt } from "@/app/lib/prompt/basePrompt";
import { buildFortunePrompt } from "@/app/lib/prompt/fortunePrompt";
import { buildPrompt } from "@/app/lib/prompt/builder";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const {
      birthDate,
      birthTime,
      gender,
      calendarType,
      isLeapMonth,
    } = await req.json();

    const saju = getSaju(
      birthDate,
      birthTime,
      calendarType,
      isLeapMonth
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
  saju: {
    solarDate: saju.solarDate,

    yearPillarHanja: saju.yearPillarHanja,
    monthPillarHanja: saju.monthPillarHanja,
    dayPillarHanja: saju.dayPillarHanja,
    hourPillarHanja: saju.hourPillarHanja,

    yearStem: saju.yearStem,
    yearBranch: saju.yearBranch,
    yearHiddenStems: saju.yearHiddenStems,
    yearTenGod: saju.yearTenGod,
    yearBranchTenGod: saju.yearBranchTenGod,
    yearStage: saju.yearStage,
    yearSpirit: saju.yearSpirit,
    yearNoble: saju.yearNoble,
    yearNobles: saju.yearNobles,

    monthStem: saju.monthStem,
    monthBranch: saju.monthBranch,
    monthHiddenStems: saju.monthHiddenStems,
    monthTenGod: saju.monthTenGod,
    monthBranchTenGod: saju.monthBranchTenGod,
    monthStage: saju.monthStage,
    monthSpirit: saju.monthSpirit,
    monthNoble: saju.monthNoble,
    monthNobles: saju.monthNobles,

    dayStem: saju.dayStem,
    dayBranch: saju.dayBranch,
    dayHiddenStems: saju.dayHiddenStems,
    dayTenGod: saju.dayTenGod,
     dayBranchTenGod: saju.dayBranchTenGod,
     dayStage: saju.dayStage,
     daySpirit: saju.daySpirit,
     dayNoble: saju.dayNoble,
     dayNobles: saju.dayNobles,

    hourStem: saju.hourStem,
    hourBranch: saju.hourBranch,
    hourHiddenStems: saju.hourHiddenStems,
    hourTenGod: saju.hourTenGod,
     hourBranchTenGod: saju.hourBranchTenGod,
     hourStage: saju.hourStage,
     hourSpirit: saju.hourSpirit,
     hourNoble: saju.hourNoble,
     hourNobles: saju.hourNobles,

     elementAnalysis: saju.elementAnalysis,
strengthAnalysis: saju.strengthAnalysis,
elementInterpretation: saju.elementInterpretation,
elementRelations: saju.elementRelations,
yongshinAnalysis: saju.yongshinAnalysis,
fortuneBrain: saju.fortuneBrain,
  },
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