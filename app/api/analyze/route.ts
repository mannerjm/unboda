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

   const prompt = `
${buildBasePrompt()}

${buildFortunePrompt()}

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

신강/신약 분석
판정: ${saju.strengthAnalysis.level}
설명: ${saju.strengthAnalysis.summary}

운보다 엔진 종합 판단

구조:
${saju.fortuneBrain.structure}

핵심 강점:
${saju.fortuneBrain.strengths
  .map((item) => `- ${item}`)
  .join("\n")}

주의할 점:
${saju.fortuneBrain.weaknesses
  .map((item) => `- ${item}`)
  .join("\n")}

실천 권장:
${saju.fortuneBrain.recommendations
  .map((item) => `- ${item}`)
  .join("\n")}

종합 요약:
${saju.fortuneBrain.summary}

오행 비율
목: ${saju.elementAnalysis.percentages["목"]}%
화: ${saju.elementAnalysis.percentages["화"]}%
토: ${saju.elementAnalysis.percentages["토"]}%
금: ${saju.elementAnalysis.percentages["금"]}%
수: ${saju.elementAnalysis.percentages["수"]}%

오행 해석
${saju.elementInterpretation.items
  .map(
    (item) =>
      `- ${item.element}: ${item.level} (${item.description})`
  )
  .join("\n")}

오행 상생·상극 핵심 관계
${saju.elementRelations.highlights
  .map(
    (relation) =>
      `- ${relation.source} → ${relation.target} ` +
      `(${relation.type}, ${relation.strength}) : ` +
      `${relation.description}`
  )
  .join("\n")}

  십성 분석

년간: ${saju.yearTenGod}
월간: ${saju.monthTenGod}
일간: ${saju.dayTenGod}
시간: ${saju.hourTenGod}

지지 십성

년지: ${saju.yearBranchTenGod}
월지: ${saju.monthBranchTenGod}
일지: ${saju.dayBranchTenGod}
시지: ${saju.hourBranchTenGod}

귀인 분석

년주 귀인: ${saju.yearNobles.join(", ") || "없음"}
월주 귀인: ${saju.monthNobles.join(", ") || "없음"}
일주 귀인: ${saju.dayNobles.join(", ") || "없음"}
시주 귀인: ${saju.hourNobles.join(", ") || "없음"}

십이신살

년주: ${saju.yearSpirit || "없음"}
월주: ${saju.monthSpirit || "없음"}
일주: ${saju.daySpirit || "없음"}
시주: ${saju.hourSpirit || "없음"}

작성 원칙

명리 해석 사고 순서

반드시 아래 순서를 지켜 해석하세요.

1. 일간과 월령을 먼저 확인하고 사주의 중심 기운을 설명합니다.

2. 신강·신약 판정을 근거로 전체 구조를 설명합니다.

3. 오행 비율을 확인하여 가장 강한 오행과 가장 약한 오행을 설명합니다.

4. 오행의 상생·상극 관계를 근거로 균형과 불균형을 설명합니다.

5. 십성 구조를 활용하여 성격, 직업 적성, 인간관계를 설명합니다.

6. 귀인과 신살은 보조적인 참고자료로만 활용하며,
핵심 판단의 근거로 사용하지 않습니다.

7. 반드시 계산된 데이터만 근거로 설명하며
근거 없는 단정은 하지 않습니다.

8. 사용자가 이해하기 쉬운 자연스러운 상담 문체로 작성합니다.

- 운보다 엔진 종합 판단을 우선 근거로 사용하되, 그대로 복사하지 말고 자연스러운 상담 문장으로 풀어 설명하세요.
- 사용자는 명리학을 전혀 모른다고 가정하세요.
- 천간, 지지, 오행, 십성 등의 전문용어를 그대로 나열하지 말고 반드시 쉬운 말로 풀어서 설명하세요.
- 불안감을 조장하지 마세요.
- 운명을 단정하지 마세요.
- 희망적인 말만 하지 말고 현실적인 조언도 함께 제공하세요.
- 사용자가 실제 생활에서 바로 실천할 수 있는 조언을 반드시 포함하세요.
- 같은 표현을 반복하지 마세요.
- 모든 문장은 자연스러운 한국어로 작성하세요.
- 반드시 제공된 계산 결과만 근거로 해석하세요.
- 한눈에 보는 핵심에는 신강·신약 판정, 가장 강한 오행, 가장 약한 오행을 반드시 명시하세요.
- 성격과 강점에는 오행 비율을 최소 2개 이상 숫자로 직접 언급하세요.
- 보완하면 좋은 점에는 가장 약한 오행과 그 비율을 반드시 명시하세요.
- 상생·상극 핵심 관계 중 최소 2개를 본문에서 직접 설명하세요.
- 계산 결과에 없는 내용을 임의로 단정하지 마세요.
- "감수성이 풍부합니다"처럼 일반적인 표현만 쓰지 말고, 어떤 계산값에서 나온 판단인지 함께 설명하세요.
- 계산된 수치 자체를 반복해서 설명하지 말고, 그 수치가 실제 사람의 성향과 삶에 어떤 의미인지 해석하세요.
- 오행 비율을 그대로 나열하지 말고 성격, 사고방식, 행동패턴으로 번역해서 설명하세요.
- fortuneBrain.summary를 가장 중요한 판단 기준으로 사용하세요.
- fortuneBrain.strengths는 성격과 강점 설명의 핵심 근거로 활용하세요.
- fortuneBrain.weaknesses는 보완점과 인간관계 설명의 핵심 근거로 활용하세요.
- fortuneBrain.recommendations는 실천 조언과 올해 실천할 내용에 적극 활용하세요.
- 신강/신약, 오행비율, 상생상극은 fortuneBrain 판단을 뒷받침하는 근거로만 사용하세요.
- "수가 강합니다", "금이 약합니다" 같은 표현보다 "생각이 깊다", "결정을 오래 고민한다", "표현력이 부족하다"처럼 실제 사람의 모습으로 설명하세요.
- 같은 내용을 반복하지 말고 각 항목마다 새로운 관점에서 설명하세요.

다음과 같은 표현은 반복하지 마세요.
- 수가 강합니다.
- 목이 약합니다.
- 오행이 균형입니다.
- 금 기운입니다.
- 화 기운입니다.
- 토 기운입니다.

대신 아래처럼 실제 생활 속 모습으로 설명하세요.

예)
"생각을 충분히 한 뒤 움직이는 편입니다."

"결정을 오래 고민하는 경향이 있습니다."

"주변 사람을 배려하지만 자신의 의견은 늦게 말하는 편입니다."

"현실 감각이 뛰어나 계획을 꾸준히 실행합니다."

- 숫자(%, 개수)를 반복해서 인용하지 말고, 반드시 해석으로 바꾸어 설명하세요.

예시

잘못된 예)
수의 비율이 33%입니다.
금의 비율은 9.6%입니다.

좋은 예)
생각을 충분히 정리한 뒤 행동하는 성향입니다.
판단력이 신중하여 중요한 결정을 쉽게 내리지 않습니다.

작성 형식

각 섹션은 서로 다른 전문가의 시각으로 작성하세요.

# 한눈에 보는 핵심
→ 명리 전문가가 전체 사주를 한 문단으로 요약합니다.

# 성격과 강점
→ 심리학자처럼 사고방식, 행동패턴, 강점을 설명합니다.

# 보완하면 좋은 점
→ 인생 코치처럼 현실적으로 개선할 점과 해결 방법을 제안합니다.

# 직업과 일
→ 커리어 컨설턴트처럼 적성과 업무 스타일, 잘 맞는 직무를 설명합니다.

# 재물운
→ 자산관리 전문가처럼 돈을 버는 방식, 소비 습관, 재산관리 성향을 설명합니다.

# 인간관계
→ 상담사처럼 대인관계와 연애, 가족, 조직생활에서의 특징을 설명합니다.

# 올해 실천하면 좋은 것
→ 행동 코치처럼 당장 실천 가능한 행동을 구체적으로 제안합니다.

# 운보다 한마디
→ 따뜻한 멘토처럼 2~4문장으로 진심 어린 응원의 말을 작성합니다.

# 한눈에 보는 핵심

반드시 다음 내용을 포함하세요.
- 신강·신약 판정
- 가장 강한 오행과 비율
- 가장 약한 오행과 비율
- 핵심 상생·상극 관계 1개

# 성격과 강점

오행 비율 숫자를 최소 2개 직접 언급하고,
그 숫자가 성격과 행동에 어떤 영향을 주는지 설명하세요.

# 보완하면 좋은 점

가장 약한 오행과 비율을 직접 언급하고,
일상에서 실천할 수 있는 보완 방법을 설명하세요.

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