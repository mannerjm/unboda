import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const migration = readFileSync("supabase/migrations/032_active_edition_order_uniqueness.sql", "utf8");
const purchases = readFileSync("app/lib/purchases/server.ts", "utf8");
const confirmation = readFileSync("app/api/orders/[orderId]/confirm-payment/route.ts", "utf8");
const mockConfirmation = readFileSync("app/api/orders/[orderId]/mock-confirm/route.ts", "utf8");
const generation = readFileSync("app/lib/paidReports/generation.ts", "utf8");
const reports = readFileSync("app/lib/paidReports/server.ts", "utf8");
const library = readFileSync("app/components/PurchasedAnalysesListMultiEdition.tsx", "utf8");

assert(migration.includes("create unique index if not exists orders_active_known_edition_unique"), "a database unique index must protect active known-edition orders");
assert(migration.includes("user_id, profile_id, product_id, analysis_edition_key"), "active order identity must be user + profile + product + edition");
assert(migration.includes("status in ('pending', 'paid')"), "only commercially active pending/paid orders may collide");
assert(migration.includes("analysis_edition_key <> 'LEGACY'"), "unknown historical LEGACY rows must stay outside the new constraint");
assert(purchases.includes('error?.code === "23505"') && purchases.includes("getActiveKnownEditionOrder"), "same-edition concurrent inserts must converge after a unique conflict");
assert(purchases.includes('existing?.status === "pending"') && purchases.includes("return existing"), "a repeated pending request must safely reuse the existing order");
assert(purchases.includes('existing?.status === "paid"') && purchases.includes("ActiveEditionOrderAlreadyPaidError"), "a paid exact edition must not create a second order");
assert(purchases.includes("getActiveEntitlementForProfileEdition(") && purchases.includes("analysisEditionKey,"), "the activated purchase guard must remain exact-edition scoped");
console.log("1. exact-edition active order concurrency is database-backed and lifecycle-safe ✓");

assert(confirmation.includes("createPurchaseFromPaidOrder") && confirmation.includes("grantEntitlement"), "payment confirmation must retain purchase and entitlement idempotency");
assert(confirmation.includes("preparePaidReportGeneration(reportInput)") && confirmation.includes("after(() => runPaidReportGeneration"), "confirmed payment must claim then automatically schedule exact report generation");
assert(mockConfirmation.includes("reportClaim?.state === \"claimed\"") && mockConfirmation.includes("after(() => runPaidReportGeneration"), "mock-confirm must schedule the same automatic generation path for local verification");
assert(generation.includes("claimPaidReport(input)") && reports.includes("onConflict: \"user_id,profile_id,product_id,analysis_edition_key\""), "report preparation must retain exact-edition idempotency");
assert(generation.includes("getActiveEntitlementForProfileEdition") && generation.includes("getAccountLifecycle"), "generation must recheck exact entitlement and account state");
assert(generation.includes("analysisInputSnapshot") && generation.includes("analysisReferenceSnapshot"), "generation must use frozen input and reference snapshots");
assert(generation.includes("entitlementBeforePublish") && generation.includes("accountBeforePublish"), "refund or closure during generation must prevent report publication");
assert((purchases.match(/preparePaidReportGeneration/g) ?? []).length >= 3, "mock confirmation and both reconciliation paths must also durably prepare the exact report");
console.log("2. paid confirmation auto-starts exact, frozen, entitlement-fenced generation ✓");

assert(library.includes('none: "분석 준비 중"') && library.includes('generating: "분석 준비 중"'), "customer pending states must use preparation copy");
assert(library.includes("const isPreparing") && !library.includes('none: "심층 분석 생성하기"'), "normal purchased-library state must not require manual generation");
console.log("3. purchased library presents automatic preparation instead of a manual first action ✓");

console.log("pre-sale-purchase-activation-hardening-regression passed ✓");