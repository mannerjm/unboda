import {
  buildPaidAnalysisDetailPromptV2,
   buildPaidAnalysisDetailPromptV3,
} from "../app/lib/paidAnalysisDetailPrompt";
2.

const input = {
  analysisType: "재물운 심층 분석",
  birthData: "테스트 출생 정보",
  originalChart: "테스트 원국 상세 구조",
  coreInterpretation: "테스트 오행·강약·용신·격국 핵심 해석",
  fortuneTiming: "테스트 대운·세운·현재 운 시기 정보",
  sajuSummary: "테스트 사주 요약",
  currentFortuneFlow: "테스트 현재 운 흐름",
  userConcern: "이직과 투자 중 무엇을 먼저 선택해야 할지 고민",
};

const prompt = buildPaidAnalysisDetailPromptV2(input);

const promptV3 = buildPaidAnalysisDetailPromptV3(input);

const missingProductIdPrompt = buildPaidAnalysisDetailPromptV2({
  ...input,
  productId: undefined,
});

const unknownProductIdPrompt = buildPaidAnalysisDetailPromptV2({
  ...input,
  productId: "unsupported-product-id",
});

if (!prompt.includes("재물운 심층 분석")) {
  throw new Error("analysisType이 프롬프트에 포함되지 않았습니다.");
}

console.log("paid analysis detail prompt regression passed");

console.log(
  "원국 상세 구조 포함:",
  prompt.includes("원국 상세 구조"),
);

console.log(
  "핵심 해석 포함:",
  prompt.includes("오행·강약·용신·격국 핵심 해석"),
);

console.log(
  "운 시기 정보 포함:",
  prompt.includes("대운·세운·현재 운 시기 정보"),
);

console.log(
  "명리 추론 순서 포함:",
  prompt.includes("명리 추론 순서"),
);

console.log(
  "원국 우선 분석 포함:",
  prompt.includes("명리 추론 순서"),
);

console.log(
  "JSON 최종 출력 규칙 포함:",
  prompt.includes("출력은 반드시 유효한 JSON 하나만 반환하세요"),
);

console.log(
  "리포트 일관성 원칙 포함:",
  prompt.includes("리포트 일관성 원칙"),
);

console.log(
  "중심 결론 유지 규칙 포함:",
  prompt.includes(
    "heroSummary.keyMessage를 리포트 전체의 중심 결론으로 사용한다",
  ),
);

console.log(
  "섹션 간 모순 방지 규칙 포함:",
  prompt.includes("서로 모순되는 내용을 작성하지 않는다"),
);

console.log(
  "기회·주의 조건 구분 규칙 포함:",
  prompt.includes(
    "기회와 주의가 동시에 존재할 경우 각각 어떤 조건에서 해당되는지 구분하여 설명한다",
  ),
);

console.log(
  "공통 Writer 규칙 포함:",
  prompt.includes("분석 종류와 직접 관련된 명리 요소를 우선하여 해석한다."),
);

console.log(
  "불필요한 확장 금지 포함:",
  prompt.includes("분석 종류와 무관한 영역으로 내용을 과도하게 확장하지 않는다."),
);

console.log(
  "실행 방향 제시 포함:",
  prompt.includes("현재 사용자가 판단해야 할 기준과 실천 방향을 구체적으로 제시한다."),
);



const moneyPrompt = buildPaidAnalysisDetailPromptV2({
  ...input,
  analysisType: "재물운 심층 분석",
});

const careerPrompt = buildPaidAnalysisDetailPromptV2({
  ...input,
  analysisType: "직업·사업운 심층 분석",
});

const healthPrompt = buildPaidAnalysisDetailPromptV2({
  ...input,
  analysisType: "건강운 심층 분석",
});

const relationshipPrompt = buildPaidAnalysisDetailPromptV2({
  ...input,
  analysisType: "연애·관계운 심층 분석",
});

console.log(
  "상품별 공통 규칙 적용:",
  moneyPrompt.includes("분석 종류와 직접 관련된 명리 요소를 우선하여 해석한다.") &&
  careerPrompt.includes("분석 종류와 직접 관련된 명리 요소를 우선하여 해석한다.") &&
  healthPrompt.includes("분석 종류와 직접 관련된 명리 요소를 우선하여 해석한다.") &&
  relationshipPrompt.includes("분석 종류와 직접 관련된 명리 요소를 우선하여 해석한다."),
);

console.log(
  "재물운 전용 규칙 포함:",
  moneyPrompt.includes("상품별 분석 규칙 — 재물운"),
);

console.log(
  "직업·사업운 전용 규칙 포함:",
  careerPrompt.includes("상품별 분석 규칙 — 직업·사업운"),
);

