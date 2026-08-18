import type { PaidAnalysisEvidenceFacts } from "./paidAnalysisEvidenceFacts";
import type {
  PaidAnalysisDetailOutputV4,
  PaidAnalysisEvidenceItemV4,
  PaidAnalysisEvidenceKey,
  ResolvedPaidAnalysisDetailV4,
  ResolvedPaidAnalysisEvidence,
} from "./paidAnalysisDetailOutput";

/** A report is only publishable when this many evidence items carry a real fact. */
export const MIN_RESOLVED_EVIDENCE_COUNT = 3;

export type PaidAnalysisEvidenceResolution = {
  resolved: ResolvedPaidAnalysisEvidence[];
  unresolvedKeys: PaidAnalysisEvidenceKey[];
};

const EVIDENCE_LABELS: Record<PaidAnalysisEvidenceKey, string> = {
  strength: "일간의 강약",
  yongshin: "보완이 필요한 기운",
  gyeokguk: "격국 구조",
  element_balance: "오행 분포",
  fortune_flow: "현재 운의 흐름",
  daeun: "현재 대운",
  seun: "현재 세운",
  element_relations: "오행 사이의 관계",
  fortune_brain: "강점과 취약 축",
};

function formatStrength(facts: PaidAnalysisEvidenceFacts): string | null {
  const strength = facts.strength;

  if (!strength || !strength.level) {
    return null;
  }

  const dayElement = strength.dayElement ? `일간 ${strength.dayElement}` : "일간";

  return `${dayElement} · ${strength.level} (돕는 힘 ${strength.supportScore} / 누르는 힘 ${strength.opposingScore})`;
}

function formatYongshin(facts: PaidAnalysisEvidenceFacts): string | null {
  const yongshin = facts.yongshin;

  if (!yongshin || !yongshin.primary) {
    return null;
  }

  const secondary =
    yongshin.secondary.length > 0
      ? ` · 보조 ${yongshin.secondary.join("·")}`
      : "";

  return `용신 ${yongshin.primary}${secondary}`;
}

function formatGyeokguk(facts: PaidAnalysisEvidenceFacts): string | null {
  const gyeokguk = facts.gyeokguk;

  if (!gyeokguk || !gyeokguk.primary) {
    return null;
  }

  const candidates =
    gyeokguk.candidates.length > 0
      ? ` (후보 ${gyeokguk.candidates.join("·")})`
      : "";

  return `${gyeokguk.primary}${candidates}`;
}

function formatElementBalance(
  facts: PaidAnalysisEvidenceFacts,
): string | null {
  const balance = facts.elementBalance;

  if (!balance || balance.percentages.length === 0) {
    return null;
  }

  const strongest = balance.strongest.join("·") || "-";
  const weakest = balance.weakest.join("·") || "-";
  const top = balance.percentages
    .slice(0, 3)
    .map((item) => `${item.element} ${item.percentage}`)
    .join(" / ");

  return `가장 강한 기운 ${strongest} · 가장 약한 기운 ${weakest} (${top})`;
}

function formatFortuneFlow(facts: PaidAnalysisEvidenceFacts): string | null {
  const flow = facts.fortuneFlow;

  if (!flow || !flow.currentFlow) {
    return null;
  }

  const relations =
    flow.relations.length > 0
      ? ` · 주요 작용 ${flow.relations
          .map((relation) => `${relation.pair} ${relation.type}`)
          .join(", ")}`
      : "";

  return `현재 흐름 ${flow.currentFlow} · 기회 ${flow.opportunityScore} / 주의 ${flow.cautionScore} · 용신 활성 ${flow.yongshinLevel}${relations}`;
}

function formatDaeun(facts: PaidAnalysisEvidenceFacts): string | null {
  const daeun = facts.daeun;

  if (!daeun || !daeun.ganji) {
    return null;
  }

  return `${daeun.order}번째 대운 ${daeun.ganji} · ${daeun.direction} · 시작 나이 ${daeun.startAge}`;
}

