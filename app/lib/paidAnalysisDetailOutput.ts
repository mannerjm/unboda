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