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
  {
  label: "1987-02-03 22:34 남성",
  yearPillar: "병인",
  monthPillar: "신축",
  gender: "남성" as const,
  birthDate: "1987-02-03",
  birthTime: "22:34",
  expectedDirection: "순행",
  expectedStartAge: 1,
  expectedDaeuns: [
    "임인",
    "계묘",
    "갑진",
    "을사",
    "병오",
    "정미",
    "무신",
    "기유",
    "경술",
    "신해",
]},
];

for (const testCase of cases) {
  const result = calculateDaeun(
  testCase.yearPillar,
  testCase.monthPillar,
  testCase.gender,
  testCase.birthDate ?? "1990-01-01",
  testCase.birthTime ?? "12:00",
  10
);
  console.log("시작 나이:", result.startAge);

if (testCase.expectedStartAge !== undefined) {
  console.log(
    "시작 나이 일치:",
    result.startAge === testCase.expectedStartAge
  );
}
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
  if (testCase.expectedDaeuns !== undefined) {
  const actualDaeuns = result.daeuns.map((item) => item.ganji);

  if (actualDaeuns.join(",") !== testCase.expectedDaeuns.join(",")) {
    throw new Error(`${testCase.label} 대운 간지 회귀 테스트 실패`);
  }

  console.log("대운 간지 일치: true");
}

  if (
  result.direction !== testCase.expectedDirection ||
  (
    testCase.expectedStartAge !== undefined &&
    result.startAge !== testCase.expectedStartAge
  )
) {
  throw new Error(`${testCase.label} 대운 회귀 테스트 실패`);
}
  console.log();
}
