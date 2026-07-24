import { getSaju } from "../app/lib/manse";
import { buildFreeAnalysis } from "../app/lib/buildFreeAnalysis";

const saju = getSaju(
  "1987-02-03",
  "22:48",
  "양력",
  "평달",
  "남성"
);

const free = buildFreeAnalysis(saju);

if (!free.solarDate) {
  throw new Error("무료 분석에 solarDate가 없습니다.");
}

if (!free.yearPillarHanja || !free.monthPillarHanja) {
  throw new Error("무료 분석에 사주 원국 정보가 없습니다.");
}

if (!free.elementAnalysis) {
  throw new Error("무료 분석에 오행 분석이 없습니다.");
}

if (!free.strengthAnalysis) {
  throw new Error("무료 분석에 신강·신약 분석이 없습니다.");
}

if (!free.yongshinAnalysis) {
  throw new Error("무료 분석에 용신 요약 데이터가 없습니다.");
}

if (!free.daeunAnalysis) {
  throw new Error("무료 분석에 대운 요약 데이터가 없습니다.");
}

if (!free.seunAnalysis) {
  throw new Error("무료 분석에 세운 요약 데이터가 없습니다.");
}

const freeRecord = free as Record<string, unknown>;

if ("fortuneBrain" in freeRecord) {
  throw new Error("무료 분석에 내부 fortuneBrain 데이터가 노출되었습니다.");
}

if ("elementRelations" in freeRecord) {
  throw new Error("무료 분석에 프리미엄 elementRelations 데이터가 노출되었습니다.");
}

console.log("무료 기본 데이터 포함: true");
console.log("용신/대운/세운 요약 포함: true");
console.log("fortuneBrain 비노출: true");
console.log("elementRelations 비노출: true");