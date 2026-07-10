import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { birthDate, birthTime, gender } = await req.json();

    const prompt = `
당신은 대한민국 최고의 사주 명리학 전문가입니다.

다음 정보를 바탕으로 간단한 사주 분석을 해주세요.

생년월일: ${birthDate}
출생시간: ${birthTime}
성별: ${gender}

다음 형식으로 작성해주세요.

1. 성격
2. 재물운
3. 직업운
4. 연애운
5. 올해 운세
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
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}