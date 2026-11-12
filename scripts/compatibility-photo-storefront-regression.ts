import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { PREMIUM_PRODUCT_PHOTOS } from "../app/lib/premiumProductPhotos";
import {
  COMPATIBILITY_BUSINESS_PRODUCT,
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT,
  COMPATIBILITY_FRIEND_PRODUCT,
  COMPATIBILITY_ROMANTIC_PRODUCT,
  COMPATIBILITY_WORKPLACE_PRODUCT,
} from "../app/lib/specialAnalysisProducts";

const shell = readFileSync("app/components/AppShell.tsx", "utf8");
const listing = readFileSync("app/special-analysis/compatibility/page.tsx", "utf8");

assert(shell.includes('item.activeHref === "/special-analysis" && pathname.startsWith("/special-analysis")'), "Professional analysis must expose the submenu on index and child routes");
assert(shell.includes('href="/special-analysis/compatibility"') && shell.includes("궁합"), "Sidebar must link to the two-character 궁합 submenu");
assert(shell.includes('pathname.startsWith("/special-analysis/compatibility") ? "page"'), "Submenu must highlight on compatibility list and details");
assert(shell.includes('item.activeHref === "/deep-analysis" && isDeepCatalog'), "Existing deep-analysis sub-navigation must remain");

const expected = [
  { route: "/special-analysis/compatibility/romantic", photoId: "relationship-current", label: "연인 궁합", title: "연인·배우자 궁합", amount: COMPATIBILITY_ROMANTIC_PRODUCT.amount },
  { route: "/special-analysis/compatibility/family/parent-child#family-relationship-selector", photoId: "relationship-family-role", label: "가족 궁합", title: "가족 궁합", amount: COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT.amount },
  { route: "/special-analysis/compatibility/workplace", photoId: "career-workplace-relationships", label: "직장 궁합", title: "직장·동료 궁합", amount: COMPATIBILITY_WORKPLACE_PRODUCT.amount },
  { route: "/special-analysis/compatibility/friend", photoId: "relationship-friendship", label: "친구 궁합", title: "친구·지인 궁합", amount: COMPATIBILITY_FRIEND_PRODUCT.amount },
  { route: "/special-analysis/compatibility/business", photoId: "business-team-management", label: "동업 궁합", title: "사업·동업 궁합", amount: COMPATIBILITY_BUSINESS_PRODUCT.amount },
];
assert.equal(expected.length, 5);
assert.equal(new Set(expected.map(x => x.photoId)).size, 5, "Five products must have distinct licensed photos");
for (const product of expected) {
  assert(listing.includes('href: "' + product.route + '"'), "Existing buyer entry path lost: " + product.route);
  assert(listing.includes('photoId: "' + product.photoId + '"'), "Photo missing from catalogue: " + product.photoId);
  assert(listing.includes('photoLabel: "' + product.label + '"') && listing.includes('title: "' + product.title + '"'), "Card does not use exact product name");
  const photo = PREMIUM_PRODUCT_PHOTOS[product.photoId];
  assert(photo?.src.startsWith("/images/premium/") && photo.sourcePage.includes("pexels.com"), "Photo must use the already licensed self-hosted storefront source");
  assert(statSync("public" + photo.src).size > 7500, "Existing photo file missing / low quality");
  assert.equal(product.amount, 19900, "Compatibility checkout price unexpectedly changed");
}
assert(listing.includes("compatibilityCards.map(") && listing.includes("<Image") && listing.includes("className=\"object-cover object-center\""), "All products must show a visible topical thumbnail");
assert(listing.includes("md:grid-cols-2") && listing.includes('text-[16px] font-extrabold leading-[1.4]'), "Keep compact two-column, deep-analysis style cards");
assert(listing.includes('getActiveProfile(') && listing.includes('getCurrentUser('), "Existing auth/profile context must remain");
assert(listing.includes('href={product.href}') && listing.includes('product.amount.toLocaleString("ko-KR")'), "Actual checkout entry and canonical price must be shown");
console.log("compatibility photo storefront regression passed: 5 self-hosted photos, 5 canonical entry routes, protected account context");
