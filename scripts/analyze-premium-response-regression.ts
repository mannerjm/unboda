import { getSaju } from "../app/lib/manse";
import { buildPremiumAnalysis } from "../app/lib/buildPremiumAnalysis";
import { buildPremiumPrompt } from "../app/lib/prompt/premiumBuilder";

const saju = getSaju(
  "1987-02-03",
  "22:48",
  "양력",
  "평달",
  "남성"
);

const prompt = buildPremiumPrompt({
  productId: "wealth",
  calendarType: "양력",
  isLeapMonth: false,
  birthDate: "1987-02-03",
  birthTime: "22:48",
  gender: "남성",
  saju,
});

const premiumAnalysis = buildPremiumAnalysis(saju);

if (!prompt.includes("이번 분석의 핵심 주제는 재물운입니다.")) {
  throw new Error("유료 요청에 재물운 Prompt가 포함되지 않았습니다.");
}

if (!premiumAnalysis.fortuneBrain) {
  throw new Error("유료 응답에 fortuneBrain이 없습니다.");
}

if (!premiumAnalysis.daeunAnalysis) {
  throw new Error("유료 응답에 daeunAnalysis가 없습니다.");
}

if (!premiumAnalysis.seunAnalysis) {
  throw new Error("유료 응답에 seunAnalysis가 없습니다.");
}

console.log("유료 상품 Prompt 연결: true");
console.log("유료 공통 분석 데이터 연결: true");
console.log("대운 분석 포함: true");
console.log("세운 분석 포함: true");