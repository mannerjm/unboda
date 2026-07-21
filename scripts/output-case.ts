import { getSaju } from "../app/lib/manse";

const start = new Date("1990-01-01");
const end = new Date("2000-12-31");

let outputCount = 0;

for (
  let date = new Date(start);
  date <= end;
  date.setDate(date.getDate() + 1)
) {
  const birthDate = date.toISOString().slice(0, 10);

  const saju = getSaju(
    birthDate,
    "12:00",
    "양력",
    "평달"
  );

  const result = saju.gyeokgukAnalysis;

 if (
  (result.primary === "식신격" ||
    result.primary === "상관격") &&
  result.reason.includes("직접 투출은 없지만")
) {
    outputCount += 1;

    console.log({
      birthDate,
      primary: result.primary,
      candidates: result.candidates,
      reason: result.reason,
    });
  }
}
console.log("=== 출력 케이스 총 건수 ===");
console.log(outputCount);