console.log(
  "건강운 전용 규칙 포함:",
  healthPrompt.includes("상품별 분석 규칙 — 건강운"),
);

console.log(
  "연애·관계운 전용 규칙 포함:",
  relationshipPrompt.includes("상품별 분석 규칙 — 연애·관계운"),
);

console.log(
  "재물운 섹션 규칙 포함:",
  moneyPrompt.includes(
    "heroSummary는 현재 재물 판단의 핵심을 수입, 지출, 축적, 투자 중 하나의 우선순위로 제시한다",
  ),
);

console.log(
  "재물운 명리 현실 번역 규칙 포함:",
  moneyPrompt.includes("재물 명리 → 현실 언어 번역 규칙"),
);

console.log(
  "재성 단순 재물량 단정 금지 포함:",
  moneyPrompt.includes(
    '재성의 강약을 곧바로 "돈이 많다·적다", "부자가 된다·돈을 잃는다"로 번역하지 않는다',
  ),
);

console.log(
  "합충형해파 단순 손익 단정 금지 포함:",
  moneyPrompt.includes(
    "합은 무조건적인 기회나 이익으로, 충·형·해·파는 무조건적인 손실이나 악재로 단정하지 않는다",
  ),
);

console.log(
  "재물 현실 연결 구조 포함:",
  moneyPrompt.includes(
    '"근거 → 재정적 의미 → 현실에서 확인할 항목 → 판단 또는 행동"',
  ),
);

console.log(
  "미확인 실제 재무정보 추정 금지 포함:",
  moneyPrompt.includes(
    "사용자의 실제 소득, 자산, 부채, 고정비, 계약 조건 등 확인되지 않은 정보는 추정하여 사실처럼 작성하지 않는다",
  ),
);

console.log(
  "임의 재무 숫자 확정 금지 포함:",
  moneyPrompt.includes(
    "실제 재무 정보가 없는 경우 특정 비상금 비율, 투자 비중, 손절 비율, 금액 또는 기간을 개인 맞춤 기준인 것처럼 임의로 확정하지 않는다",
  ),
);

console.log(
  "재물 체크리스트 미확인 사실 전제 금지 포함:",
  moneyPrompt.includes(
    "checklist는 사용자가 이미 어떤 행동을 완료했거나 특정 자산·계약·계좌를 보유하고 있다는 사실을 전제로 작성하지 않는다",
  ),
);

console.log(
  "재물 체크리스트 완료형 금지 규칙 포함:",
  moneyPrompt.includes(
    'checklist 문장은 "확인했다", "작성했다", "개설했다", "적립 중이다", "완료했다" 같은 완료형보다 "확인한다", "정리한다", "비교한다", "기록한다", "점검한다" 같은 실행형으로 작성한다',
  ),
);

console.log(
  "재물 체크리스트 미확인 항목 생성 금지 포함:",
  moneyPrompt.includes(
    "사용자가 제공하지 않은 계약, 투자상품, 비상자금 계좌, 외주·협업, 구독, 보험 등의 존재를 사실처럼 만들어내지 않는다",
  ),
);

console.log(
  "공통 명리→현실 5단계 연결 규칙 포함:",
  moneyPrompt.includes(
    '명리 근거 → 운의 작용 → 현실에서 나타날 수 있는 현상 → 현재 판단 → 행동 방향',
  ),
);

console.log(
  "재물운 심층 연결 규칙 포함:",
  moneyPrompt.includes("재물운 심층 연결 규칙"),
);

console.log(
  "재물 일반 조언 우선 작성 금지 포함:",
  moneyPrompt.includes(
    "일반적인 재무관리 조언을 먼저 제시하지 않는다",
  ),
);

console.log(
  "재물 핵심 문제 우선 선정 포함:",
  moneyPrompt.includes(
    "현금흐름, 지출, 계약, 투자, 축적 중 무엇이 핵심 문제인지 하나를 우선 선정",
  ),
);

console.log(
  "재물 원국·현재 운 구분 포함:",
  moneyPrompt.includes(
    "원국의 구조와 현재 운의 작용을 구분하여 설명한다",
  ),
);

console.log(
  "재물 행동 조언 반복 방지 포함:",
  moneyPrompt.includes(
    "동일한 조언이 여러 섹션에서 반복되지 않도록 각 섹션의 역할을 구분한다",
  ),
);

console.log(
  "재물 개인화 밀도 규칙 포함:",
  moneyPrompt.includes("재물운 개인화 밀도 및 근거 추적 규칙"),
);

console.log(
  "재물 핵심 판단 근거 필수 포함:",
  moneyPrompt.includes(
    "각 핵심 판단은 반드시 실제 입력 데이터에서 확인되는 명리 근거를 최소 1개 이상 사용한다",
  ),
);

