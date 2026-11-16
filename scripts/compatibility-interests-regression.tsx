import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  COMPATIBILITY_INTEREST_CARDS,
  getCompatibilityInterestCard,
} from "../app/lib/interestedAnalyses/compatibilityCatalog";
import { PREMIUM_PRODUCT_PHOTOS } from "../app/lib/premiumProductPhotos";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";
import { getSpecialAnalysisProduct } from "../app/lib/specialAnalysisProducts";
import type { InterestedAnalysisRecord, InterestedAnalysisCurrentState } from "../app/lib/interestedAnalyses/server";
import InterestedAnalysesList, { type SavedAnalysis } from "../app/components/InterestedAnalysesList";
import CompatibilityInterestSaveButton from "../app/components/CompatibilityInterestSaveButton";

function read(path: string) { return readFileSync(path, "utf8"); }
function record(productId: string, idx: number): InterestedAnalysisRecord {
  return {
    id: "interest-" + idx, userId: "u1", profileId: "p1",
    productId, createdAt: "2026-11-" + String(idx + 11).padStart(2, "0") + "T12:00:00.000Z",
    updatedAt: "2026-11-" + String(idx + 11).padStart(2, "0") + "T12:00:00.000Z",
  };
}
assert.equal(COMPATIBILITY_INTEREST_CARDS.length, 5, "Exactly five published compatibility favorites");
assert.equal(new Set(COMPATIBILITY_INTEREST_CARDS.map(p => p.productId)).size, 5);
assert.equal(new Set(COMPATIBILITY_INTEREST_CARDS.map(p => p.photoId)).size, 5);
assert.equal(new Set(COMPATIBILITY_INTEREST_CARDS.map(p => p.href)).size, 5);
assert.equal(COMPATIBILITY_INTEREST_CARDS.filter(p=>p.title === "가족 궁합").length, 1,
  "One family bookmark stands for all family subtypes; it never stores a selected relative");
for (const p of COMPATIBILITY_INTEREST_CARDS) {
  const spec = getSpecialAnalysisProduct(p.productId);
  const photo = PREMIUM_PRODUCT_PHOTOS[p.photoId];
  assert.equal(spec?.amount, 19_900);
  assert.ok(photo?.src.startsWith("/images/premium/"));
  assert.ok(statSync("public" + photo.src).size > 7500);
  assert.ok(getCompatibilityInterestCard(p.productId));
}
for (const invalid of ["relationship-current", "compatibility-family-siblings", "compatibility-family-other", "compatibility-unknown", "p1", ""]) {
  assert.equal(getCompatibilityInterestCard(invalid), undefined, "Only 5 visible products may be bookmarked: " + invalid);
}
const premiumProduct = getPremiumProduct("money-leak-risk");
assert.ok(premiumProduct, "Existing money product still in registry");
const state: InterestedAnalysisCurrentState = {
  productId: premiumProduct.id, isSaved: true,
  currentEditionKey: "MONTH:2026-11", ownsCurrentEdition: false,
  hasAnyActiveOwnedEdition: false, latestOwnedEditionKey: null,
};
const list: SavedAnalysis[] = [
  { kind: "premium", record: record(premiumProduct.id, 1), product: premiumProduct, currentState: state },
  { kind: "compatibility", record: record(COMPATIBILITY_INTEREST_CARDS[0].productId, 2), compatibility: COMPATIBILITY_INTEREST_CARDS[0] },
  { kind: "compatibility", record: record(COMPATIBILITY_INTEREST_CARDS[1].productId, 3), compatibility: COMPATIBILITY_INTEREST_CARDS[1] },
];
const html = renderToStaticMarkup(<InterestedAnalysesList analyses={list} profileId="p1" />);
assert.equal((html.match(/<img /g) ?? []).length, 3, "Three saved products must show three canonical photos");
assert.equal((html.match(/관심 분석에서 제거/g) ?? []).length >= 3, true);
assert.equal((html.match(/분석 자세히 보기/g) ?? []).length, 3, "Premium + compatibility all have entry links");
assert.ok(html.includes("/special-analysis/compatibility/romantic"));
assert.ok(html.includes("/special-analysis/compatibility/family/parent-child#family-relationship-selector"));
assert.ok(!html.includes("궁합 상품 저장") && !html.includes("현재 회차 미보유")
  && !html.includes("관심 저장됨") && !html.includes("분석 자세히 보기 →"),
  "Saved cards must show only detail/remove actions without extra badges or arrows");
