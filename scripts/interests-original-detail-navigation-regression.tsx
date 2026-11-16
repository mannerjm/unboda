import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import InterestedAnalysesList, { type SavedAnalysis } from "../app/components/InterestedAnalysesList";
import PremiumCatalogSection from "../app/components/PremiumCatalogSection";
import { listPeriodCatalogProducts, listTopicCatalogProducts } from "../app/lib/premiumCatalog";
import type { InterestedAnalysisCurrentState, InterestedAnalysisRecord } from "../app/lib/interestedAnalyses/server";
import { COMPATIBILITY_INTEREST_CARDS } from "../app/lib/interestedAnalyses/compatibilityCatalog";

const read = (path: string) => readFileSync(path, "utf8");
const moneyProduct = listTopicCatalogProducts().find((p) => p.category === "money" && p.id === "money-contract-commitment");
assert.ok(moneyProduct, "Selected finance product is in the sales catalogue");
const periodProduct = listPeriodCatalogProducts().find((p) => p.id === "monthly-current");
assert.ok(periodProduct, "Period product is still part of the same catalog");
const record = (productId: string, num: number): InterestedAnalysisRecord => ({
  id: "test-record-" + num, userId: "u", profileId: "profile",
  productId, createdAt: "2026-11-16T10:00:00Z", updatedAt: "2026-11-16T10:00:00Z",
});
const state = (productId: string): InterestedAnalysisCurrentState => ({
  productId, isSaved: true, ownsCurrentEdition: false, currentEditionKey: null,
  hasAnyActiveOwnedEdition: false, latestOwnedEditionKey: null,
});
const analyses: SavedAnalysis[] = [
  { kind: "premium", record: record(moneyProduct.id, 1), product: moneyProduct, currentState: state(moneyProduct.id) },
  { kind: "premium", record: record(periodProduct.id, 2), product: periodProduct, currentState: state(periodProduct.id) },
  { kind: "compatibility", record: record(COMPATIBILITY_INTEREST_CARDS[0].productId, 3), compatibility: COMPATIBILITY_INTEREST_CARDS[0] },
];
const html = renderToStaticMarkup(<InterestedAnalysesList analyses={analyses} profileId="profile" />);
assert.ok(html.includes("/deep-analysis?mode=topic&amp;category=money&amp;productId=money-contract-commitment"),
  "Interested topic must link to its existing topic detail with selected product");
assert.ok(html.includes("/deep-analysis?mode=period&amp;category=period&amp;productId=monthly-current"),
  "Interested period must link to its existing period detail with selected product");
assert.ok(html.includes("/special-analysis/compatibility/romantic"),
  "Compatibility preserves its already-existing analysis entry");
assert.ok(!html.includes("다른 심층 분석 둘러보기"));
assert.ok(!html.includes("궁합 분석 둘러보기"));
assert.ok(!html.includes("구매한 분석 보관함 →"));
assert.ok(!html.includes("/paid-analysis/money-contract-commitment"),
  "No separate /paid-analysis detail link from interests");
const page = read("app/deep-analysis/page.tsx");
const catalog = read("app/components/PremiumCatalogSection.tsx");
assert.ok(page.includes("const initialProductId = getSingleParam(params.productId);"),
  "Existing deep-analysis entry accepts selected product for topic as well as period");
assert.ok(catalog.includes("group.category === category && group.products.some((product) => product.id === initialProductId)"),
  "Topic deep links must validate category and product against launch-visible entries");
assert.ok(catalog.includes("periodProducts.some((product) => product.id === initialProductId)"),
  "Period deep link validation must remain");
const selectedTopicHtml = renderToStaticMarkup(
  <PremiumCatalogSection initialMode="topic" initialCategory="money" initialProductId={moneyProduct.id} />,
);
assert.ok(selectedTopicHtml.includes("상품 목록") && selectedTopicHtml.includes(moneyProduct.title),
  "Existing topic storefront opens the requested selected product detail");
const selectedPeriodHtml = renderToStaticMarkup(
  <PremiumCatalogSection initialMode="period" initialCategory="period" initialProductId={periodProduct.id} />,
);
assert.ok(selectedPeriodHtml.includes("기간 선택") && selectedPeriodHtml.includes(periodProduct.title),
  "Period storefront still opens the requested selected product detail");
const wrongCategoryHtml = renderToStaticMarkup(
  <PremiumCatalogSection initialMode="topic" initialCategory="career" initialProductId={moneyProduct.id} />,
);
assert.ok(!wrongCategoryHtml.includes("상품 목록"),
  "A product cannot be opened by supplying a mismatched category");
console.log("interests-original-detail-navigation-regression: topic/period/compatibility links, SSR selection, invalid links, and no extra footers PASS");
