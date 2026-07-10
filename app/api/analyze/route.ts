import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { birthDate, birthTime, gender, calendarType } = await req.json();

    const prompt = `
당신은 차분하고 신뢰감 있게 설명하는 한국어 명리 상담가입니다.

아래 출생 정보를 바탕으로 사용자가 이해하기 쉬운 참고용 리포트를 작성하세요.

달력 기준: ${calendarType}
생년월일: ${birthDate}
출생시간: ${birthTime}
성별: ${gender}

중요한 원칙:
- 실제 만세력 원국이 계산되지 않았으므로 천간, 지지, 오행, 십성, 용신을 확정적으로 말하지 마세요.
- 미래를 단정하거나 불안을 조장하지 마세요.
- 건강, 투자, 법률에 관한 확정적 조언은 하지 마세요.
- 누구에게나 적용되는 모호한 말만 반복하지 말고, 각 항목마다 실천 가능한 조언을 포함하세요.
- 따뜻하지만 과장되지 않은 문체로 작성하세요.
- 전체 분량은 약 1,000자에서 1,500자로 작성하세요.

다음 순서로 작성하세요.

1. 한눈에 보는 핵심 요약
2. 성격과 강점
3. 주의할 성향
4. 직업과 일하는 방식
5. 재물 관리 성향
6. 연애와 인간관계
7. 올해를 보내는 실천 조언
8. 마지막 한마디

각 항목은 제목과 본문을 구분하고, 읽기 편하게 줄바꿈하세요.
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
      result: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("OpenAI 오류:", error);

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