/**
 * Phase 3B purchase persistence regression.
 *
 * Part 1 (always runs): pure helper unit checks + static contract checks on the
 * order/entitlement routes, gates and migration SQL. No network, no DB, no env.
 *
 * Part 2 (integration): requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * When those are absent the integration block is SKIPPED with an explicit reason —
 * it is never reported as a pass.
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  normalizePurchasableProductId,
  resolvePurchasableProduct,
} from "../app/lib/purchases/products";
import { getProductPricing } from "../app/lib/productPricing";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

// --- 1. only canonical, existing productIds are purchasable ---
const canonicalTopicIds = [
  "career-organization-fit",
  "money-wealth-accumulation",
  "relationship-new-connection",
  "social-helper",
  "health-energy",
  "business-startup",
];

assert(canonicalTopicIds.length >= 6, "at least 6 canonical topic products must be verified");

for (const topicId of canonicalTopicIds) {
  const resolved = resolvePurchasableProduct(topicId);
  assert(resolved.ok, `canonical topic product "${topicId}" must be purchasable`);
  assert(
    resolved.ok && resolved.productId === topicId,
    `canonical topic productId "${topicId}" must not be rewritten`,
  );
  assert(
    resolved.ok && resolved.amount === getProductPricing(topicId).amount,
    `amount for "${topicId}" must come from the server pricing source`,
  );
}
console.log("1. canonical topic productIds resolve with server-side amount ✓");

// --- 2. invalid productIds are rejected ---
const invalidInputs: unknown[] = [
  "",
  "   ",
  "not-a-real-product",
  "career-business",
  null,
  undefined,
  123,
  { productId: "career" },
  ["career"],
];

for (const invalid of invalidInputs) {
  const resolved = resolvePurchasableProduct(invalid);
  assert(!resolved.ok, `invalid productId ${JSON.stringify(invalid)} must be rejected`);
  assert(
    normalizePurchasableProductId(invalid) === null,
    `normalizePurchasableProductId must return null for ${JSON.stringify(invalid)}`,
  );
}
console.log("2. invalid / non-registry productIds rejected ✓");

// --- 3. legacy registry IDs + aliases keep their canonical mapping ---
for (const registryId of ["career", "wealth", "relationship", "health"]) {
  const resolved = resolvePurchasableProduct(registryId);
  assert(resolved.ok, `registry product "${registryId}" must remain purchasable`);
  assert(
    resolved.ok && resolved.productId === registryId,
    `registry product "${registryId}" must map to itself`,
  );
}
assert(
  normalizePurchasableProductId("love") === "relationship",
  'alias "love" must canonicalize to "relationship"',
);
assert(
  normalizePurchasableProductId("money") === "wealth",
  'alias "money" must canonicalize to "wealth"',
);
console.log("3. registry IDs + canonical aliases preserved ✓");

// --- 4. order API: auth required, server-owned identity and amount ---
const ordersRoute = read("app/api/orders/route.ts");
assert(ordersRoute.includes("getCurrentUser"), "orders route must call getCurrentUser()");
assert(ordersRoute.includes("status: 401"), "orders route must return 401 when unauthenticated");
assert(ordersRoute.includes("status: 400"), "orders route must return 400 for invalid productId");
assert(
  ordersRoute.includes("resolvePurchasableProduct"),
  "orders route must canonicalize/validate productId",
);
assert(
  ordersRoute.includes("userId: user.id"),
  "orders route must take userId from the session, not the request body",
);
assert(
  !ordersRoute.includes("body.amount") && !ordersRoute.includes("amount:"),
  "orders route must not accept a client-supplied amount",
);
assert(
  !ordersRoute.includes("body.userId") && !ordersRoute.includes("body.status"),
  "orders route must not read userId/status from the request body",
);
console.log("4. POST /api/orders enforces auth + server-side productId/amount ✓");

// --- 5. mock confirm: auth + ownership + idempotency ---
const confirmRoute = read("app/api/orders/[orderId]/mock-confirm/route.ts");
assert(confirmRoute.includes("getCurrentUser"), "mock-confirm must call getCurrentUser()");
assert(confirmRoute.includes("status: 401"), "mock-confirm must return 401 when unauthenticated");
assert(confirmRoute.includes("status: 404"), "mock-confirm must return 404 for a foreign/unknown order");
assert(
  confirmRoute.includes("confirmMockPayment(orderId, user.id)"),
  "mock-confirm must scope the order to the session user (ownership check)",
);

const purchasesServer = read("app/lib/purchases/server.ts");
assert(
  purchasesServer.includes('.eq("user_id", userId)') ||
    purchasesServer.includes('.eq("user_id", order.userId)'),
  "server layer must always scope order access by user_id",
);
assert(
  purchasesServer.includes('onConflict: "order_id"'),
  "purchase creation must be idempotent via onConflict order_id",
);
assert(
  purchasesServer.includes('onConflict: "user_id,profile_id,resource_id,resource_type"'),
  "entitlement grant must be idempotent via unique (user_id, profile_id, resource_id, resource_type)",
);
assert(
  purchasesServer.includes("profile_id: order.profileId") &&
    purchasesServer.includes("profile_id: input.profileId"),
  "purchase and entitlement persistence must retain the verified order/profile scope",
);
assert(
  purchasesServer.includes("resolvePurchasableProduct"),
  "server layer must validate canonical productId before writing",
);
console.log("5. mock-confirm is auth-scoped, owner-checked and idempotent ✓");

// --- 6. paid analysis API: auth + entitlement BEFORE any OpenAI call ---
const detailRoute = read("app/api/paid-analysis-detail-v2/route.ts");
assert(detailRoute.includes("getCurrentUser"), "detail route must call getCurrentUser()");
assert(detailRoute.includes("status: 401"), "detail route must return 401 when unauthenticated");
assert(detailRoute.includes("status: 400"), "detail route must return 400 for an invalid product");
assert(detailRoute.includes("status: 403"), "detail route must return 403 without entitlement");

const authIndex = detailRoute.indexOf("getCurrentUser");
const entitlementIndex = detailRoute.indexOf("hasActiveEntitlement");
const generateIndex = detailRoute.indexOf("generatePaidAnalysisDetailV2(");
assert(authIndex !== -1 && entitlementIndex !== -1 && generateIndex !== -1, "detail route markers present");
assert(
  authIndex < generateIndex && entitlementIndex < generateIndex,
  "auth + entitlement checks must run before the OpenAI generation call",
);
console.log("6. /api/paid-analysis-detail-v2 gated by auth + entitlement before OpenAI ✓");

// --- 7. access gates are server-side and no longer trust localStorage ---
const gateFiles = [
  "app/paid-analysis/[productId]/PaidAnalysisAccessPanel.tsx",
  "app/paid-analysis/[productId]/report/ReportAccessGate.tsx",
];

for (const gateFile of gateFiles) {
  const source = read(gateFile);
  assert(!source.includes('"use client"'), `${gateFile} must be a server component`);
  assert(
    source.includes("getCurrentUser") &&
      source.includes('from "@/app/lib/purchases/server"'),
    `${gateFile} must resolve entitlements from the server DB layer`,
  );
  assert(
    !source.includes("loadEntitlements") && !source.includes("unboda-entitlements"),
    `${gateFile} must not read localStorage entitlements`,
  );
  assert(
    !source.includes("NODE_ENV"),
    `${gateFile} must not contain a NODE_ENV access bypass`,
  );
}
console.log("7. access gates are server-side, no localStorage, no NODE_ENV bypass ✓");

// --- 8. localStorage is no longer a purchase/entitlement authority ---
const purchaseStorage = read("app/lib/purchaseStorage.ts");
for (const removed of ["savePurchase", "saveEntitlement", "loadPurchases", "loadEntitlements"]) {
  assert(
    !purchaseStorage.includes(`export function ${removed}`),
    `purchaseStorage.ts must no longer export ${removed}`,
  );
}
assert(
  purchaseStorage.includes("clearLegacyPurchaseStorage"),
  "purchaseStorage.ts should only expose legacy cleanup",
);

const checkoutPanel = read("app/checkout/[productId]/CheckoutAccessPanel.tsx");
assert(
  !checkoutPanel.includes("savePurchase") && !checkoutPanel.includes("saveEntitlement"),
  "checkout panel must not write purchases/entitlements to localStorage",
);
assert(
  checkoutPanel.includes('fetch("/api/orders"') &&
    checkoutPanel.includes("mock-confirm"),
  "checkout panel must create the order and confirm payment through the server API",
);
assert(
  !checkoutPanel.includes("getProductPricing"),
  "checkout panel must not compute the amount client-side",
);
assert(
  !/body: JSON.stringify\(\{[^}]*userId/.test(checkoutPanel),
  "checkout panel must not send a client-chosen userId",
);
console.log("8. localStorage removed as purchase/entitlement source of truth ✓");

// --- 9. migration SQL: RLS, least privilege, uniqueness ---
const migration = read("supabase/migrations/001_phase3b_purchase_persistence.sql");
for (const table of ["orders", "purchases", "entitlements"]) {
  assert(
    migration.includes(`create table if not exists public.${table}`),
    `migration must create public.${table}`,
  );
  assert(
    migration.includes(`alter table public.${table} enable row level security`),
    `migration must enable RLS on public.${table}`,
  );
  assert(
    migration.includes(`"${table}_select_own"`),
    `migration must define a self-scoped select policy on ${table}`,
  );
}
assert(
  !/for\s+insert/i.test(migration) && !/for\s+update/i.test(migration),
  "migration must not grant insert/update policies to client roles",
);
assert(
  migration.includes("purchases_order_id_unique unique (order_id)"),
  "purchases must have a unique constraint on order_id",
);
assert(
  migration.includes(
    "entitlements_user_resource_unique unique (user_id, resource_id, resource_type)",
  ),
  "entitlements must be unique per (user_id, resource_id, resource_type)",
);
assert(
  migration.includes("status in ('pending', 'paid', 'failed', 'canceled')"),
  "orders.status must align with the PaymentStatus union",
);
console.log("9. migration enforces RLS, least privilege and uniqueness ✓");

// --- 10. service role key is server-only ---
const adminClient = read("app/lib/supabase/admin.ts");
assert(
  adminClient.includes("process.env.SUPABASE_SERVICE_ROLE_KEY"),
  "admin client must read SUPABASE_SERVICE_ROLE_KEY",
);
assert(
  !adminClient.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"),
  "service role key must never be a NEXT_PUBLIC_* variable",
);
const browserClient = read("app/lib/supabase/client.ts");
assert(
  !browserClient.includes("SERVICE_ROLE"),
  "browser client must not reference the service role key",
);
console.log("10. service_role key stays server-only ✓");

// --- 11. integration block (env dependent) ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const integrationUserId = process.env.PHASE3B_TEST_USER_ID;
const otherUserId = process.env.PHASE3B_TEST_OTHER_USER_ID;
const integrationProfileId = process.env.PHASE3B_TEST_PROFILE_ID;
const otherProfileId = process.env.PHASE3B_TEST_OTHER_PROFILE_ID;

const missingEnv = [
  supabaseUrl ? null : "NEXT_PUBLIC_SUPABASE_URL",
  serviceRoleKey ? null : "SUPABASE_SERVICE_ROLE_KEY",
  integrationUserId ? null : "PHASE3B_TEST_USER_ID",
  otherUserId ? null : "PHASE3B_TEST_OTHER_USER_ID",
  integrationProfileId ? null : "PHASE3B_TEST_PROFILE_ID",
  otherProfileId ? null : "PHASE3B_TEST_OTHER_PROFILE_ID",
].filter((name): name is string => name !== null);

async function runIntegration(): Promise<void> {
  const {
    createPendingOrder,
    confirmMockPayment,
    hasActiveEntitlementForProfile,
    listUserEntitlements,
  } = await import("../app/lib/purchases/server");

  const productId = "money-wealth-accumulation";

  const order = await createPendingOrder({
    userId: integrationUserId!,
    profileId: integrationProfileId!,
    productId,
  });
  assert(order.status === "pending", "new order must start as pending");
  assert(order.profileId === integrationProfileId, "new order must retain its profileId");
  assert(order.productId === productId, "order must store the canonical productId");
  assert(
    order.amount === getProductPricing(productId).amount,
    "order amount must come from the server pricing source",
  );

  const first = await confirmMockPayment(order.id, integrationUserId!);
  assert(first !== null, "owner must be able to confirm the mock payment");
  assert(first!.order.status === "paid", "confirmed order must be paid");
  assert(first!.purchase.profileId === integrationProfileId, "purchase must inherit the order profileId");
  assert(first!.entitlement.resourceId === productId, "entitlement must use the canonical productId");
  assert(first!.entitlement.profileId === integrationProfileId, "entitlement must inherit the order profileId");
  assert(first!.entitlement.purchaseId === first!.purchase.id, "purchase entitlement must record its purchaseId");
  assert(first!.entitlement.source === "purchase", "purchase entitlement source must be purchase");

  const second = await confirmMockPayment(order.id, integrationUserId!);
  assert(second !== null, "repeat confirm must stay successful");
  assert(
    second!.purchase.id === first!.purchase.id &&
      second!.entitlement.id === first!.entitlement.id,
    "repeat confirm must not create duplicate purchase/entitlement rows",
  );

  const foreign = await confirmMockPayment(order.id, otherUserId!);
  assert(foreign === null, "another user must not be able to confirm someone else's order");

  assert(
    await hasActiveEntitlementForProfile(integrationUserId!, integrationProfileId!, productId),
    "owner must have an active entitlement after payment",
  );
  assert(
    !(await hasActiveEntitlementForProfile(otherUserId!, otherProfileId!, productId)),
    "another user must not inherit the entitlement",
  );
  assert(
    !(await hasActiveEntitlementForProfile(integrationUserId!, integrationProfileId!, "not-a-real-product")),
    "invalid productId must never resolve to an entitlement",
  );

  const entitlements = await listUserEntitlements(integrationUserId!);
  assert(
    entitlements.filter((item) => item.resourceId === productId).length === 1,
    "exactly one entitlement row must exist for the product",
  );

  console.log("11. DB integration: order → purchase → entitlement, idempotent + owner-scoped ✓");
}

async function main(): Promise<void> {
  if (missingEnv.length > 0) {
    console.log(
      `11. DB integration SKIPPED (not a pass): missing env ${missingEnv.join(", ")}. ` +
        "Set these to run the live Supabase integration checks.",
    );
  } else {
    await runIntegration();
  }

  console.log("\npurchase-persistence-phase3b-regression passed ✓");
}

void main();