console.log(
  "재물 4단계 근거 연결 포함:",
  moneyPrompt.includes(
    '"명리 근거 → 재정적 의미 → 현실에서 확인할 신호 → 행동 방향"',
  ),
);

console.log(
  "재물 미입력 현실 사실 금지 포함:",
  moneyPrompt.includes(
    '"계약이 많다", "투자를 하고 있다", "외주를 진행 중이다", "고정비가 크다"처럼 입력되지 않은 현실 사실을 개인화 근거처럼 사용하지 않는다',
  ),
);

console.log(
  "재물 타임라인 시간 근거 포함:",
  moneyPrompt.includes(
    "futureTimeline의 각 시점은 왜 그 시점에 변화가 나타나는지 대운·세운·합충형해파 또는 입력된 시간 근거와 연결한다",
  ),
);

console.log(
  "재물 시간 단정 금지 포함:",
  moneyPrompt.includes(
    "시간 근거가 충분하지 않으면 특정 월·분기·연도에 변화가 확정되는 것처럼 작성하지 않는다",
  ),
);

console.log(
  "재물 중심 판단 유지 포함:",
  moneyPrompt.includes(
    "보고서 전체에서 최소 하나의 중심 판단을 유지하고, 각 섹션은 그 판단을 새로운 근거 또는 새로운 현실 의미로 확장한다",
  ),
);

console.log(
  "직업·사업운 섹션 규칙 포함:",
  careerPrompt.includes(
    "heroSummary는 현재 직업 판단의 핵심을 유지, 이동, 승진, 사업 확장 중 하나의 우선순위로 제시한다",
  ),
);

console.log(
  "건강운 섹션 규칙 포함:",
  healthPrompt.includes(
    "heroSummary는 현재 건강 판단의 핵심을 회복, 유지, 과로 조절, 생활 리듬 재정비 중 하나의 우선순위로 제시한다",
  ),
);

console.log(
  "연애·관계운 섹션 규칙 포함:",
  relationshipPrompt.includes(
    "heroSummary는 현재 관계 판단의 핵심을 유지, 조정, 거리 두기, 확장 중 하나의 우선순위로 제시한다",
  ),
);

console.log(
  "decisionAnchor 출력 구조 포함:",
  prompt.includes('"decisionAnchor": {'),
);

console.log(
  "decisionAnchor direction 규칙 포함:",
  prompt.includes(
    'direction은 반드시 "확대", "유지", "조정", "보류" 중 하나만 사용한다',
  ),
);

console.log(
  "decisionAnchor 중심 판단 규칙 포함:",
  prompt.includes(
    "decisionAnchor를 먼저 확정한 뒤 모든 섹션을 작성하며",
  ),
);

if (!prompt.includes('"decisionAnchor": {')) {
  throw new Error("decisionAnchor JSON 출력 구조가 프롬프트에 없습니다.");
}

if (
  !prompt.includes(
    'direction은 반드시 "확대", "유지", "조정", "보류" 중 하나만 사용한다',
  )
) {
  throw new Error("decisionAnchor direction 작성 규칙이 없습니다.");
}

if (
  !prompt.includes(
    "decisionAnchor를 먼저 확정한 뒤 모든 섹션을 작성하며",
  )
) {
  throw new Error("decisionAnchor 중심 판단 규칙이 없습니다.");
}

console.log("paid analysis decisionAnchor prompt regression passed");

console.log(
  "건강운 안전 규칙 포함:",
  healthPrompt.includes("건강운 안전 작성 규칙:"),
);

console.log(
  "의학적 진단 금지 규칙 포함:",
  healthPrompt.includes(
    "명리 해석을 의학적 진단, 질병 판정, 치료 지시처럼 작성하지 않는다",
  ),
);

console.log(
  "의료 진단 아님 전제 포함:",
  healthPrompt.includes(
    "명리 해석에 따른 생활 리듬 참고 정보이며 의료 진단이 아니다",
  ),
);

if (!healthPrompt.includes("건강운 안전 작성 규칙:")) {
  throw new Error("건강운 안전 작성 규칙이 프롬프트에 없습니다.");
}

if (
  !healthPrompt.includes(
    "명리 해석을 의학적 진단, 질병 판정, 치료 지시처럼 작성하지 않는다",
  )
) {
  throw new Error("의학적 진단 금지 규칙이 없습니다.");
}

if (
  !healthPrompt.includes(
    "명리 해석에 따른 생활 리듬 참고 정보이며 의료 진단이 아니다",
  )
) {
  throw new Error("건강운 의료 진단 아님 전제가 없습니다.");
}

console.log("paid analysis health safety prompt regression passed");

