import type { ReferencePeriodSnapshot } from "./analysisReferencePeriod";
import type { PeriodAnalysisBlock } from "./analysisPeriodOutput";

export type PaidAnalysisDetailOutput = {
  headline: string;
  whyThisAnalysis: string;
  currentFlow: string;
  questionsAnswered: string[];
  expectedBenefits: string[];
  whyNow: string;
  ctaMessage: string;
};

export type PaidAnalysisTimelineItem = {
  period: string;
  title: string;
  description: string;
};

export type PaidAnalysisStructureItem = {
  label: string;
  value: string;
  interpretation: string;
};

export type PaidAnalysisRecommendation = {
  productId: string;
  title: string;
  reason: string;
};

export type PaidAnalysisDetailOutputV2 = {
  heroSummary: {
    headline: string;
    subheadline: string;
    keyMessage: string;
  };

  decisionAnchor: {
    direction: "확대" | "유지" | "조정" | "보류";
    focus: string;
    rationale: string;
  };

  causeAnalysis: {
    summary: string;
    reasons: string[];
  };

  fortuneStructure: {
    summary: string;
    items: PaidAnalysisStructureItem[];
  };

  currentSituation: {
    summary: string;
    opportunities: string[];
    cautions: string[];
  };

  futureTimeline: PaidAnalysisTimelineItem[];

  actionGuide: string[];

  avoidGuide: string[];

  coachMessage: {
    title: string;
    message: string;
  };

  checklist: string[];

  recommendations: PaidAnalysisRecommendation[];
};

export type PaidAnalysisDetailOutputV3 =
  PaidAnalysisDetailOutputV2 & {
    /** Only present for PERIOD products; frozen when the report is generated. */
    referencePeriod?: ReferencePeriodSnapshot;

    /** Only present for PERIOD products; structured per-segment result. */
    periodAnalysis?: PeriodAnalysisBlock;

    aiInsight: {
      headline: string;
      explanation: string;
    };

    pastPattern: {
      summary: string;
      periods: {
        period: string;
        pattern: string;
        verificationQuestion: string;
      }[];
    };

    currentCoreProblem: {
      title: string;
      description: string;
      whyItMatters: string;
    };

    confidence: {
      level: "높음" | "중간" | "낮음";
      strongestEvidence: string[];
      uncertaintyFactors: string[];
      limitations: string;
    };
  };

/** Discriminator stored inside paid_reports.content so V3 rows stay readable. */
export const PAID_ANALYSIS_DETAIL_SCHEMA_VERSION_V4 = "v4";

export type PaidAnalysisDecisionDirection =
  | "확대"
  | "유지"
  | "조정"
  | "보류";

/**
 * Evidence the model may cite. Every key must have a deterministic resolver in
 * paidAnalysisEvidenceResolver; the model never supplies the observed value itself.
 */
export type PaidAnalysisEvidenceKey =
  | "strength"
  | "yongshin"
  | "gyeokguk"
  | "element_balance"
  | "fortune_flow"
  | "daeun"
  | "seun"
  | "element_relations"
  | "fortune_brain";

/** The model supplies interpretation only; the server resolves the observed fact. */
export type PaidAnalysisEvidenceItemV4 = {
  evidenceKey: PaidAnalysisEvidenceKey;
  meaning: string;
  linkage: string;
};

export type PaidAnalysisCauseReasonV4 = {
  title: string;
  observedStructure: string;
  realWorldPattern: string;
  problemLinkage: string;
};

export type PaidAnalysisSituationItemV4 = {
  situation: string;
  implication: string;
  observableSignal: string;
};

export type PaidAnalysisTimelineItemV4 = {
  label: string;
  changeSignal: string;
  preparation: string;
};

export type PaidAnalysisActionItemV4 = {
  action: string;
  target: string;
  condition: string;
  completionCriteria: string;
};

export type PaidAnalysisAvoidType =
  | "misjudgment"
  | "risky_action"
  | "bad_condition";

export type PaidAnalysisAvoidItemV4 = {
  type: PaidAnalysisAvoidType;
  behavior: string;
  reason: string;
};

/** Server-assigned; never requested from the model. */
export type PaidAnalysisTimelineSource =
  | "topic-relative"
  | "period-year"
  | "period-daeun"
  | "lifetime";

export type PaidAnalysisDetailOutputV4 = {
  schemaVersion: typeof PAID_ANALYSIS_DETAIL_SCHEMA_VERSION_V4;

  conclusion: {
    headline: string;
    direction: PaidAnalysisDecisionDirection;
    focus: string;
    rationale: string;
    immediateAction: string;
  };

  coreProblem: {
    title: string;
    description: string;
    whyItMatters: string;
  };

  cause: {
    summary: string;
    reasons: PaidAnalysisCauseReasonV4[];
  };

  evidence: PaidAnalysisEvidenceItemV4[];

  current: {
    summary: string;
    opportunities: PaidAnalysisSituationItemV4[];
    cautions: PaidAnalysisSituationItemV4[];
  };

  timeline: PaidAnalysisTimelineItemV4[];

  timelineSource?: PaidAnalysisTimelineSource;

  action: PaidAnalysisActionItemV4[];

  avoid: PaidAnalysisAvoidItemV4[];

  /** Only for decision-type products; absent on exploration-type products. */
  decisionCheck?: string[];

  confidence: {
    level: "높음" | "중간" | "낮음";
    strongestEvidence: string[];
    uncertaintyFactors: string[];
    limitations: string;
  };

  /** Only present for PERIOD products; frozen when the report is generated. */
  referencePeriod?: ReferencePeriodSnapshot;

  /** Only present for PERIOD products; structured per-segment result. */
  periodAnalysis?: PeriodAnalysisBlock;
};

/** Server-resolved evidence: the observed fact comes from the saju engine. */
export type ResolvedPaidAnalysisEvidence = PaidAnalysisEvidenceItemV4 & {
  label: string;
  fact: string;
};

/** The only V4 shape that is ever stored or rendered. */
export type ResolvedPaidAnalysisDetailV4 = Omit<
  PaidAnalysisDetailOutputV4,
  "evidence"
> & {
  evidence: ResolvedPaidAnalysisEvidence[];
};

/** What paid_reports.content may hold after the V4 rollout. */
export type StoredPaidAnalysisDetail =
  | PaidAnalysisDetailOutputV3
  | ResolvedPaidAnalysisDetailV4;

export function isPaidAnalysisDetailV4(
  value: StoredPaidAnalysisDetail,
): value is ResolvedPaidAnalysisDetailV4 {
  return (
    (value as ResolvedPaidAnalysisDetailV4).schemaVersion ===
    PAID_ANALYSIS_DETAIL_SCHEMA_VERSION_V4
  );
}