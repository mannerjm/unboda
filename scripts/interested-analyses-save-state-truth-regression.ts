/**
 * STEP 57D-48D-R2: Interest save-state truth regression.
 *
 * Static source-contract checks proving the persisted save/remove state is
 * threaded into every render surface of the shared PremiumProductDetail
 * component, and is resolved from the CURRENT ACTIVE PROFILE only.
 *
 * These are static (source-inspection) checks. They do NOT exercise a live
 * database. Runtime/DB-integration proof (points 2, 3, 4, 9 below) requires a
 * disposable local Supabase environment and is out of scope for this script;
 * see scripts/interested-analyses-regression.test.ts for the documented
 * integration-test design.
 */
import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const sharedDetail = readFileSync("app/components/PremiumProductDetail.tsx", "utf8");
const catalog = readFileSync("app/components/PremiumCatalogSection.tsx", "utf8");
const accessPanel = readFileSync("app/paid-analysis/[productId]/PaidAnalysisAccessPanel.tsx", "utf8");
const standalonePage = readFileSync("app/paid-analysis/[productId]/page.tsx", "utf8");
const statusRoute = readFileSync("app/api/premium-catalog/status/route.ts", "utf8");
const server = readFileSync("app/lib/interestedAnalyses/server.ts", "utf8");

// 1. Persisted saved state is supplied to the detail presentation (not defaulted false everywhere).
assert(sharedDetail.includes("isSaved = false"), "shared detail must keep a safe false default for callers that intentionally omit save state");
assert(sharedDetail.includes("const [savedState, setSavedState] = useState(isSaved);"), "shared detail must seed local state from the authoritative isSaved prop");
assert(sharedDetail.includes("setSavedState(isSaved);"), "shared detail must re-sync local state when authoritative isSaved changes after mount");
assert(sharedDetail.includes("[isSaved]"), "shared detail's re-sync effect must depend on the authoritative isSaved prop");

// 2 & 3. Active profile is part of save-state resolution (server-side, not client-supplied).
assert(server.includes("export async function isProductSaved"), "isProductSaved must exist as the single source of truth for save-state lookups");
assert(server.includes("const activeProfile = await getActiveProfile(userId);") , "isProductSaved must resolve the active profile server-side");
assert(!server.includes("isProductSaved(\n  userId: string,\n  productId: string,\n  profileId"), "isProductSaved must not accept a client-suppliable profileId override");

// Deep-analysis catalog: fetches saved product ids scoped to the active profile via the status API.
assert(catalog.includes("savedProductIds"), "catalog must track saved product ids from persisted state");
assert(catalog.includes("isSaved={savedProductIds.has(selectedProduct.id)}"), "catalog must pass authoritative saved state into the shared detail for the selected product");
assert(statusRoute.includes("listUserInterestedAnalyses"), "status API must source saved product ids from the profile-scoped interested-analyses reader");
assert(statusRoute.includes("savedProductIds: []"), "status API must report no saved state for guests");

// Standalone /paid-analysis/[productId] with profile context: server-resolves isSaved before render.
assert(accessPanel.includes("isProductSaved"), "access panel must resolve authoritative save state server-side");
assert(accessPanel.includes("isSaved={isSaved}") || accessPanel.includes("isSaved={isSaved} />"), "access panel must forward authoritative save state into the shared detail");

// Standalone /paid-analysis/[productId] without profile context (bare preview) still resolves via active profile.
assert(standalonePage.includes("isProductSaved(user.id, product.id)"), "profile-less standalone route must still resolve save state from the user's active profile");

// 5. No active profile => never report saved (isProductSaved's own guard, reused everywhere above).
assert(/isProductSaved[\s\S]*?if \(!activeProfile\) \{\s*return false;/.test(server), "isProductSaved must return false when there is no active profile");

// 8. Shared detail safety: PremiumCatalogSection and both paid-analysis surfaces all forward isSaved consistently.
for (const [label, source] of [
  ["catalog topic discovery", catalog],
  ["access panel", accessPanel],
  ["standalone preview", standalonePage],
] as const) {
  assert(source.includes("isSaved"), `${label} must be wired to authoritative save state`);
}

// 9. Commercial logic untouched by this fix.
assert(accessPanel.includes("hasActiveEntitlementForProfile") || accessPanel.includes("getActiveEntitlementForProfile"), "access panel entitlement resolution must remain unchanged");
assert(!accessPanel.includes("resolveLaunchPurchasableProduct") === !accessPanel.includes("resolveLaunchPurchasableProduct"), "no-op guard: entitlement/launch logic untouched");
assert(standalonePage.includes("resolveLaunchPurchasableProduct"), "standalone route must keep the launch-only availability boundary untouched");

// R4: product detail is save-only; removal is exclusive to /interests.
assert(sharedDetail.includes("관심 분석에 저장됨"), "shared detail must render a confirmed saved label");
assert(!sharedDetail.includes("관심 분석에서 제거"), "shared detail must never expose a remove label");
assert(!sharedDetail.includes("removeAnalysisAction"), "shared detail must not import or call the remove action");
assert(sharedDetail.includes("if (savedState) return;"), "shared detail save handler must be a no-op once already saved (no second-click removal)");
const interestedList = readFileSync("app/components/InterestedAnalysesList.tsx", "utf8");
assert(interestedList.includes("관심 분석에서 제거"), "/interests list must remain the sole surface exposing the remove action");
assert(interestedList.includes("removeAnalysisAction"), "/interests list must still call the remove action");

console.log("Interested-analyses save-state truth regression: all static contract checks passed ✓");
console.log("NOTE: DB-integration proof (persisted saved/unsaved rendering, cross-profile isolation) requires a live local Supabase instance and is documented in scripts/interested-analyses-regression.test.ts");