assert.ok(html.includes("19,900원") && html.includes("전체 관심 분석"));
assert.equal((html.match(/최근 저장한 관심 분석/g) ?? []).length, 0, "No duplicate featured item");
const save = renderToStaticMarkup(<CompatibilityInterestSaveButton productId={COMPATIBILITY_INTEREST_CARDS[0].productId} initialSaved={false} authenticated hasActiveProfile />);
const saved = renderToStaticMarkup(<CompatibilityInterestSaveButton productId={COMPATIBILITY_INTEREST_CARDS[0].productId} initialSaved authenticated hasActiveProfile />);
const guest = renderToStaticMarkup(<CompatibilityInterestSaveButton productId={COMPATIBILITY_INTEREST_CARDS[0].productId} initialSaved={false} authenticated={false} hasActiveProfile={false} />);
assert.ok(save.includes("관심 분석에 저장"));
assert.ok(saved.includes("disabled") && saved.includes("관심 분석에 저장됨") && !saved.includes("관심 분석에서 제거"));
assert.ok(guest.includes("/auth/login?returnTo=/special-analysis/compatibility"));
const service = read("app/lib/interestedAnalyses/server.ts");
const actions = read("app/lib/interestedAnalyses/actions.ts");
const page = read("app/interests/page.tsx");
const catalog = read("app/special-analysis/compatibility/page.tsx");
const pair = read("app/special-analysis/compatibility/PairCompatibilityPage.tsx");
const family = read("app/special-analysis/compatibility/family/parent-child/page.tsx");
assert.ok(service.includes("getCompatibilityInterestCard(canonicalProductId)") &&
  service.includes("getPremiumProduct(canonicalProductId)"), "Save validator must preserve premium registry and whitelist exactly five compatibility products");
assert.ok(service.includes('onConflict: "user_id,profile_id,product_id"'));
assert.ok(service.includes('.eq("user_id", userId)') && service.includes('.eq("profile_id", profileId)'));
assert.ok(service.includes('productId && !getCompatibilityInterestCard(productId)'),
  "Compatibility interest must never infer a paid entitlement from a premium edition resolver");
assert.ok(actions.includes("saveCompatibilityInterestAction") && actions.includes("getCurrentUser()"));
assert.ok(actions.includes("getCompatibilityInterestCard(productId)"),
  "Compatibility server action must reject non-approved IDs before any write");
assert.ok(page.includes("listUserInterestedAnalysesWithCurrentState") && page.includes("SavedAnalysis[]"));
assert.ok(!catalog.includes("CompatibilityInterestSaveButton")
  && !catalog.includes("상품 상세 보기 →")
  && !catalog.includes("관심 분석에 저장")
  && catalog.includes("href={product.href}"),
  "Compatibility photo listings are single-click cards with no extra action links or save buttons");
assert.ok(pair.includes("isProductSaved(user.id, productId)")
  && pair.includes("initialInterestSaved={saved}"),
  "Pair detail must pass saved state to bottom purchase confirmation only");
assert.ok(family.includes("isProductSaved(user.id, COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID)")
  && family.includes("initialInterestSaved={saved}"),
  "Family detail must pass one category bookmark through the relation selector");
for (const path of [
  "app/components/PaidCompatibilityAnalysisClient.tsx",
  "app/components/PaidFamilyParentChildAnalysisClient.tsx",
  "app/components/PaidFamilyExtendedAnalysisClient.tsx",
]) {
  const source = read(path);
  assert.ok(source.includes("구매 전 확인") && source.includes("<CompatibilityInterestSaveButton"),
    "The interest save action must be inside the same bottom purchase area: " + path);
  assert.ok(source.indexOf("<CompatibilityInterestSaveButton") > source.indexOf('type="submit"'),
    "The bookmark action must follow purchase confirmation, not appear before the product content: " + path);
}
assert.ok(!read("app/components/CompatibilityInterestSaveButton.tsx").includes("관심 목록 보기"),
  "Never create an extra 'interest list' link beside a saved-state label");
assert.ok(read("app/components/FamilyCompatibilityAnalysisClient.tsx").includes("onInterestSaved={() => setInterestSaved(true)}"),
  "Saving any family subtype must keep saved state when switching between relatives");
assert.ok(!actions.includes("partnerLabel") && !service.includes("partner_birth_date"),
  "Interest actions/store must never persist a partner's private details");
const ddl = read("supabase/migrations/028_profile_scoped_interested_analyses.sql");
assert.ok(ddl.includes("interested_analyses_user_profile_product_unique"));
assert.ok(ddl.includes("using (auth.uid() = user_id)") && ddl.includes("to service_role"),
  "Existing RLS and unique profile-scoped row guarantee must remain");
console.log("compatibility-interests-regression: 5 product kinds, 3 photo cards, 3 routes, RLS/uniqueness and privacy boundaries PASS");
