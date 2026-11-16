import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const listing = read("app/special-analysis/compatibility/page.tsx");
const button = read("app/components/CompatibilityInterestSaveButton.tsx");
const pair = read("app/special-analysis/compatibility/PairCompatibilityPage.tsx");
const family = read("app/special-analysis/compatibility/family/parent-child/page.tsx");
const picker = read("app/components/FamilyCompatibilityAnalysisClient.tsx");

assert(listing.includes('href={product.href}') && listing.includes('aria-label={product.title + " 상세 열기"}'),
  "The entire photo card retains its original detail navigation.");
assert(!listing.includes("상품 상세 보기 →") && !listing.includes("CompatibilityInterestSaveButton")
  && !listing.includes("savedProductIds") && !listing.includes("관심 분석에 저장"),
  "The catalog must not display product detail CTA text, bookmark actions, or link clutter.");
assert(!button.includes("관심 목록 보기") && !button.includes('href="/interests"'),
  "Saved state must only change the existing button label without a new shortcut.");
assert(button.includes('type="button"') && button.includes("disabled={saved || loading}"),
  "Saving must be independent of payment form submission and idempotent.");
assert(!pair.includes("<CompatibilityInterestSaveButton")
  && pair.includes("initialInterestSaved={saved}")
  && !family.includes("<CompatibilityInterestSaveButton")
  && family.includes("initialInterestSaved={saved}"),
  "No early bookmark at the top of the detailed compatibility page.");
for (const path of [
  "app/components/PaidCompatibilityAnalysisClient.tsx",
  "app/components/PaidFamilyParentChildAnalysisClient.tsx",
  "app/components/PaidFamilyExtendedAnalysisClient.tsx",
]) {
  const source = read(path);
  assert(source.includes("구매 전 확인")
    && source.indexOf("<CompatibilityInterestSaveButton") > source.indexOf('type="submit"'),
    "Bookmark must follow purchase confirmation only: " + path);
  assert.equal(source.split("<CompatibilityInterestSaveButton").length - 1, 1,
    "Exactly one bookmark per visible compatibility purchase form: " + path);
}
assert(picker.includes("onInterestSaved={() => setInterestSaved(true)}"),
  "Family bookmark persists across subtype changes.");
assert(!listing.includes("로그인하고 저장하기"),
  "No new customer links must be invented.");
console.log("compatibility-ui-consistency-regression PASS: list uncluttered, save-only at bottom, no extra links");
