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
    recommendations={recommendations}
  />,
);
for (const id of productIds) {
  assert.ok(markup.includes(id), "Missing canonical product image: " + id);
}
for (const price of ["9,900원", "16,900원"]) {
  assert.ok(markup.includes(price), "Missing accurate product price: " + price);
}
assert.equal((markup.match(/<a /g) ?? []).length, 3, "Exactly three recommendations must link to detail");
for (const id of productIds) assert.ok(markup.includes(`/paid-analysis/${id}?profileId=test-profile`), "Missing profile-scoped detail link: " + id);
assert.equal((markup.match(/<img /g) ?? []).length, 3, "All three canonical photographs must render");
assert.ok(markup.includes("auto-rows-fr grid-cols-1"), "Cards must use equal-height single-column rows");
assert.equal((markup.match(/h-24 w-24 shrink-0/g) ?? []).length, 3, "All three photographs must share the same size");
assert.equal((markup.match(/group flex h-full w-full flex-col/g) ?? []).length, 3, "All three cards must share the same dimensions");
assert.ok(!markup.includes("추천은 매월 실제 계산 근거로"), "Selected monthly guidance must be absent");
assert.ok(!markup.includes("<details") && !markup.includes("리포트 구성 자세히 보기"), "List must not embed details");
assert.ok(markup.includes("상품 자세히 보기"), "Detailed product navigation must be discoverable");
const guestMarkup = renderToStaticMarkup(<RecommendationTop3 profileId="guest-record" recommendations={recommendations} guestMode />);
for (const id of productIds) assert.ok(guestMarkup.includes(`/paid-analysis/${id}?from=guest-recommendation`), "Guest should open detail without profile or checkout");
assert.ok(!markup.includes("UNBODA.CO.KR"), "Incorrect brand domain must not leak");
console.log("recommendation-top3-visual-contract-regression: OK", { imageCount: 3, productCount: 3 });
