import OpenAI from "openai";
import { getSaju } from "@/app/lib/manse";
import { NextResponse } from "next/server";

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

    const prompt = `
당신은 차분하고 신뢰감 있게 설명하는 한국어 명리 상담가입니다.

아래 출생 정보와 실제 계산된 사주팔자를 바탕으로 참고용 리포트를 작성하세요.

달력 기준: ${calendarType}
윤달 여부: ${calendarType === "음력" ? isLeapMonth : "해당 없음"}
생년월일: ${birthDate}
출생시간: ${birthTime}
성별: ${gender}
양력 변환일: ${saju.solarDate}

실제 계산된 사주팔자:
년주: ${saju.yearPillarHanja}
월주: ${saju.monthPillarHanja}
일주: ${saju.dayPillarHanja}
시주: ${saju.hourPillarHanja}

중요한 원칙:
- 제공된 사주팔자를 근거로 설명하세요.
- 계산되지 않은 용신, 격국, 신강·신약을 확정적으로 단정하지 마세요.
- 미래를 단정하거나 불안을 조장하지 마세요.
- 건강, 투자, 법률에 관한 확정적인 조언은 하지 마세요.
- 각 항목에 실천 가능한 조언을 포함하세요.
- 따뜻하지만 과장되지 않은 문체로 작성하세요.
- 전체 분량은 약 1,000자에서 1,500자로 작성하세요.

다음 순서로 작성하세요.

**한눈에 보는 핵심 요약**

**성격과 강점**

**주의할 성향**

**직업과 일하는 방식**

**재물 관리 성향**

**연애와 인간관계**

**올해를 보내는 실천 조언**

**마지막 한마디**
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return NextResponse.json({
      result:
        completion.choices[0].message.content ||
        "AI 분석 결과를 생성하지 못했습니다.",
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