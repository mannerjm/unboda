import type { ReferencePeriodSnapshot } from "./analysisReferencePeriod";

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