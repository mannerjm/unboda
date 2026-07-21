import { getSaju } from "../app/lib/manse";

const start = new Date("1990-01-01");
const end = new Date("2000-12-31");
const testTimes = [
  "00:30",
  "05:30",
  "12:00",
  "17:30",
  "23:30",
];

const counts: Record<string, number> = {};
const suspicious: Array<{
  birthDate: string;
  primary: string;
  candidates: string[];
  reason: string;
}> = [];

for (
  let date = new Date(start);
  date <= end;
  date.setDate(date.getDate() + 1)
) {
  const birthDate = date.toISOString().slice(0, 10);

  for (const birthTime of testTimes) {
    const saju = getSaju(
      birthDate,
      birthTime,
      "양력",
      "평달",
      "남성"
    );

    const result = saju.gyeokgukAnalysis;
    const primary = result.primary || "빈값";

    counts[primary] = (counts[primary] ?? 0) + 1;

    const hasMismatch =
      result.primary !== "격국 미확정" &&
      result.reason.includes("추가 검토가 필요");

    const hasDuplicateCandidate =
      result.candidates.includes(result.primary);

    if (hasMismatch || hasDuplicateCandidate) {
      suspicious.push({
        birthDate: `${birthDate} ${birthTime}`,
        primary: result.primary,
        candidates: result.candidates,
        reason: result.reason,
      });
    }
  }}

console.log("=== 격국 분포 ===");
console.table(counts);

console.log("=== 이상 후보 건수 ===");
console.log(suspicious.length);

if (suspicious.length > 0) {
  console.log("=== 이상 후보 샘플 ===");
  console.dir(suspicious.slice(0, 20), { depth: null });
}