console.log(
  "V3 aiInsight 출력 구조 포함:",
  promptV3.includes('"aiInsight": {'),
);

console.log(
  "V3 pastPattern 출력 구조 포함:",
  promptV3.includes('"pastPattern": {'),
);

console.log(
  "V3 currentCoreProblem 출력 구조 포함:",
  promptV3.includes('"currentCoreProblem": {'),
);

console.log(
  "V3 confidence 출력 구조 포함:",
  promptV3.includes('"confidence": {'),
);

console.log(
  "V3 과거 사건 단정 금지 규칙 포함:",
  promptV3.includes("절대로 임의로 만들어내지 않는다."),
);

console.log(
  "V3 confidence 확률 아님 규칙 포함:",
  promptV3.includes("예언 성공 확률이 아니다."),
);

console.log(
  "V3 중심 결론 일관성 규칙 포함:",
  promptV3.includes(
    "heroSummary.keyMessage, aiInsight, currentCoreProblem, decisionAnchor는 같은 중심 결론을 유지한다",
  ),
);

if (!promptV3.includes('"aiInsight": {')) {
  throw new Error("V3 프롬프트에 aiInsight 출력 구조가 없습니다.");
}

if (!promptV3.includes('"pastPattern": {')) {
  throw new Error("V3 프롬프트에 pastPattern 출력 구조가 없습니다.");
}

if (!promptV3.includes('"currentCoreProblem": {')) {
  throw new Error("V3 프롬프트에 currentCoreProblem 출력 구조가 없습니다.");
}

if (!promptV3.includes('"confidence": {')) {
  throw new Error("V3 프롬프트에 confidence 출력 구조가 없습니다.");
}

if (
  !promptV3.includes("절대로 임의로 만들어내지 않는다.")
) {
  throw new Error("V3 프롬프트에 과거 사건 단정 금지 규칙이 없습니다.");
}

if (
  !promptV3.includes("예언 성공 확률이 아니다.")
) {
  throw new Error("V3 프롬프트에 confidence 의미 규칙이 없습니다.");
}

if (
  !promptV3.includes(
    "heroSummary.keyMessage, aiInsight, currentCoreProblem, decisionAnchor는 같은 중심 결론을 유지한다",
  )
) {
  throw new Error("V3 프롬프트에 중심 결론 일관성 규칙이 없습니다.");
}

console.log("paid analysis detail prompt V3 regression passed");

console.log(
  "wealth 상품 ID 포함:",
  promptV3.includes("상품 ID:\nwealth"),
);

console.log(
  "wealth 상품 Plugin 포함:",
  promptV3.includes("상품 Plugin:\nMONEY"),
);

console.log(
  "wealth 핵심 분석 초점 포함:",
  promptV3.includes("핵심 분석 초점:"),
);

console.log(
  "wealth 기대 결과 포함:",
  promptV3.includes("사용자가 얻어야 하는 결과:"),
);

console.log(
  "wealth 재물 분석 초점 실제 내용 포함:",
  promptV3.includes("재성의 강약과 실제 작용"),
);

console.log(
  "wealth 기대 결과 실제 내용 포함:",
  promptV3.includes("현재 재물 문제의 핵심 원인 이해"),
);

if (!promptV3.includes("상품 ID:\nwealth")) {
  throw new Error("V3 프롬프트에 wealth 상품 ID가 포함되지 않았습니다.");
}

if (!promptV3.includes("상품 Plugin:\nMONEY")) {
  throw new Error("V3 프롬프트에 wealth MONEY Plugin이 포함되지 않았습니다.");
}

if (!promptV3.includes("핵심 분석 초점:")) {
  throw new Error("V3 프롬프트에 상품 분석 초점 영역이 없습니다.");
}

if (!promptV3.includes("사용자가 얻어야 하는 결과:")) {
  throw new Error("V3 프롬프트에 상품 기대 결과 영역이 없습니다.");
}

if (!promptV3.includes("재성의 강약과 실제 작용")) {
  throw new Error("V3 프롬프트에 wealth 분석 초점 실제 내용이 없습니다.");
}

if (!promptV3.includes("현재 재물 문제의 핵심 원인 이해")) {
  throw new Error("V3 프롬프트에 wealth 기대 결과 실제 내용이 없습니다.");
}

if (!missingProductIdPrompt.includes("이 상품이 추천되는 사용자:")) {
  throw new Error("missing productId fallback did not include legacy compatibility metadata.");
}

if (!unknownProductIdPrompt.includes("이 상품이 추천되는 사용자:")) {
  throw new Error("unknown productId fallback did not include legacy compatibility metadata.");
}

console.log("missing and unknown productId fallback prompt regression passed");
console.log("wealth product context prompt regression passed");