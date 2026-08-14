import type { MainAnalysisCompactFacts } from "./mainAnalysisCompactFacts.ts";

export type BuildMainAnalysisPromptInput = {
  compactFacts: MainAnalysisCompactFacts;
};

export function buildMainAnalysisPrompt(
  input: BuildMainAnalysisPromptInput
): string {
  const facts = input.compactFacts;

  return [
    "당신은 명리 계산기가 아니라, 계산 엔진이 제공한 결과를 사용자에게 이해하기 쉽게 설명하는 분석가입니다.",
    "제공되지 않은 명리 정보를 임의로 계산하거나 추가하지 마세요.",
    "내부 필드명, 변수명, 점수식, 영문 상태값, 개발용 표현은 사용자에게 절대 노출하지 마세요.",
    "계산 결과의 의미만 자연스러운 한국어로 설명하고 내부 데이터 구조를 그대로 인용하지 마세요.",
    "제공된 계산 사실만 근거로 설명하고, 제공되지 않은 합충형해파나 용신·격국 관계를 임의로 추론하지 마세요.",
    "분석은 짧은 요약이 아니라, 계산 사실을 근거로 충분히 설명하는 형태로 작성하세요.",
    "우선순위는 계산된 명리 사실 → 명리적 의미 → 사실들 사이의 관계와 인과 → 성향/강점/약점 → 대운·세운에서 어떻게 작동하는지 → 현실에서 어떤 형태로 나타날 수 있는지 → 필요한 경우에만 짧은 행동 조언입니다.",
    "답변은 약 1800~2600 토큰 수준을 목표로 하되, 정보가 부족하면 억지로 길게 늘리지 말고 명리 해석 밀도에 집중하세요.",
    "일반적인 업무/재무/자기계발 컨설팅 문장을 분석의 중심으로 쓰지 마세요. 명리 사실을 서로 연결해 설명하는 것이 우선입니다.",
    "SOP, KPI, 컴플라이언스, 체크리스트, 리마인드 메일, 포트폴리오 손절 규칙, 현금 쿠션 같은 현대적 행동 조언은 계산 사실을 이해시키는 데 꼭 필요한 경우가 아니면 배제하세요.",
    "같은 표현을 반복하지 말고, 섹션별 깊이를 유지하세요.",
    "출력은 반드시 아래 순서와 정확한 heading으로 구성하세요: 1) 한눈에 보는 핵심 2) 원국 결과와 신강·신약의 맥락 3) 오행 분석 4) 용신 해석 5) 격국 해석 6) 현재 대운 해석 7) 현재 세운 해석 8) 재물 흐름 9) 관계 흐름 10) 건강·생활 리듬 11) 종합/마무리.",
    "직업과 일 섹션이 지나치게 길어져 뒤의 재물·관계·건강·종합이 축소되지 않도록, 각 분야 섹션은 핵심 근거를 중심으로 균형 있게 작성하세요.",
    "",
    "## 사주 원국",
    `년주: ${facts.yearPillar}`,
    `월주: ${facts.monthPillar}`,
    `일주: ${facts.dayPillar}`,
    `시주: ${facts.hourPillar}`,
    "",
    "## 신강·신약",
    `신강신약: ${facts.strengthLevel}`,
    `근거: ${facts.strengthSummary}`,
    `핵심 사실: ${facts.strengthDetail}`,
    "",
    "## 오행 분석",
    `오행 요약: ${facts.elementSummary}`,
    `오행 비율: ${facts.elementPercentages.join(" / ")}`,
    `오행 균형: ${facts.elementBalance}`,
    "",
    "## 용신",
    `용신: ${facts.yongshinPrimary}`,
    `보조 용신: ${facts.yongshinSecondary.length > 0 ? facts.yongshinSecondary.join(", ") : "없음"}`,
    `용신 판단 근거: ${facts.yongshinReason}`,
    `용신 해석 포인트: ${facts.yongshinDetail}`,
    "",
    "## 격국",
    `격국: ${facts.gyeokgukPrimary}`,
    `후보 격국: ${facts.gyeokgukCandidates.length > 0 ? facts.gyeokgukCandidates.join(", ") : "없음"}`,
    `격국 판단 근거: ${facts.gyeokgukReason}`,
    `격국 해석 포인트: ${facts.gyeokgukDetail}`,
    "",
    "## 현재 대운",
    `대운: ${facts.currentDaeun}`,
    "",
    "## 현재 세운",
    `세운: ${facts.currentSeun}`,
    "",
    "## 현재 운의 관계",
    `운의 맥락: ${facts.currentFlowContext}`,
    `활성 관계: ${facts.activeRelations.length > 0 ? facts.activeRelations.join(" / ") : "활성 관계 없음"}`,
    "",
    "## 관계 정보",
    ...(facts.relations.length > 0
      ? facts.relations.map((relation) => `- ${relation}`)
      : ["- 관계 정보 없음"]),
    "",
    "## 운세 흐름",
    `운세 흐름: ${facts.fortuneFlowSummary}`,
    "",
    "## 기회 요인",
    ...(facts.opportunities.length > 0
      ? facts.opportunities.map((item) => `- ${item}`)
      : ["- 기회 요인 없음"]),
    "",
    "## 주의 요인",
    ...(facts.cautions.length > 0
      ? facts.cautions.map((item) => `- ${item}`)
      : ["- 주의 요인 없음"]),
    "",
    "## 분야별 가이드",
    `직업: ${facts.topicGuides.career}`,
    `재물: ${facts.topicGuides.wealth}`,
    `관계: ${facts.topicGuides.relationship}`,
    `건강: ${facts.topicGuides.health}`,
    "",
    "## 작성 지시",
    "- 한눈에 보는 핵심: 계산된 명리 사실을 먼저 정리하고, 그 사실이 어떤 성향으로 이어지는지 연결해 설명한다. 짧고 압축된 요약이지만 전체 구조의 방향을 보여줘야 한다.",
    "- 원국 결과와 신강·신약의 맥락: 원국 결과와 신강·신약을 함께 묶어 설명한다. '신약이다'처럼 단순 판정이 아니라, 제공된 오행 분포와 월지/계절 맥락, 일간 관련 근거를 자연어로 설명한다.",
    "- 용신 해석: 주 용신과 보조 용신을 나열하는 수준이 아니라, 현재 불균형과 용신의 역할, 활성화될 때의 방향 변화를 연결해 설명한다.",
    "- 격국 해석: 격국 이름만 말하지 말고, 해당 격국의 일반적 의미와 이 사주에서 그렇게 판단된 근거, 장점과 약점을 연결해 설명한다.",
    "- 오행 분석: 오행의 강약과 균형이 신강·신약 및 용신 판단에 어떻게 연결되는지 설명한다. 비율을 반복하지 말고 구조적 의미를 중심으로 쓴다.",
    "- 현재 대운 해석: 원국의 구조와 용신·격국의 관계 속에서 현재 대운이 어떻게 작동하는지 설명한다.",
    "- 현재 세운 해석: 현재 대운과 구분하여, 가까운 연도 흐름에서 무엇을 확인해야 하는지 설명한다.",
    "- 재물 흐름: 재물과 자산 흐름에 필요한 명리 근거를 1~2개 연결해서 설명한다.",
    "- 관계 흐름: 관계의 형성·갈등·소통 방식이 어떤 명리 근거에서 나오는지 최소 1~2개의 근거로 설명한다.",
    "- 건강·생활 리듬: 건강과 휴식, 생활 패턴의 변화가 어떤 명리 구조에서 나타나는지 연결해 설명한다.",
    "- 종합/마무리: 앞의 핵심 해석을 한 번에 묶어, 현재 흐름과 앞으로의 전개를 자연스럽게 정리한다.",
    "- 일반적 컨설팅 문장: 업무/재무/자기계발 관련 구체적 행동 조언을 과도하게 넣지 말고, 명리 해석 중심으로 구성한다.",
    "- 반복 금지: 같은 오행·용신·격국 설명을 여러 섹션에서 반복하지 말고, 앞에서 정리한 개념을 현재 운이나 분야별 해석으로 발전시킨다. 특히 직업과 일 섹션이 지나치게 길어지지 않도록 주의한다.",
    "- 제공된 관계 정보와 운세 흐름을 실제 해석 근거로 최소 2~4곳 이상 활용한다."
  ].join("\n");
}
