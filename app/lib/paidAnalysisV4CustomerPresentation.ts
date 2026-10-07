import type { PaidAnalysisEvidenceKey } from "./paidAnalysisDetailOutput";

const CUSTOMER_EVIDENCE_LABELS: Record<PaidAnalysisEvidenceKey, string> = {
  strength: "신강·신약",
  yongshin: "용신",
  gyeokguk: "격국",
  element_balance: "오행 균형",
  fortune_flow: "현재 운의 흐름",
  daeun: "대운",
  seun: "세운",
  element_relations: "합·충·형·파·해",
  fortune_brain: "강점·취약 구조",
  monthly_cycle: "이번 달 월주·원국 관계",
};

export function getPaidAnalysisEvidenceCustomerLabel(
  key: PaidAnalysisEvidenceKey,
): string {
  return CUSTOMER_EVIDENCE_LABELS[key];
}

function stripUnexplainedScores(value: string): string {
  return value
    .replace(/\s*\(돕는 힘\s*-?\d+(?:\.\d+)?\s*\/\s*누르는 힘\s*-?\d+(?:\.\d+)?\)\s*/gu, " ")
    .replace(/\s*·\s*기회\s*-?\d+(?:\.\d+)?\s*\/\s*주의\s*-?\d+(?:\.\d+)?/gu, "")
    .replace(/\s*\((?:[목화토금수]\s*-?\d+(?:\.\d+)?\s*\/?\s*)+\)\s*$/gu, "")
    .replace(/\b(?:점수|비율|수치|강도)\s*[:：]?\s*-?\d+(?:\.\d+)?\b/gu, "")
    .replace(/-?\d+(?:\.\d+)?\s*%/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+·\s*$/g, "")
    .trim();
}

/**
 * Keeps the real saju basis visible to customers while removing only
 * unexplained internal scores/ratios. Dates, ages, pillars, daeun/seun,
 * ten-god labels and relation types remain because they are actual saju facts.
 */
export function formatPaidAnalysisEvidenceFactForCustomer(
  key: PaidAnalysisEvidenceKey,
  rawFact: string,
): string {
  if (key === "element_balance") {
    return stripUnexplainedScores(rawFact.replace(/\s*\([^)]*\)\s*$/u, ""));
  }

  return stripUnexplainedScores(rawFact);
}
