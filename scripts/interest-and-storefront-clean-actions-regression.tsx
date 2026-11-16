import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import InterestedAnalysesList, { type SavedAnalysis } from "../app/components/InterestedAnalysesList";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";
import { COMPATIBILITY_INTEREST_CARDS } from "../app/lib/interestedAnalyses/compatibilityCatalog";
import type { InterestedAnalysisRecord, InterestedAnalysisCurrentState } from "../app/lib/interestedAnalyses/server";

const storefront = readFileSync("app/components/PremiumCatalogMarketplace.tsx", "utf8");
assert(!storefront.includes("상품 상세 보기 →"), "Deep analysis catalog must not show an extra detail CTA");
assert(storefront.includes("onClick={()=>onSelectProduct(product.id)}"),
  "Existing entire product card still opens its detail");
const makeRecord = (id: string, n: number): InterestedAnalysisRecord => ({
  id: "sample-" + n, userId: "test", profileId: "test-profile",
  productId: id, createdAt: "2026-11-16T12:00:00Z", updatedAt: "2026-11-16T12:00:00Z",
});
const product = getPremiumProduct("money-leak-risk");
assert(product, "Selected premium product exists");
const state = (owned: boolean): InterestedAnalysisCurrentState => ({
  productId: product.id, isSaved: true, currentEditionKey: "MONTH:2026-11",
  ownsCurrentEdition: owned, hasAnyActiveOwnedEdition: owned, latestOwnedEditionKey: owned ? "MONTH:2026-11" : null,
});
const analyses: SavedAnalysis[] = [
  { kind: "premium", record: makeRecord(product.id, 1), product, currentState: state(false) },
  { kind: "compatibility", record: makeRecord(COMPATIBILITY_INTEREST_CARDS[0].productId, 2), compatibility: COMPATIBILITY_INTEREST_CARDS[0] },
];
const html = renderToStaticMarkup(<InterestedAnalysesList analyses={analyses} profileId="test-profile" />);
const unwanted = ["관심 저장됨", "궁합 상품 저장", "현재 회차 미보유", "현재 분석 보유 중", "분석 자세히 보기 →", "구매한 분석에서 보기", "상품 상세 보기 →"];
for (const label of unwanted) assert(!html.includes(label), "Unrequested status/action must be absent: " + label);
assert.equal((html.match(/분석 자세히 보기/g) ?? []).length, 2, "One detail action per saved item");
assert.equal((html.match(/>관심 분석에서 제거</g) ?? []).length, 2, "One remove action per saved item");
assert(html.includes("/deep-analysis?mode=topic&amp;category=money&amp;productId=money-leak-risk"),
  "Existing selected deep-analysis product destination retained");
assert(html.includes("/special-analysis/compatibility/romantic"),
  "Existing compatibility detail destination retained");
const owned = renderToStaticMarkup(<InterestedAnalysesList analyses={[
  { kind: "premium", record: makeRecord(product.id, 3), product, currentState: state(true) },
]} profileId="test-profile" />);
assert(owned.includes('href="/purchased-analyses"'), "Owned item keeps prior purchase library destination");
assert(owned.includes(">분석 자세히 보기</a>"), "Owned item shares identical simple button label");
console.log("interest-and-storefront-clean-actions-regression passed");
