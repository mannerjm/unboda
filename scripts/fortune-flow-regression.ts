import { analyzeFortuneFlow } from "../app/lib/fortuneFlow";

const result = analyzeFortuneFlow({
  originalPillars: ["병인", "신축", "계유", "계해"],
  daeunGanji: "을사",
  seunGanji: "병오",
});

console.log("운세 흐름 분석 결과");
console.log(JSON.stringify(result, null, 2));

if (!Array.isArray(result.relations)) {
  throw new Error("relations가 배열이 아닙니다.");
}

console.log("관계 분석 배열 생성: true");
console.log("발견된 관계 수:", result.relations.length);