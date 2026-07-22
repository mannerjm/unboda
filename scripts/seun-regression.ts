import { calculateSeun } from "../app/lib/seun";

const result = calculateSeun(1987, 2026, "丁", 10);

console.log("세운 결과");
console.log(result.items);

if (result.items[0]?.ganji !== "병오") {
  throw new Error("2026년 세운 간지가 일치하지 않습니다.");
}

if (result.items[0]?.age !== 40) {
  throw new Error("2026년 세는나이가 일치하지 않습니다.");
}

console.log("2026 병오 일치: true");
console.log("2026 나이 40세 일치: true");

const expectedGanji = [
  "병오",
  "정미",
  "무신",
  "기유",
  "경술",
  "신해",
  "임자",
  "계축",
  "갑인",
  "을묘",
];

const actualGanji = result.items.map((item) => item.ganji);

if (actualGanji.join(",") !== expectedGanji.join(",")) {
  throw new Error("2026~2035 세운 간지 회귀 테스트 실패");
}

console.log("2026~2035 세운 간지 일치: true");