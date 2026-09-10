import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/app/lib/ai/openAIClient";

type ComparisonKind = "recommendation" | "paid" | "consulting";

const CASES: Record<ComparisonKind, { models: readonly [string, string]; maxOutputTokens: number; prompt: string }> = {
  recommendation: {
    models: ["gpt-5", "gpt-5.6-luna"],
    maxOutputTokens: 900,
    prompt: `당신은 운보다의 무료 사주 결과 뒤에 붙는 심층분석 추천 설명 작성기다.\n\n[합성 테스트 데이터]\n- 현재 무료 분석 핵심: 책임과 활동이 한 시기에 겹치면 우선순위가 흐려지는 경향을 점검해야 한다.\n- 추천 상품 3개: 직업 변화 판단, 재물 누수 점검, 현재 관계 지속성 조정.\n\n[작성 규칙]\n- 한국어 450~650자.\n- 확정적 미래 예언, 질병/투자 지시 금지.\n- 각 추천이 왜 현재 무료 분석과 연결되는지 1~2문장으로 설명한다.\n- 사용자가 실제로 확인할 수 있는 기준을 포함한다.\n- 과장된 마케팅 문구를 쓰지 않는다.`,
  },
  paid: {
    models: ["gpt-5", "gpt-5.6-sol"],
    maxOutputTokens: 2200,
    prompt: `당신은 운보다의 유료 심층분석 리포트 생성기다. 아래 합성 명리 근거만 사용해 JSON만 출력하라.\n\n[합성 근거]\n- 분석 주제: 직업 변화 판단\n- 현재 신호: 책임 증가, 기존 역할 유지 압력, 새 역할 탐색 신호가 동시에 존재\n- 강점: 구조화, 반복 업무 개선\n- 주의점: 성급한 단절보다 조건 비교가 중요\n- 시간 흐름: 현재 1~2개월은 비교·정리, 이후 3~6개월은 선택 기준 구체화\n\n[금지]\n- 실제 사건을 지어내지 말 것\n- 특정 날짜에 이직이 성공한다고 단정하지 말 것\n- 법률·재정 조언으로 확장하지 말 것\n\n[JSON 스키마]\n{\n  \"heroSummary\": \"120~220자 요약\",\n  \"pastPattern\": { \"summary\": \"과거 패턴을 사실처럼 단정하지 않는 조건부 설명\" },\n  \"currentCoreProblem\": { \"title\": \"제목\", \"description\": \"현재 핵심 문제\", \"whyItMatters\": \"왜 중요한지\" },\n  \"futureTimeline\": [\n    { \"period\": \"현재~2개월\", \"title\": \"제목\", \"description\": \"설명\" },\n    { \"period\": \"3~6개월\", \"title\": \"제목\", \"description\": \"설명\" }\n  ],\n  \"actionGuide\": [\"행동1\", \"행동2\", \"행동3\"],\n  \"avoidGuide\": [\"피할 행동1\", \"피할 행동2\"],\n  \"checklist\": [\"확인1\", \"확인2\", \"확인3\", \"확인4\", \"확인5\"]\n}\n\n반드시 유효한 JSON 객체 하나만 출력하라.`,
  },
  consulting: {
    models: ["gpt-5", "gpt-5.6-terra"],
    maxOutputTokens: 1200,
    prompt: `당신은 운보다의 유료 AI 명리 상담 답변기다. 아래 구매 분석과 현재 질문만 근거로 답하라.\n\n[구매 분석 요약]\n- 상품: 직업 변화 판단\n- 핵심: 즉시 단절보다 현재 책임, 새 역할 조건, 생활 부담을 비교해 기준을 좁히는 것이 중요하다.\n- 흐름: 가까운 기간에는 정보 수집과 조건 비교가 우선이고, 이후 선택 기준을 구체화한다.\n\n[현재 질문]\n\"지금 회사가 너무 답답한데 그냥 이번 달에 바로 그만두는 게 맞을까요?\"\n\n[규칙]\n- 한국어 500~800자.\n- 구매 분석 범위를 넘지 않는다.\n- 확정적 미래 예언이나 퇴사를 직접 지시하지 않는다.\n- 반드시 다음 네 제목을 순서대로 포함한다.\n1. 확인된 사용자 사실\n2. 운보다 명리 해석\n3. AI 상담 해석\n4. 지금 확인할 점\n- 확인된 사실은 현재 질문에서 직접 말한 것만 쓴다.\n- 마지막에는 실제로 확인 가능한 관찰 기준 1~2개만 제시한다.`,
  },
};

function isComparisonKind(value: string | null): value is ComparisonKind {
  return value === "recommendation" || value === "paid" || value === "consulting";
}

async function runModel(model: string, prompt: string, maxOutputTokens: number) {
  const startedAt = Date.now();
  const response = await getOpenAIClient().responses.create({
    model,
    input: prompt,
    max_output_tokens: maxOutputTokens,
    reasoning: { effort: "low" },
  });

  return {
    model,
    status: response.status,
    durationMs: Date.now() - startedAt,
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
    reasoningTokens: response.usage?.output_tokens_details?.reasoning_tokens ?? null,
    text: (response.output_text ?? "").trim(),
  };
}

export async function GET(request: NextRequest) {
  if (
    process.env.VERCEL_ENV !== "preview"
    || process.env.VERCEL_GIT_COMMIT_REF !== "test/model-tier-comparison"
  ) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const kind = request.nextUrl.searchParams.get("kind");
  if (!isComparisonKind(kind)) {
    return NextResponse.json({ error: "kind must be recommendation, paid, or consulting" }, { status: 400 });
  }

  const testCase = CASES[kind];
  const settled = await Promise.allSettled(
    testCase.models.map((model) => runModel(model, testCase.prompt, testCase.maxOutputTokens)),
  );

  const results = settled.map((entry, index) => {
    if (entry.status === "fulfilled") return entry.value;
    const error = entry.reason instanceof Error ? entry.reason.message : "unknown_error";
    return { model: testCase.models[index], error };
  });

  return NextResponse.json({
    kind,
    syntheticDataOnly: true,
    results,
  });
}
