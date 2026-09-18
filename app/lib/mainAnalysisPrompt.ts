import type { MainAnalysisCompactFacts } from "./mainAnalysisCompactFacts.ts";

export type MainAnalysisRecommendationFocus = {
  title: string;
  reason: string;
};

export type BuildMainAnalysisPromptInput = {
  compactFacts: MainAnalysisCompactFacts;
  recommendationFocus?: MainAnalysisRecommendationFocus;
};

function joinLimited(values: readonly string[], limit: number): string {
  return values.length > 0 ? values.slice(0, limit).join(" / ") : "없음";
}

export function buildMainAnalysisPrompt(
  input: BuildMainAnalysisPromptInput
): string {
  const facts = input.compactFacts;
  const recommendationFocus = input.recommendationFocus;

  return [
    "역할: 명리 계산 엔진의 사실을 일반 사용자가 바로 이해하는 짧은 한국어 해석으로 번역하세요.",
    "무료 결과의 목적은 해결책이 아니라 타고난 특성과 현재 핵심 문제를 정확히 인식시키는 것입니다.",
    "제공되지 않은 사실을 만들지 말고, 계산 수치·내부 필드명·영어 단어를 사용자에게 절대 노출하지 마세요.",
    "화면 위쪽에 이미 표시된 원국·오행·신강신약·용신·격국·대운·세운을 그대로 반복하지 말고 생활 언어의 의미로 번역하세요.",
    "전문용어보다 실제 행동과 감정으로 이해되는 문장을 쓰세요. '구조', '배치', '기운', '신호', '작용', '보완' 같은 추상어를 설명의 중심에 두지 마세요.",
    "불안을 과장하거나 결제 압박 문구를 쓰지 마세요. '기회보다 주의가 더 크다'처럼 공포를 키우는 비교도 금지합니다.",
    "해결책을 절대 제시하지 마세요. 행동 지침·선택 결론·구체적 시기 처방은 쓰지 마세요.",
    "전체 출력은 약 260~360자 내외를 목표로 하며, 400자를 넘기지 마세요. 중복 없이 짧게 쓰세요.",
    "출력은 반드시 1) 사주의 특성 2) 한눈에 보는 핵심 순서이며, heading은 정확히 '## 사주의 특성', '## 한눈에 보는 핵심'만 사용하세요.",
    "",
    "ENGINE FACTS",
    `원국: ${facts.yearPillar} ${facts.monthPillar} ${facts.dayPillar} ${facts.hourPillar}`,
    `신강신약: ${facts.strengthLevel} | ${facts.strengthSummary}`,
    `오행: ${facts.elementPercentages.join(" / ")} | ${facts.elementSummary}`,
    `용신: ${facts.yongshinPrimary} / 보조 ${joinLimited(facts.yongshinSecondary, 2)} | ${facts.yongshinReason}`,
    `격국: ${facts.gyeokgukPrimary} | ${facts.gyeokgukReason}`,
    `대운: ${facts.currentDaeun}`,
    `세운: ${facts.currentSeun}`,
    `현재 흐름: ${facts.fortuneFlowSummary}`,
    `활성 관계: ${joinLimited(facts.activeRelations, 3)}`,
    `기회 근거: ${joinLimited(facts.opportunities, 2)}`,
    `주의 근거: ${joinLimited(facts.cautions, 3)}`,
    `분야 가이드: 일/직업=${facts.topicGuides.career} | 돈/재정=${facts.topicGuides.wealth} | 관계=${facts.topicGuides.relationship} | 건강·생활=${facts.topicGuides.health}`,
    ...(recommendationFocus
      ? [
          `후속 연결 기준: ${recommendationFocus.title} | ${recommendationFocus.reason}`,
        ]
      : []),
    "",
    "WRITING RULES",
    "- 사주의 특성은 서로 다른 근거를 최소 3가지 이상 연결해 정확히 2문장으로 씁니다. 사주의 특성에는 현재 대운·세운이나 현재 문제를 넣지 말고 타고난 특성만 설명합니다.",
    "- 사주의 특성은 장점과 취약점을 실제 행동과 감정으로 이해되는 문장으로 끝내며 개선법은 쓰지 않습니다.",
    "- 한눈에 보는 핵심은 정확히 3문장입니다. 직업·재물·관계·건강을 모두 나열하지 않는다. 핵심 문제 1개, 필요하면 보조 문제 1개만 고릅니다.",
    "- 첫 문장은 55자 안팎의 '현재 결론'입니다. '현재의 10년 흐름과 올해 흐름' 같은 계산 설명 대신 사용자가 체감할 수 있는 현재 상황부터 바로 말한다. 아래 설명과 같은 말을 반복하지 않습니다.",
    "- 둘째 문장은 왜 그렇게 보이는지 엔진 근거를 생활 언어로 설명합니다. '일/직업', '돈/재정', '관계', '건강·생활' 중 핵심 분야를 분명히 이름 붙인다.",
    "- 셋째 문장은 핵심 문제에서 아직 답이 필요한 지점을 남깁니다. 일시적인 흔들림인지 앞으로 방향을 바꿀 만큼 이어지는 변화인지처럼 자연스러운 궁금증만 남기고 답은 주지 않습니다.",
    "- '여러 문제가 동시에 움직인다'로 뭉뚱그리지 말고 가장 우선인 문제와 보조 문제의 연결만 짧게 설명합니다.",
    ...(recommendationFocus
      ? [
          "- 후속 연결 기준이 있으면 최우선 문제는 그 주제와 직접 이어지게 하되 상품명·추천 순위·결제·구매 표현은 본문에 쓰지 않습니다.",
        ]
      : []),
    "- 마지막으로 조사·오타·끊긴 문장을 한 번 점검한 뒤 출력하세요.",
  ].join("\n");
}
