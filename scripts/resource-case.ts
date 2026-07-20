import { getSaju } from "../app/lib/manse";

const start = new Date("1990-01-01");
const end = new Date("1995-12-31");

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
    (result.primary === "정인격" || result.primary === "편인격") &&
    result.reason.includes("직접 투출은 없지만")
  ) {
    console.log({
      birthDate,
      primary: result.primary,
      candidates: result.candidates,
      reason: result.reason,
    });
  }
}