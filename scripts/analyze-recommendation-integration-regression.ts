import { generateAnalysisRecommendation } from "../app/lib/generateAnalysisRecommendation";

async function main(): Promise<void> {
  const result = await generateAnalysisRecommendation({
    recommendation: {
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
    },
  });

  console.log("headline 생성:", result.headline.length > 0);
  console.log("summary 생성:", result.summary.length > 0);
  console.log("userMeaning 생성:", result.userMeaning.length > 0);
  console.log(result);
}

main().catch((error: unknown) => {
  console.error("추천 설명 통합 테스트 실패:", error);
  process.exitCode = 1;
});