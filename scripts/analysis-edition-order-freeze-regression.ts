// STEP 57D-48F-C: order/purchase edition freeze regression.
//
// Proves the commercial edition is computed once at order creation, is
// immutable thereafter, and is copied verbatim (never recomputed) onto the
// purchase. Static source-contract checks + pure deterministic key-freeze
// simulations; live DB order->purchase round trip is covered separately by
// the env-gated integration block in purchase-persistence-phase3b-regression.ts.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeAnalysisEditionKey } from "../app/lib/analysisEditionKey";
import { resolveAnalysisEditionForOrder } from "../app/lib/analysisEditionForOrder";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const purchasesServer = read("app/lib/purchases/server.ts");
const ordersRoute = read("app/api/orders/route.ts");
const forOrderSource = read("app/lib/analysisEditionForOrder.ts");

// --- 1-9: static ordering / fail-closed contract on createPendingOrder ---
const createPendingOrderBody = purchasesServer.slice(
  purchasesServer.indexOf("export async function createPendingOrder"),
  purchasesServer.indexOf("export async function getOrderForUser"),
);
const guardIndex = createPendingOrderBody.indexOf("getActiveEntitlementForProfileEdition");
const editionIndex = createPendingOrderBody.indexOf("resolveAnalysisEditionForOrder(");
const insertIndex = createPendingOrderBody.indexOf('.from("orders")');
assert(guardIndex > -1 && editionIndex > -1 && insertIndex > -1, "createPendingOrder must contain the guard, edition resolution, and insert in sequence");
assert(editionIndex < guardIndex, "the exact entitlement guard must use the same server-resolved edition later frozen onto the order");
assert(editionIndex < insertIndex, "edition must be resolved before the order is inserted");
assert(
  createPendingOrderBody.includes("analysis_edition_key: analysisEditionKey"),
  "the orders insert must persist the frozen edition key",
);
assert(
  /catch \{\s*throw new AnalysisEditionUnavailableError/.test(createPendingOrderBody),
  "createPendingOrder must fail closed (not insert an order) when edition computation fails",
);
assert(
  !createPendingOrderBody.includes("input.analysisEditionKey") && !createPendingOrderBody.includes("input.editionKey"),
  "createPendingOrder must never accept a caller/client-supplied edition key",
);
console.log("1-6. createPendingOrder: edition freeze -> exact entitlement guard -> insert ordering, fail-closed, no client override ✓");

// --- 7. createPurchaseFromPaidOrder copies verbatim, fails closed if missing ---
const createPurchaseBody = purchasesServer.slice(
  purchasesServer.indexOf("export async function createPurchaseFromPaidOrder"),
  purchasesServer.indexOf("export async function grantEntitlement"),
);
assert(
  createPurchaseBody.includes("if (!order.analysisEditionKey)") &&
    createPurchaseBody.includes("throw new AnalysisEditionUnavailableError"),
  "createPurchaseFromPaidOrder must fail closed when the order has no frozen edition",
);
assert(
  createPurchaseBody.includes("analysis_edition_key: order.analysisEditionKey"),
  "createPurchaseFromPaidOrder must copy the order's frozen edition verbatim",
);
assert(
  !/analysis_edition_key:\s*computeAnalysisEditionKey/.test(createPurchaseBody),
  "createPurchaseFromPaidOrder must never recompute the edition",
);
console.log("7. createPurchaseFromPaidOrder copies the order's frozen edition, never recomputes ✓");

// --- 8. markOrderPaid must never touch analysis_edition_key (order immutability) ---
const markOrderPaidBody = purchasesServer.slice(
  purchasesServer.indexOf("export async function markOrderPaid"),
  purchasesServer.indexOf("/** Idempotent: the unique constraint on purchases.order_id"),
);
assert(!markOrderPaidBody.includes("analysis_edition_key"), "markOrderPaid must never write analysis_edition_key (payment status transitions must not mutate the frozen edition)");
console.log("8. markOrderPaid cannot mutate the frozen order edition ✓");

// --- 9. API layer: no client edition field, safe non-500 mapping ---
assert(
  !/productId\?:.*analysisEditionKey|analysisEditionKey\?:/.test(ordersRoute),
  "POST /api/orders must not accept a client-supplied edition key field",
);
assert(
  /error instanceof AnalysisEditionUnavailableError[\s\S]{0,250}status: 409/.test(ordersRoute),
  "POST /api/orders must map AnalysisEditionUnavailableError to a safe non-500 response",
);
assert(ordersRoute.includes('code: "ANALYSIS_EDITION_UNAVAILABLE"'), "POST /api/orders must return a stable ANALYSIS_EDITION_UNAVAILABLE code");
console.log("9. API layer never trusts a client edition field, maps failure to a safe domain response ✓");

// --- 10. resolveAnalysisEditionForOrder: profile is always fetched (57D-48F-D2
// needs it for the frozen input snapshot regardless of policy), but the extra
// getSaju()/buildFreeAnalysis() saju CALCULATION only runs for DAEUN. ---
assert(
  forOrderSource.includes("getUserProfile("),
  "resolveAnalysisEditionForOrder must fetch the owned profile (needed to freeze the input snapshot for every policy)",
);
assert(
  /if \(policy !== "DAEUN"\) \{[\s\S]{0,200}\}\s*const saju = getSaju\(/.test(forOrderSource),
  "resolveAnalysisEditionForOrder must skip the extra saju/fortune calculation for non-DAEUN policies (early return before getSaju)",
);
assert(
  forOrderSource.includes("getSaju(") && forOrderSource.includes("buildFreeAnalysis("),
  "resolveAnalysisEditionForOrder must reuse the existing saju/free-analysis builders, not a second calculation path",
);
assert(
  !/fortune\s*:\s*input\.fortune|input\.daeunOrder|input\.daeunGanji/.test(forOrderSource),
  "resolveAnalysisEditionForOrder must never accept DAEUN fortune values from its caller/input",
);
console.log("10. DAEUN fortune context is server-resolved only when needed, never client/caller-supplied ✓");

// --- 11-16. deterministic freeze simulation: order-time key must survive a later recompute attempt ---
const monthlyOrderEdition = computeAnalysisEditionKey({ productId: "career-job-change", anchorDate: "2026-09-30" });
const monthlyNaiveRecompute = computeAnalysisEditionKey({ productId: "career-job-change", anchorDate: "2026-10-01" });
assert(monthlyOrderEdition === "MONTH:2026-09", "MONTHLY order created 2026-09-30 must freeze MONTH:2026-09");
assert(monthlyNaiveRecompute === "MONTH:2026-10", "sanity: a naive recompute after the boundary would differ");
assert(monthlyOrderEdition !== monthlyNaiveRecompute, "the frozen order/purchase edition must never equal what a later recompute would produce");
console.log("11. MONTHLY month-boundary freeze: order/purchase retain MONTH:2026-09, never recomputed to MONTH:2026-10 ✓");

const targetMonthOrderEdition = computeAnalysisEditionKey({ productId: "monthly-next", anchorDate: "2026-09-15" });
assert(targetMonthOrderEdition === "TARGET_MONTH:2026-10", "monthly-next order created 2026-09-15 must freeze TARGET_MONTH:2026-10");
console.log("12. TARGET_MONTH (monthly-next) freeze ✓");

const yearlyOrderEdition = computeAnalysisEditionKey({ productId: "wealth", anchorDate: "2026-12-31" });
const yearlyNaiveRecompute = computeAnalysisEditionKey({ productId: "wealth", anchorDate: "2027-01-01" });
assert(yearlyOrderEdition === "YEAR:2026", "YEARLY order created 2026-12-31 must freeze YEAR:2026");
assert(yearlyOrderEdition !== yearlyNaiveRecompute, "the frozen YEARLY edition must never equal what a post-boundary recompute would produce");
console.log("13. YEARLY year-boundary freeze: order/purchase retain YEAR:2026, never recomputed to YEAR:2027 ✓");

const targetYearOrderEdition = computeAnalysisEditionKey({ productId: "yearly-current", anchorDate: "2026-12-31" });
assert(targetYearOrderEdition === "TARGET_YEAR:2026", "yearly-current order created 2026-12-31 must freeze TARGET_YEAR:2026");
console.log("14. TARGET_YEAR (yearly-current) freeze at year boundary ✓");

const rangeOrderEdition = computeAnalysisEditionKey({ productId: "annual-3years", anchorDate: "2026-06-01" });
assert(rangeOrderEdition === "RANGE:2026-2028", "annual-3years order must freeze a deterministic RANGE");
console.log("15. ROLLING_MULTIYEAR (annual-3years) freeze ✓");

const daeunA = computeAnalysisEditionKey({ productId: "daeun-current", anchorDate: "2026-08-17", fortune: { daeunOrder: 4, daeunGanji: "무인" } });
const daeunB = computeAnalysisEditionKey({ productId: "daeun-current", anchorDate: "2026-08-17", fortune: { daeunOrder: 4, daeunGanji: "무인" } });
const daeunDifferentProfile = computeAnalysisEditionKey({ productId: "daeun-current", anchorDate: "2026-08-17", fortune: { daeunOrder: 6, daeunGanji: "정미" } });
assert(daeunA === "DAEUN:4:무인" && daeunA === daeunB, "DAEUN key must be stable/deterministic for the same profile fortune context");
assert(daeunDifferentProfile === "DAEUN:6:정미" && daeunDifferentProfile !== daeunA, "a different profile's fortune context must safely produce a different DAEUN edition");
console.log("16. DAEUN order freeze: deterministic per profile, safely differs across profiles ✓");

const lifetimeOrderEdition = computeAnalysisEditionKey({ productId: "lifetime-overview" });
assert(lifetimeOrderEdition === "LIFETIME", "lifetime-overview order must freeze bare LIFETIME");
console.log("17. LIFETIME order freeze ✓");

console.log("\nanalysis-edition-order-freeze-regression passed ✓");
void resolveAnalysisEditionForOrder; // referenced for the import/type-check above; DB-backed call path covered by the gated integration block
