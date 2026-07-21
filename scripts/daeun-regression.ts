import { calculateDaeun } from "../app/lib/daeun";

const cases = [
  {
    label: "남자 + 양간",
    yearPillar: "갑자",
    monthPillar: "병인",
    gender: "남성" as const,
    expectedDirection: "순행",
  },
  {
    label: "남자 + 음간",
    yearPillar: "을축",
    monthPillar: "정묘",
    gender: "남성" as const,
    expectedDirection: "역행",
  },
  {
    label: "여자 + 양간",
    yearPillar: "갑자",
    monthPillar: "병인",
    gender: "여성" as const,
    expectedDirection: "역행",
  },
  {
    label: "여자 + 음간",
    yearPillar: "을축",
    monthPillar: "정묘",
    gender: "여성" as const,
    expectedDirection: "순행",
  },
];

for (const testCase of cases) {
  const result = calculateDaeun(
  testCase.yearPillar,
  testCase.monthPillar,
  testCase.gender,
  "1990-01-01",
  "12:00",
  5
);

  console.log(`=== ${testCase.label} ===`);
  console.log("방향:", result.direction);
  console.log("예상:", testCase.expectedDirection);
  console.log(
    "대운:",
    result.daeuns.map((item) => item.ganji).join(" → ")
  );
  console.log(
    "방향 일치:",
    result.direction === testCase.expectedDirection
  );
  console.log();
}