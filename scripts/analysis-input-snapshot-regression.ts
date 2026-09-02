// STEP 57D-48F-D2: immutable analysis input snapshot — static contract regression.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildAnalysisInputSnapshot, parseAnalysisInputSnapshot, ANALYSIS_INPUT_SNAPSHOT_VERSION } from "../app/lib/analysisInputSnapshot";
import type { ProfileDto } from "../app/lib/profiles/types";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

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

// --- 1. snapshot contains ONLY the canonical saju inputs, no unrelated metadata ---
const snapshot = buildAnalysisInputSnapshot(profile);
assert(snapshot.version === ANALYSIS_INPUT_SNAPSHOT_VERSION, "snapshot must carry a version");
assert(
  JSON.stringify(Object.keys(snapshot.birthData).sort()) ===
    JSON.stringify(["birthDate", "birthTime", "calendarType", "gender", "isLeapMonth"].sort()),
  "snapshot birthData must contain exactly the 5 canonical saju inputs, nothing more",
);
assert(!("label" in snapshot) && !JSON.stringify(snapshot).includes("테스트"), "snapshot must never include profile label/display name");
assert(!JSON.stringify(snapshot).includes(profile.id), "snapshot must never redundantly embed profile/user id");
assert(!("relationshipType" in snapshot.birthData), "snapshot must never include relationshipType (organizational metadata)");
console.log("1. snapshot contains only the 5 canonical saju inputs, no unrelated personal/account metadata ✓");

// --- 2. round-trips deterministically and validates ---
const reparsed = parseAnalysisInputSnapshot(JSON.parse(JSON.stringify(snapshot)));
assert(JSON.stringify(reparsed) === JSON.stringify(snapshot), "snapshot must round-trip through JSON without loss");
let rejectedMalformed = false;
try {
  parseAnalysisInputSnapshot({ version: 1, birthData: { birthDate: "not-a-date" } });
} catch {
  rejectedMalformed = true;
}
assert(rejectedMalformed, "parseAnalysisInputSnapshot must fail closed on malformed input");
console.log("2. snapshot validation round-trips and fails closed on malformed data ✓");

// --- 3. static contract: order/purchase freeze, generation consumption, migration additivity ---
const editionForOrder = read("app/lib/analysisEditionForOrder.ts");
const purchasesServer = read("app/lib/purchases/server.ts");
const detailRoute = read("app/api/paid-analysis-detail-v2/route.ts");
const migration031 = read("supabase/migrations/031_immutable_analysis_input_snapshot.sql");

assert(
  editionForOrder.includes("buildAnalysisInputSnapshot(profile)") &&
    !/policy !== "DAEUN"[\s\S]{0,40}buildAnalysisInputSnapshot/.test(editionForOrder),
  "resolveAnalysisEditionForOrder must build the input snapshot for EVERY policy, not only DAEUN",
);
assert(
  purchasesServer.includes("analysis_input_snapshot: analysisInputSnapshot"),
  "createPendingOrder must persist the frozen input snapshot on the new order",
);
assert(
  purchasesServer.includes("analysis_input_snapshot: order.analysisInputSnapshot") &&
    !/analysis_input_snapshot:\s*buildAnalysisInputSnapshot/.test(purchasesServer),
  "createPurchaseFromPaidOrder must copy the input snapshot verbatim, never recompute/refetch the profile",
);
assert(
  detailRoute.includes("generationProfile = { ...profile, ...inputSnapshot.birthData }"),
  "report generation must override live profile birth fields with the frozen snapshot",
);
assert(
  detailRoute.includes("ANALYSIS_INPUT_SNAPSHOT_INVALID") && detailRoute.includes("status: 409"),
  "a present-but-corrupted snapshot must fail closed with a safe domain response, not silently fall back to live profile data",
);
assert(
  migration031.includes("add column if not exists analysis_input_snapshot jsonb") &&
    (migration031.match(/add column if not exists analysis_input_snapshot jsonb/g) ?? []).length === 2,
  "migration must add the nullable snapshot column to exactly orders + purchases",
);
assert(
  !migration031.includes("alter table public.entitlements\n  add column if not exists analysis_input_snapshot") &&
    !migration031.includes("alter table public.paid_reports\n  add column if not exists analysis_input_snapshot"),
  "migration must not add the input snapshot to entitlements/paid_reports",
);
console.log("3. static contract: freeze at order creation, verbatim copy, generation consumption, fail-closed on corruption ✓");

// --- 4. account closure scrubs the frozen snapshot alongside profile/report content ---
assert(
  (migration031.match(/set analysis_input_snapshot = null/g) ?? []).length === 2,
  "account closure cleanup must scrub the frozen birth-data snapshot on both orders and purchases",
);
assert(
  migration031.includes("update public.entitlements") && migration031.includes("revocation_reason = 'ACCOUNT_CLOSED'"),
  "account closure cleanup must retain its existing entitlement revocation behavior unchanged",
);
console.log("4. account closure scrubs the frozen input snapshot, existing scrub/revocation behavior preserved ✓");

console.log("\nanalysis-input-snapshot-regression passed ✓");
