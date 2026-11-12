import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import RecommendationTop3 from "../app/components/RecommendationTop3";
import type { AnalysisProductRecommendation } from "../app/lib/analysisProductRecommendations";

const productIds = ["relationship-conflict", "money-leak-risk", "social-conflict"];
const recommendations: AnalysisProductRecommendation[] = productIds.map((productId, i) => ({
  productId,
  score: 100 - i,
  reasons: ["무료 분석에서 관련 흐름이 확인되어 선택을 돕는 분석입니다."],
  evidence: [],
}));
const markup = renderToStaticMarkup(
  <RecommendationTop3
    profileId="test-profile"
    paidSummaries={[]}
    recommendations={recommendations}
    explanation={null}
  />,
);
for (const id of productIds) {
  assert.ok(markup.includes(id), "Missing canonical product image: " + id);
}
for (const price of ["9,900원", "16,900원"]) {
  assert.ok(markup.includes(price), "Missing accurate product price: " + price);
}
assert.equal((markup.match(/aria-pressed="/g) ?? []).length, 3, "All three recommendations must be selectable");
assert.equal((markup.match(/<img /g) ?? []).length, 3, "All three canonical photographs must render");
assert.ok(markup.includes("리포트 구성 자세히 보기"), "Long report preview must be discoverable");
assert.ok(markup.includes("<details"), "Long report preview must be collapsed initially");
assert.ok(markup.includes("이 분석 자세히 보기"), "Detailed product navigation must be discoverable");
assert.ok(!markup.includes("UNBODA.CO.KR"), "Incorrect brand domain must not leak");
console.log("recommendation-top3-visual-contract-regression: OK", { imageCount: 3, productCount: 3 });
