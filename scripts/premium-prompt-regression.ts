import { getSaju } from "../app/lib/manse";
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

if (!prompt.includes("이번 분석의 핵심 주제는 재물운입니다.")) {
  throw new Error("재물운 상품 Prompt가 포함되지 않았습니다.");
}

if (!prompt.includes("실제 계산된 사주팔자")) {
  throw new Error("기존 입력 Prompt가 포함되지 않았습니다.");
}

if (!prompt.includes("명리학 전문가")) {
  throw new Error("기본 Prompt가 포함되지 않았습니다.");
}

console.log("프리미엄 상품 Prompt 포함: true");
console.log("기존 입력 Prompt 재사용: true");
console.log("기본 Prompt 재사용: true");