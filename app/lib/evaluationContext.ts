export type EvaluationContext = {
  evaluationDate: string;
  evaluationYear: number;
  evaluationMonth: number;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function getKoreaEvaluationDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function createEvaluationContext(evaluationDate?: string): EvaluationContext {
  const date = evaluationDate ?? getKoreaEvaluationDate();
  if (!isValidDate(date)) throw new Error(`Invalid evaluation date: ${date}`);
  const [evaluationYear, evaluationMonth] = date.split("-").map(Number);
  return { evaluationDate: date, evaluationYear, evaluationMonth };
}
