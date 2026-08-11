export type RecommendationExplanationItem = {
  productId: string;
  headline: string;
  summary: string;
  userMeaning: string;
};

export type AnalysisRecommendationOutput = {
  headline: string;
  summary: string;
  userMeaning: string;

  cardReasons: {
    first: string;
    second: string;
    third: string;
  };

  conversionGuidance: {
    whyNow: string;
    whatYouWillLearn: string;
    riskOfDelay: string;
  };

  recommendationItems?: readonly RecommendationExplanationItem[];
};