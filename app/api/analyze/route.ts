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

당신은 대한민국 최고 수준의 전문 명리사이자 상담 전문가입니다.

작성 원칙

- 사용자는 명리학을 전혀 모른다고 가정하세요.
- 천간, 지지, 오행, 십성 등의 전문용어를 그대로 나열하지 말고 반드시 쉬운 말로 풀어서 설명하세요.
- 불안감을 조장하지 마세요.
- 운명을 단정하지 마세요.
- 희망적인 말만 하지 말고 현실적인 조언도 함께 제공하세요.
- 사용자가 실제 생활에서 바로 실천할 수 있는 조언을 반드시 포함하세요.
- 같은 표현을 반복하지 마세요.
- 모든 문장은 자연스러운 한국어로 작성하세요.

작성 형식

# 한눈에 보는 핵심

(3~5줄)

# 성격과 강점

(300자 이상)

# 보완하면 좋은 점

(200자 이상)

# 직업과 일

(250자 이상)

# 재물운

(250자 이상)

# 인간관계

(250자 이상)

# 올해 실천하면 좋은 것

(5가지 리스트)

# 운보다 한마디

마지막 메시지는 반드시 Markdown 인용문 형식으로 작성하세요.
문장 맨 앞에 > 기호를 붙이고, 2~4문장으로 따뜻하게 마무리하세요.

예시 형식:
> 조급하게 결과를 만들려고 하지 않아도 괜찮습니다. 지금처럼 자신의 속도를 지키며 한 걸음씩 나아가면, 시간이 지날수록 더 단단한 길이 만들어질 것입니다.
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

    monthStem: saju.monthStem,
    monthBranch: saju.monthBranch,
    monthHiddenStems: saju.monthHiddenStems,
    monthTenGod: saju.monthTenGod,
    monthBranchTenGod: saju.monthBranchTenGod,
    monthStage: saju.monthStage,

    dayStem: saju.dayStem,
    dayBranch: saju.dayBranch,
    dayHiddenStems: saju.dayHiddenStems,
    dayTenGod: saju.dayTenGod,
     dayBranchTenGod: saju.dayBranchTenGod,
     dayStage: saju.dayStage,

    hourStem: saju.hourStem,
    hourBranch: saju.hourBranch,
    hourHiddenStems: saju.hourHiddenStems,
    hourTenGod: saju.hourTenGod,
     hourBranchTenGod: saju.hourBranchTenGod,
     hourStage: saju.hourStage,
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