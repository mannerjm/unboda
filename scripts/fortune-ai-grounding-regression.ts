import { buildFortunePrompt } from "../app/lib/prompt/fortunePrompt";

const prompt = buildFortunePrompt();

const requiredRules = [
  "primaryActive가 false인 경우",
  "currentFlow, opportunityScore, cautionScore가 제공된 경우",
  "대운·세운의 연도 범위와 시기는 analysis에 실제로 제공된 데이터만 사용하세요",
  "직업·재물·관계·건강 등 분야별 현실 조언은 analysis의 topicGuides에 제공된 내용과 계산 근거가 있는 범위에서만 작성하세요",
  "오행의 강약이나 대운·세운의 변화만을 근거로 사용자의 성격",
  "합·충·형·파·해 관계를 심리 상태나 정신 건강 상태로 직접 해석하지 마세요",
  "용신이나 오행의 활성 여부만을 근거로 사용자의 추진력",
];

for (const rule of requiredRules) {
  if (!prompt.includes(rule)) {
    throw new Error(`필수 AI grounding 규칙이 누락되었습니다: ${rule}`);
  }
}

console.log("AI grounding 필수 규칙 확인: true");
console.log(`검증된 규칙 수: ${requiredRules.length}`);