import { buildPrompt } from "../app/lib/prompt/builder";
import { getSaju } from "../app/lib/manse";

const input = {
  birthDate: "1987-02-03",
  birthTime: "22:48",
  calendarType: "양력",
  isLeapMonth: "평달",
  gender: "남성",
} as const;

const saju = getSaju(
  input.birthDate,
  input.birthTime,
  input.calendarType,
  input.isLeapMonth,
  input.gender
);

const prompt = buildPrompt({
  calendarType: input.calendarType,
  isLeapMonth: false,
  birthDate: input.birthDate,
  birthTime: input.birthTime,
  gender: input.gender,
  saju,
});

if (!saju) {
  throw new Error("사주 계산 결과가 없습니다.");
}

if (!saju.fortuneFlowAnalysis) {
  throw new Error("fortuneFlowAnalysis가 API 입력 데이터에 포함되지 않았습니다.");
}

if (!prompt.includes("통합 운세 흐름 분석")) {
  throw new Error("프롬프트에 통합 운세 흐름 분석이 포함되지 않았습니다.");
}

if (!prompt.includes("topicGuides")) {
  throw new Error("프롬프트에 topicGuides가 포함되지 않았습니다.");
}

if (!prompt.includes("primaryActive")) {
  throw new Error("프롬프트에 용신 활성 상태가 포함되지 않았습니다.");
}

console.log("API 계산 데이터 생성: true");
console.log("통합 운세 흐름 연결: true");
console.log("topicGuides 전달: true");
console.log("용신 활성 상태 전달: true");
console.log("프롬프트 생성 길이:", prompt.length);