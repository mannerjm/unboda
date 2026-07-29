export type AnalysisRecommendationOutput = {
  headline: string;
  summary: string;
  userMeaning: string;

  cardReasons: {
    first: string;
    second: string;
    third: string;
  };
};