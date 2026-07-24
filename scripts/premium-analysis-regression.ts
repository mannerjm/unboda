import { getSaju } from "../app/lib/manse";
import { buildPremiumAnalysis } from "../app/lib/buildPremiumAnalysis";

const saju = getSaju(
  "1987-02-03",
  "22:48",
  "양력",
  "평달",
  "남성"
);

const premium = buildPremiumAnalysis(saju);

if (!premium.elementRelations) {
  throw new Error("프리미엄 분석에 elementRelations가 없습니다.");
}

if (!premium.fortuneBrain) {
  throw new Error("프리미엄 분석에 fortuneBrain이 없습니다.");
}

if (!premium.daeunAnalysis) {
  throw new Error("프리미엄 분석에 대운 분석이 없습니다.");
}

if (!premium.seunAnalysis) {
  throw new Error("프리미엄 분석에 세운 분석이 없습니다.");
}

if (!premium.yongshinAnalysis) {
  throw new Error("프리미엄 분석에 용신 분석이 없습니다.");
}

if (!premium.gyeokgukAnalysis) {
  throw new Error("프리미엄 분석에 격국 분석이 없습니다.");
}

console.log("프리미엄 관계 분석 포함: true");
console.log("fortuneBrain 포함: true");
console.log("대운/세운 심층 데이터 포함: true");
console.log("용신/격국 심층 데이터 포함: true");