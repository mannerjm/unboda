import {
  generateMainAnalysis,
  generateRecommendationExplanation,
} from "../app/lib/analysisAIService";

async function run(): Promise<void> {
  const mainAnalysis = await generateMainAnalysis(
    "다음 문장에 짧게 답해주세요: 테스트가 정상적으로 실행되었습니다."
  );

  const recommendationExplanation =
  await generateRecommendationExplanation({
    primaryTheme: "wealth",
    headline: "재물 흐름을 먼저 점검해보세요.",
    summary:
      "재물과 관련된 흐름을 우선적으로 살펴볼 필요가 있습니다.",
    userMeaning:
      "현재 선택과 방향을 정리하는 데 도움이 될 수 있습니다.",
    reasons: [
      {
        id: "wealth-1",
        label: "추천 근거 1",
        explanation:
          "재물 흐름을 우선적으로 점검할 필요가 있습니다.",
      },
    ],
    recommendedProductId: "wealth",
    recommendedReason:
      "재물 흐름을 우선적으로 점검할 필요가 있습니다.",
    secondaryRecommendations: [],
  });

  console.log(
    "메인 분석 생성:",
    Boolean(mainAnalysis.text) && (mainAnalysis.status === "completed" || mainAnalysis.status === "failed")
  );

  console.log(
    "추천 headline 생성:",
    Boolean(recommendationExplanation.headline)
  );

  console.log(
    "추천 summary 생성:",
    Boolean(recommendationExplanation.summary)
  );

  console.log(
    "추천 userMeaning 생성:",
    Boolean(recommendationExplanation.userMeaning)
  );
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});