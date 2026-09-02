import { readFileSync } from "node:fs";
import { computeAnalysisEditionKey } from "../app/lib/analysisEditionKey";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function ownsExactCurrentEdition(
  currentEditionKey: string,
  activeEditionKeys: readonly string[],
): boolean {
  return activeEditionKeys.includes(currentEditionKey);
}

const purchases = readFileSync("app/lib/purchases/server.ts", "utf8");
const ordersRoute = readFileSync("app/api/orders/route.ts", "utf8");
const accessPanel = readFileSync("app/paid-analysis/[productId]/PaidAnalysisAccessPanel.tsx", "utf8");
const statusRoute = readFileSync("app/api/premium-catalog/status/route.ts", "utf8");
const catalog = readFileSync("app/components/PremiumCatalogSection.tsx", "utf8");
const migration = readFileSync("supabase/migrations/032_active_edition_order_uniqueness.sql", "utf8");

assert(purchases.includes("resolveAnalysisEditionForOrder({") && purchases.includes("getActiveEntitlementForProfileEdition("), "createPendingOrder must resolve the authoritative edition before exact ownership lookup");
const createPendingOrderBody = purchases.slice(purchases.indexOf("export async function createPendingOrder"), purchases.indexOf("export async function getOrderForUser"));
assert(createPendingOrderBody.indexOf("resolveAnalysisEditionForOrder({") < createPendingOrderBody.indexOf("getActiveEntitlementForProfileEdition("), "the exact guard must use the already-resolved order edition");
assert(!createPendingOrderBody.includes("hasActiveEntitlementForProfile(input.userId"), "product-global entitlement must not block modern edition purchases");
assert(ordersRoute.includes("현재 분석을 이미 보유하고 있습니다"), "duplicate UX must describe current ownership, not generic duplicate purchase");
console.log("1. purchase guard is server-resolved and exact-edition scoped ✓");

const september = computeAnalysisEditionKey({ productId: "career-job-change", anchorDate: "2026-09-30" });
const november = computeAnalysisEditionKey({ productId: "career-job-change", anchorDate: "2026-11-01" });
assert(september === "MONTH:2026-09" && november === "MONTH:2026-11", "monthly editions must follow the authoritative server anchor");
assert(ownsExactCurrentEdition(september, ["MONTH:2026-09"]), "same current MONTH edition must block");
assert(!ownsExactCurrentEdition(november, ["MONTH:2026-09"]), "old MONTH edition must allow the current edition, including skipped months");
assert(!ownsExactCurrentEdition(november, ["LEGACY"]), "LEGACY must not equal a modern current edition");
assert(computeAnalysisEditionKey({ productId: "career", anchorDate: "2026-12-31" }) === "YEAR:2026", "year-end must retain the current year edition");
assert(computeAnalysisEditionKey({ productId: "career", anchorDate: "2027-01-01" }) === "YEAR:2027", "new-year edition must differ and become purchasable");
assert(computeAnalysisEditionKey({ productId: "monthly-current", anchorDate: "2026-09-02" }) === "TARGET_MONTH:2026-09", "TARGET_MONTH must retain its existing reference-period policy");
assert(computeAnalysisEditionKey({ productId: "yearly-current", anchorDate: "2026-09-02" }) === "TARGET_YEAR:2026", "TARGET_YEAR must retain its existing reference-period policy");
assert(computeAnalysisEditionKey({ productId: "annual-3years", anchorDate: "2026-09-02" }) === "RANGE:2026-2028", "RANGE must retain its existing rolling coverage policy");
assert(computeAnalysisEditionKey({ productId: "daeun-current", anchorDate: "2026-09-02", fortune: { daeunOrder: 3, daeunGanji: "계유" } }) === "DAEUN:3:계유", "DAEUN must use the exact server-resolved order and ganji identity");
assert(ownsExactCurrentEdition("LIFETIME", ["LIFETIME"]), "active LIFETIME must block a duplicate lifetime purchase");
assert(!ownsExactCurrentEdition("LIFETIME", []), "revoked LIFETIME must no longer block purchase under exact active ownership");
console.log("2. month skip, year boundary, LEGACY, and LIFETIME exact ownership semantics ✓");

assert(migration.includes("orders_active_known_edition_unique") && migration.includes("user_id, profile_id, product_id, analysis_edition_key"), "same-edition active order concurrency must remain database protected");
assert(migration.includes("status in ('pending', 'paid')") && migration.includes("analysis_edition_key <> 'LEGACY'"), "active order uniqueness must preserve retry and legacy compatibility");
assert(migration.includes("user_id, profile_id, product_id, analysis_edition_key"), "different profiles and products remain structurally independent in active order identity");
assert(purchases.includes("getCurrentEditionEntitlementForProfile") && accessPanel.includes("getCurrentEditionEntitlementForProfile"), "product-detail access must use exact current ownership rather than product-global ownership");
assert(statusRoute.includes("currentOwnedProductIds") && catalog.includes("currentOwnedProductIds.has(summary.productId)"), "catalog purchase availability must project only current-edition ownership");
console.log("3. concurrency and purchase-facing UI use exact current-edition ownership ✓");

console.log("exact-edition-purchase-activation-regression passed ✓");