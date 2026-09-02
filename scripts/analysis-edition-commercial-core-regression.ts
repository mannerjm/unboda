// STEP 57D-48F-D: edition-safe commercial core — static contract regression.
//
// Proves: entitlement/paid-report identity is edition-scoped, edition is
// always sourced from the frozen purchase/order (never recomputed/current
// date), migration 030 widens uniqueness safely, and the frozen anchorDate
// actually changes computed fortune (the DAEUN "generation must not drift to
// a later now" fix from 48F-C/48F-D).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildPaidAnalysisInputFromProfile } from "../app/lib/paidAnalysisProfileInput";
import type { ProfileDto } from "../app/lib/profiles/types";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const purchasesServer = read("app/lib/purchases/server.ts");
const paidReportsServer = read("app/lib/paidReports/server.ts");
const migration030 = read("supabase/migrations/030_edition_scoped_entitlement_paid_report_identity.sql");

// --- 1. entitlement identity is edition-scoped, edition never recomputed ---
assert(
  migration030.includes("entitlements_user_profile_resource_edition_unique unique") &&
    /resource_type,\s*analysis_edition_key/.test(migration030),
  "migration must widen entitlement uniqueness to include analysis_edition_key",
);
assert(
  purchasesServer.includes('onConflict: "user_id,profile_id,resource_id,resource_type,analysis_edition_key"'),
  "grantEntitlement upsert must target the edition-scoped unique key",
);
const grantEntitlementBody = purchasesServer.slice(
  purchasesServer.indexOf("export async function grantEntitlement"),
  purchasesServer.indexOf("export async function getActiveEntitlementForProfile"),
);
assert(
  grantEntitlementBody.includes("analysisEditionKey: string") &&
    !grantEntitlementBody.includes("computeAnalysisEditionKey") &&
    !grantEntitlementBody.includes("getServerAnchorDate") &&
    !grantEntitlementBody.includes("new Date()"),
  "grantEntitlement must require an edition key and never compute one itself",
);
assert(
  grantEntitlementBody.includes("if (!input.analysisEditionKey)") &&
    grantEntitlementBody.includes("AnalysisEditionUnavailableError"),
  "grantEntitlement must fail closed when the edition key is missing",
);
console.log("1. entitlement identity is edition-scoped, edition sourced from caller, fail-closed ✓");

// --- 2. distinct coarse (ANY edition) vs exact-edition entitlement lookups ---
assert(
  purchasesServer.includes("export async function getActiveEntitlementForProfileEdition") &&
    purchasesServer.includes("export async function hasActiveEntitlementForProfileEdition"),
  "a distinct exact-edition entitlement lookup must exist alongside the coarse ANY-edition helper",
);
assert(
  purchasesServer.includes('export async function hasActiveEntitlementForProfile(') &&
    /hasActiveEntitlementForProfile[\s\S]{0,120}getActiveEntitlementForProfile\(userId, profileId, productId\)/.test(purchasesServer),
  "hasActiveEntitlementForProfile (used by the P0 guard) must keep its coarse ANY-edition semantics unchanged",
);
console.log("2. coarse ANY-edition vs exact-edition entitlement lookups both exist, P0 helper unchanged ✓");

// --- 3. paid report identity is edition-scoped, never recomputed ---
assert(
  migration030.includes("paid_reports_user_profile_product_edition_unique unique") &&
    /product_id,\s*analysis_edition_key/.test(migration030),
  "migration must widen paid_reports uniqueness to include analysis_edition_key",
);
assert(
  paidReportsServer.includes('onConflict: "user_id,profile_id,product_id,analysis_edition_key"'),
  "claimPaidReport upsert must target the edition-scoped unique key",
);
const claimPaidReportBody = paidReportsServer.slice(
  paidReportsServer.indexOf("export async function claimPaidReport"),
);
assert(
  claimPaidReportBody.includes("analysisEditionKey: string") &&
    !claimPaidReportBody.includes("computeAnalysisEditionKey") &&
    !claimPaidReportBody.includes("getServerAnchorDate"),
  "claimPaidReport must require an edition key and never compute one itself",
);
assert(
  (claimPaidReportBody.match(/\.eq\("analysis_edition_key", input\.analysisEditionKey\)/g) ?? []).length >= 1,
  "claimPaidReport's reclaim/retry query must stay scoped to the exact edition",
);
console.log("3. paid report identity is edition-scoped, edition sourced from caller, retry stays edition-scoped ✓");

// --- 4. refund revocation fences on the frozen order edition via order_id, never recomputed ---
assert(
  /join public\.orders ord on ord\.id = workflow\.order_id/.test(migration030) &&
    /ord\.analysis_edition_key is not distinct from entitlement\.analysis_edition_key/.test(migration030),
  "revoke_refund_entitlement must fence on the frozen order's edition via order_id, not recompute",
);
assert(
  !/computeAnalysisEditionKey|getServerAnchorDate/.test(read("app/lib/refunds/server.ts")),
  "refund revocation code must never recompute the current edition",
);
console.log("4. refund revocation fences on the frozen order edition via order_id ✓");

// --- 5. migration is additive-only: old constraints only dropped by name, not data-destructive ---
assert(!/drop table|truncate/i.test(migration030), "migration must not drop or truncate any table");
assert(migration030.includes("add column if not exists analysis_reference_snapshot jsonb"), "migration must add the frozen reference-context snapshot column");
console.log("5. migration 030 is additive-only (no drop/truncate) ✓");

// --- 6. account closure stays account-wide (revokes ALL active editions of a product) ---
const revokeEntitlementBody = purchasesServer.slice(
  purchasesServer.indexOf("async function revokeEntitlement("),
  purchasesServer.indexOf("export async function revokeEntitlementForRefund"),
);
assert(
  !revokeEntitlementBody.includes(".maybeSingle<EntitlementRow>()") ||
    revokeEntitlementBody.indexOf(".maybeSingle<EntitlementRow>()") > revokeEntitlementBody.indexOf("rpc(\"revoke_refund_entitlement\""),
  "the account-closure (non-RPC) update path must not crash via maybeSingle when multiple editions are active",
);
console.log("6. account-closure revocation path is safe against multiple simultaneously-active editions ✓");

// --- 7. CRITICAL: frozen anchorDate must actually change computed fortune (not just cosmetic labels) ---
const profile: ProfileDto = {
  id: "00000000-0000-0000-0000-000000000000",
  label: "테스트",
  relationshipType: "self",
  birthDate: "1995-05-20",
  birthTime: "09:00",
  calendarType: "양력",
  isLeapMonth: false,
  gender: "남성",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const frozenPastInput = buildPaidAnalysisInputFromProfile(profile, "daeun-current", "2010-01-01");
const frozenLaterInput = buildPaidAnalysisInputFromProfile(profile, "daeun-current", "2026-08-17");
assert(
  frozenPastInput.referencePeriod?.anchorDate === "2010-01-01" &&
    frozenLaterInput.referencePeriod?.anchorDate === "2026-08-17",
  "referencePeriod.anchorDate must reflect the frozen anchor passed in, not live now",
);
assert(
  JSON.stringify(frozenPastInput.fortuneTiming) !== JSON.stringify(frozenLaterInput.fortuneTiming),
  "CRITICAL: a different frozen anchorDate must actually change computed fortune context (not just cosmetic labels) — " +
    "this proves generation anchored at order time will not silently drift to a later real-world 'now'",
);
console.log("7. frozen anchorDate changes real computed fortune context (generation-drift fix verified) ✓");

console.log("\nanalysis-edition-commercial-core-regression passed ✓");
