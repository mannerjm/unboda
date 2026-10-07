import type { PaidAnalysisEvidenceKey } from "./paidAnalysisDetailOutput";

const CUSTOMER_EVIDENCE_LABELS: Record<PaidAnalysisEvidenceKey, string> = {
  strength: "기본 힘의 균형",
  yongshin: "보완이 필요한 방향",
  gyeokguk: "기본 역할 패턴",
  element_balance: "전체 균형",
  fortune_flow: "현재 흐름",
  daeun: "현재의 긴 흐름",
  seun: "올해 흐름",
  element_relations: "서로 돕고 부딪히는 부분",
  fortune_brain: "강점과 부담이 생기는 부분",
  monthly_cycle: "이번 달 흐름",
};

export function getPaidAnalysisEvidenceCustomerLabel(
  key: PaidAnalysisEvidenceKey,
): string {
  return CUSTOMER_EVIDENCE_LABELS[key];
}

function extractYear(value: string): string | null {
  return value.match(/(20\d{2})년/u)?.[1] ?? null;
}

function extractYearMonth(value: string): { year: string; month: string } | null {
  const match = value.match(/(20\d{2})년\s*(\d{1,2})월/u);
  return match ? { year: match[1], month: match[2] } : null;
}

function extractCurrentFlow(value: string): string | null {
  return value.match(/현재 흐름\s*([^·()]+)/u)?.[1]?.trim() || null;
}

/**
 * Customer-safe presentation for deterministic saju evidence.
 * Raw calculations remain available to the engine, but the paid report never
 * exposes unexplained scores, ratios, percentages, or internal calculation indices.
 */
export function formatPaidAnalysisEvidenceFactForCustomer(
  key: PaidAnalysisEvidenceKey,
  rawFact: string,
): string {
  switch (key) {
    case "strength":
      if (rawFact.includes("신약")) {
        return "혼자 밀어붙이기보다 주변의 도움과 보완 조건이 있을 때 더 안정적인 편으로 계산됩니다.";
      }
      if (rawFact.includes("신강")) {
        return "스스로 밀고 가는 힘이 비교적 강한 편으로 계산됩니다.";
      }
      if (rawFact.includes("중화")) {
        return "한쪽으로 크게 치우치지 않은 편으로 계산됩니다.";
      }
      return "기본 힘의 균형을 계산에 반영했습니다.";

    case "yongshin":
      return "부족한 부분을 보완하는 방향이 계산에 반영되었습니다.";

    case "gyeokguk":
      return "일을 받아들이고 처리하는 기본 패턴을 계산에 반영했습니다.";

    case "element_balance":
      return "강하게 드러나는 부분과 부족한 부분의 차이를 계산에 반영했습니다.";

    case "fortune_flow": {
      const flow = extractCurrentFlow(rawFact);
      return flow
        ? `현재 흐름은 ‘${flow}’ 쪽으로 계산되었습니다.`
        : "현재의 기회와 부담이 어느 쪽에 더 실리는지 계산에 반영했습니다.";
    }

    case "daeun":
      return "현재의 긴 흐름과 변화 방향을 계산에 반영했습니다.";

    case "seun": {
      const year = extractYear(rawFact);
      return year
        ? `${year}년의 흐름을 계산에 반영했습니다.`
        : "올해의 흐름을 계산에 반영했습니다.";
    }

    case "element_relations":
      return "서로 돕는 부분과 부딪히는 부분을 함께 계산했습니다.";

    case "fortune_brain":
      return "강하게 작동하는 부분과 부담이 커지는 부분을 함께 계산했습니다.";

    case "monthly_cycle": {
      const period = extractYearMonth(rawFact);
      return period
        ? `${period.year}년 ${period.month}월의 흐름 변화를 계산에 반영했습니다.`
        : "이번 달의 흐름 변화를 계산에 반영했습니다.";
    }
  }
}
