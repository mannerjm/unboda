import {
  buildPaidAnalysisDetailPromptV2,
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