function formatSeun(facts: PaidAnalysisEvidenceFacts): string | null {
  const seun = facts.seun;

  if (!seun || !seun.ganji) {
    return null;
  }

  return `${seun.year}년 세운 ${seun.ganji} · 만 ${seun.age}세`;
}

function formatElementRelations(
  facts: PaidAnalysisEvidenceFacts,
): string | null {
  const relations = facts.elementRelations;

  if (!relations || relations.items.length === 0) {
    return null;
  }

  return relations.items
    .map(
      (item) =>
        `${item.source}→${item.target} ${item.type} (${item.strength})`,
    )
    .join(" / ");
}

function formatFortuneBrain(
  facts: PaidAnalysisEvidenceFacts,
): string | null {
  const brain = facts.fortuneBrain;

  if (!brain || (brain.strengths.length === 0 && brain.weaknesses.length === 0)) {
    return null;
  }

  const strengths = brain.strengths.join(", ") || "-";
  const weaknesses = brain.weaknesses.join(", ") || "-";

  return `구조 ${brain.structure} · 강점 축 ${strengths} · 취약 축 ${weaknesses}`;
}

const EVIDENCE_FORMATTERS: Record<
  PaidAnalysisEvidenceKey,
  (facts: PaidAnalysisEvidenceFacts) => string | null
> = {
  strength: formatStrength,
  yongshin: formatYongshin,
  gyeokguk: formatGyeokguk,
  element_balance: formatElementBalance,
  fortune_flow: formatFortuneFlow,
  daeun: formatDaeun,
  seun: formatSeun,
  element_relations: formatElementRelations,
  fortune_brain: formatFortuneBrain,
};

/** Returns null when the saju engine produced no usable value for that key. */
export function resolvePaidAnalysisEvidenceItem(
  item: PaidAnalysisEvidenceItemV4,
  facts: PaidAnalysisEvidenceFacts,
): ResolvedPaidAnalysisEvidence | null {
  const fact = EVIDENCE_FORMATTERS[item.evidenceKey](facts);

  if (!fact) {
    return null;
  }

  return {
    evidenceKey: item.evidenceKey,
    label: EVIDENCE_LABELS[item.evidenceKey],
    fact,
    meaning: item.meaning,
    linkage: item.linkage,
  };
}

export function resolvePaidAnalysisEvidence(
  items: PaidAnalysisEvidenceItemV4[],
  facts: PaidAnalysisEvidenceFacts,
): PaidAnalysisEvidenceResolution {
  const resolved: ResolvedPaidAnalysisEvidence[] = [];
  const unresolvedKeys: PaidAnalysisEvidenceKey[] = [];

  for (const item of items) {
    const resolvedItem = resolvePaidAnalysisEvidenceItem(item, facts);

    if (resolvedItem) {
      resolved.push(resolvedItem);
    } else {
      unresolvedKeys.push(item.evidenceKey);
    }
  }

  return { resolved, unresolvedKeys };
}

/**
 * Drops evidence the engine cannot back with a real value, and fails the report
 * when too little is left. Fabricated or placeholder facts are never produced.
 */
export function resolvePaidAnalysisDetailV4(
  detail: PaidAnalysisDetailOutputV4,
  facts: PaidAnalysisEvidenceFacts,
): ResolvedPaidAnalysisDetailV4 {
  const { resolved, unresolvedKeys } = resolvePaidAnalysisEvidence(
    detail.evidence,
    facts,
  );

  if (resolved.length < MIN_RESOLVED_EVIDENCE_COUNT) {
    throw new Error(
      `심층 분석 근거를 충분히 확인하지 못했습니다. 확인된 근거 ${resolved.length}개, 확인 실패 ${unresolvedKeys.join(", ")}`,
    );
  }

  return {
    ...detail,
    evidence: resolved,
  };
}
