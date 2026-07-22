import { analyzeFullFortuneFlow } from "../app/lib/fortuneFlowAnalysis";

const result = analyzeFullFortuneFlow({
  originalPillars: ["병인", "신축", "계유", "계해"],
  daeunGanji: "을사",
  seunGanji: "병오",

  originalElements: {
    목: 1,
    화: 1,
    토: 1,
    금: 2,
    수: 3,
  },

  addedElements: ["목", "화", "화", "화"],

  primaryYongshin: "화",
  secondaryYongshin: ["목", "토"],
});

console.log("=== 통합 운세 흐름 분석 ===");
console.dir(result, { depth: null });

if (!Array.isArray(result.relations)) {
  throw new Error("관계 분석 결과가 없습니다.");
}

if (result.elementFlow.adjusted.화 !== 4) {
  throw new Error("화 오행 증가 계산이 일치하지 않습니다.");
}

if (!result.yongshinFlow.primaryActive) {
  throw new Error("주 용신 활성화가 감지되지 않았습니다.");
}

console.log("관계 분석 생성: true");
console.log("오행 증감 계산: true");
console.log("용신 활성도 계산: true");