async function main() {
  const response = await fetch("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      birthDate: "1987-02-03",
      birthTime: "22:48",
      calendarType: "양력",
      isLeapMonth: "평달",
      gender: "남성",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : "분석 API 호출에 실패했습니다."
    );
  }

  if (!data.freeAnalysis) {
    throw new Error("API 응답에 freeAnalysis가 없습니다.");
  }

  if (!data.freeAnalysis.elementAnalysis) {
    throw new Error("freeAnalysis에 오행 분석이 없습니다.");
  }

  if (!data.freeAnalysis.strengthAnalysis) {
    throw new Error("freeAnalysis에 신강·신약 분석이 없습니다.");
  }

  if ("fortuneBrain" in data.freeAnalysis) {
    throw new Error(
      "freeAnalysis에 fortuneBrain이 노출되었습니다."
    );
  }

  if ("elementRelations" in data.freeAnalysis) {
    throw new Error(
      "freeAnalysis에 elementRelations가 노출되었습니다."
    );
  }

  if (
  !data.productRecommendations ||
  !Array.isArray(data.productRecommendations.recommendations)
) {
  throw new Error(
    "API 응답에 productRecommendations.recommendations가 없습니다."
  );
}

if (data.productRecommendations.recommendations.length !== 3) {
  throw new Error(
    "상품 추천 결과가 예상한 3개가 아닙니다."
  );
}

  console.log("API freeAnalysis 포함: true");
  console.log("무료 핵심 분석 포함: true");
  console.log("fortuneBrain 비노출: true");
  console.log("elementRelations 비노출: true");
  console.log("productRecommendations 포함: true");
  console.log("상품 추천 3개 포함: true");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});