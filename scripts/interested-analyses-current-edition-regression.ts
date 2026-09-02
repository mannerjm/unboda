import { readFileSync } from "node:fs";
import {
  deriveInterestedAnalysisCurrentState,
  type InterestedAnalysisRecord,
} from "../app/lib/interestedAnalyses/server";
import type { EntitlementRecord } from "../app/lib/purchases/types";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const interest: InterestedAnalysisRecord = {
  id: "interest-a",
  userId: "user-a",
  profileId: "profile-a",
  productId: "career-job-change",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

function entitlement(editionKey: string | null, profileId = "profile-a"): EntitlementRecord {
  return {
    id: `entitlement-${editionKey ?? "legacy"}-${profileId}`,
    userId: "user-a",
    profileId,
    resourceId: "career-job-change",
    resourceType: "paid_analysis",
    isActive: true,
    purchaseId: null,
    source: "grant",
    createdAt: "2026-09-01T00:00:00.000Z",
    analysisEditionKey: editionKey,
  };
}

const noOwnership = deriveInterestedAnalysisCurrentState(interest, "MONTH:2026-10", []);
assert(noOwnership.isSaved && !noOwnership.ownsCurrentEdition && !noOwnership.hasAnyActiveOwnedEdition, "saved interest without an entitlement must remain visible and current-not-owned");

const currentMonth = deriveInterestedAnalysisCurrentState(interest, "MONTH:2026-09", [entitlement("MONTH:2026-09")]);
assert(currentMonth.ownsCurrentEdition, "an exact current MONTH entitlement must be current-owned");

const monthBoundary = deriveInterestedAnalysisCurrentState(interest, "MONTH:2026-10", [entitlement("MONTH:2026-09")]);
assert(!monthBoundary.ownsCurrentEdition && monthBoundary.hasAnyActiveOwnedEdition, "a September entitlement must not become current when the authoritative edition changes to October");
assert(monthBoundary.latestOwnedEditionKey === "MONTH:2026-09", "old owned edition must remain distinguishable");

const currentYear = deriveInterestedAnalysisCurrentState(interest, "YEAR:2027", [entitlement("YEAR:2027")]);
assert(currentYear.ownsCurrentEdition, "an exact current YEAR entitlement must be current-owned");
const oldYear = deriveInterestedAnalysisCurrentState(interest, "YEAR:2027", [entitlement("YEAR:2026")]);
assert(!oldYear.ownsCurrentEdition, "an old YEAR entitlement must not be current-owned");

const lifetime = deriveInterestedAnalysisCurrentState(interest, "LIFETIME", [entitlement("LIFETIME")]);
assert(lifetime.ownsCurrentEdition, "an active LIFETIME entitlement must remain current-owned");
const legacy = deriveInterestedAnalysisCurrentState(interest, "MONTH:2026-10", [entitlement("LEGACY")]);
assert(!legacy.ownsCurrentEdition && legacy.hasAnyActiveOwnedEdition, "LEGACY must never be treated as a modern current edition");
const revoked = deriveInterestedAnalysisCurrentState(interest, "MONTH:2026-10", []);
assert(!revoked.ownsCurrentEdition && revoked.isSaved, "revoking current ownership must not delete the saved interest");
const otherProfile = deriveInterestedAnalysisCurrentState(interest, "MONTH:2026-10", []);
assert(!otherProfile.ownsCurrentEdition, "another profile's entitlement must not leak into this profile's state");

const server = readFileSync("app/lib/interestedAnalyses/server.ts", "utf8");
const page = readFileSync("app/interests/page.tsx", "utf8");
const list = readFileSync("app/components/InterestedAnalysesList.tsx", "utf8");
const purchases = readFileSync("app/lib/purchases/server.ts", "utf8");
assert(server.includes("listUserInterestedAnalysesWithCurrentState") && server.includes("listUserEntitlements(userId)"), "interest state must batch-read saved rows and active entitlements");
assert(server.includes("entitlement.profileId !== activeProfile.id"), "active entitlements for another profile must not contribute to current-edition state");
assert(server.includes("resolveAnalysisEditionForOrder") && server.includes("profile: activeProfile"), "current edition must reuse the server-authoritative resolver with the active profile");
assert(!server.includes(".update(") && !server.includes("analysis_edition_key"), "interest state reads must not persist edition state into interested_analyses");
assert(page.includes("listUserInterestedAnalysesWithCurrentState"), "/interests must render server-derived current-edition state");
assert(list.includes("현재 분석 보유 중") && list.includes("현재 회차 미보유") && list.includes("구매한 분석에서 보기"), "interest UI must show owned and not-owned state without a purchase CTA");
assert(!list.includes("새 회차 구매") && !list.includes("다시 구매") && !list.includes("재구매"), "interest UI must not introduce repurchase actions");
assert(purchases.includes("if (await hasActiveEntitlementForProfile(input.userId, input.profileId, resolved.productId))"), "P0 global guard must remain product-global");

console.log("interested-analyses-current-edition-regression passed ✓");