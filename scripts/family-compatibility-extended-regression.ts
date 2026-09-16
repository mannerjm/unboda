import { readFileSync } from "node:fs";
import { buildCompatibilityTiming } from "../app/lib/compatibilityTiming";
import {
  buildPartnerCompatibilitySnapshot,
  buildProfileCompatibilitySnapshot,
  validateCompatibilityPartnerInput,
} from "../app/lib/compatibilityCustomerInput";
import {
  FAMILY_OTHER_DOMAINS,
  FAMILY_SIBLING_DOMAINS,
  buildFamilyOtherCompatibility,
  buildFamilySiblingCompatibility,
  resolveFamilyOtherRolePair,
} from "../app/lib/familyCompatibilityExtended";
import {
  buildFamilyOtherPaidEditionKey,
  buildFamilyOtherPaidInputSnapshot,
  buildFamilySiblingPaidEditionKey,
  buildFamilySiblingPaidInputSnapshot,
} from "../app/lib/familyCompatibilityExtendedPaidAnalysis";
import { FAMILY_PARENT_CHILD_DOMAINS } from "../app/lib/familyCompatibilityParentChild";
import {
  COMPATIBILITY_FAMILY_OTHER_PRODUCT,
  COMPATIBILITY_FAMILY_OTHER_SESSION_KEY,
  COMPATIBILITY_FAMILY_SIBLING_PRODUCT,
  COMPATIBILITY_FAMILY_SIBLING_SESSION_KEY,
} from "../app/lib/specialAnalysisProducts";
import type { ProfileDto } from "../app/lib/profiles/types";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const evaluationDate = "2026-09-16";
const profile: ProfileDto = {
  id: "00000000-0000-4000-8000-000000000001",
  label: "나",
  relationshipType: "self",
  birthDate: "1990-05-15",
  birthTime: "10:30",
  gender: "남성",
  calendarType: "양력",
  isLeapMonth: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const memberInput = validateCompatibilityPartnerInput({
  label: "가족",
  birthDate: "1992-07-20",
  birthTimeKnown: true,
  birthTime: "14:20",
  gender: "여성",
  calendarType: "양력",
  isLeapMonth: false,
});
assert(memberInput.valid, "family member input must validate");

const mine = buildProfileCompatibilitySnapshot(profile, evaluationDate);
const member = buildPartnerCompatibilitySnapshot(memberInput.value, evaluationDate);
const timing = buildCompatibilityTiming(mine.person, member.person, {
  evaluationYear: 2026,
  A: mine.timing,
  B: member.timing,
});

const siblingA = buildFamilySiblingCompatibility(timing);
const siblingB = buildFamilySiblingCompatibility(timing);
assert(JSON.stringify(siblingA) === JSON.stringify(siblingB), "sibling compatibility must be deterministic");
assert(siblingA.relationshipType === "siblings", "sibling model must preserve its relationship type");
assert(Object.keys(siblingA.domains).sort().join("|") === [...FAMILY_SIBLING_DOMAINS].sort().join("|"), "sibling model must expose only its dedicated domains");
assert(siblingA.directions.userToSibling.level === timing.base.directionalInfluence.BReceivesFromA.level, "A=user to B=sibling direction must remain semantic");
assert(siblingA.directions.siblingToUser.level === timing.base.directionalInfluence.AReceivesFromB.level, "B=sibling to A=user direction must remain semantic");

assert(resolveFamilyOtherRolePair("grandparent_grandchild", "grandparent")?.familyMember === "grandchild", "grandparent relation must map counterpart to grandchild");
assert(resolveFamilyOtherRolePair("grandparent_grandchild", "grandchild")?.familyMember === "grandparent", "grandchild relation must map counterpart to grandparent");
assert(resolveFamilyOtherRolePair("aunt_uncle_niece_nephew", "aunt_uncle")?.familyMember === "niece_nephew", "aunt/uncle relation must map to niece/nephew");
assert(resolveFamilyOtherRolePair("aunt_uncle_niece_nephew", "niece_nephew")?.familyMember === "aunt_uncle", "niece/nephew relation must map to aunt/uncle");
assert(resolveFamilyOtherRolePair("cousins", "cousin")?.familyMember === "cousin", "cousin relation must remain symmetric");
assert(resolveFamilyOtherRolePair("in_laws", "in_law")?.familyMember === "in_law", "in-law relation must remain symmetric");
assert(resolveFamilyOtherRolePair("other_relatives", "relative")?.familyMember === "relative", "other relative relation must remain symmetric");
assert(resolveFamilyOtherRolePair("grandparent_grandchild", "cousin") === null, "invalid other-family role pair must fail closed");

const otherRoles = resolveFamilyOtherRolePair("grandparent_grandchild", "grandparent");
assert(otherRoles, "other-family role semantics must resolve");
const otherResult = buildFamilyOtherCompatibility(timing, "grandparent_grandchild", otherRoles);
assert(otherResult.relationshipType === "other_family", "other-family model must preserve its relationship type");
assert(Object.keys(otherResult.domains).sort().join("|") === [...FAMILY_OTHER_DOMAINS].sort().join("|"), "other-family model must expose only its dedicated domains");
assert(JSON.stringify([...FAMILY_SIBLING_DOMAINS].sort()) !== JSON.stringify([...FAMILY_PARENT_CHILD_DOMAINS].sort()), "sibling domains must not be a renamed parent-child contract");
assert(JSON.stringify([...FAMILY_OTHER_DOMAINS].sort()) !== JSON.stringify([...FAMILY_PARENT_CHILD_DOMAINS].sort()), "other-family domains must not be a renamed parent-child contract");

const siblingSnapshot = buildFamilySiblingPaidInputSnapshot({
  evaluationDate,
  evaluationYear: 2026,
  myProfileLabel: profile.label,
  familyMemberLabel: memberInput.value.label,
  familyMemberBirthTimeKnown: true,
  mine,
  familyMember: member,
});
const siblingEdition2026 = buildFamilySiblingPaidEditionKey(siblingSnapshot);
const siblingEdition2027 = buildFamilySiblingPaidEditionKey({ ...siblingSnapshot, evaluationDate: "2027-09-16", evaluationYear: 2027 });
assert(/^FAMILY_SIBLINGS_YEAR:2026:[a-f0-9]{16}$/.test(siblingEdition2026), "sibling edition must bind purchase year and natal pair");
assert(siblingEdition2026.split(":").at(-1) === siblingEdition2027.split(":").at(-1), "sibling natal fingerprint must remain stable across years");
assert(siblingEdition2027.startsWith("FAMILY_SIBLINGS_YEAR:2027:"), "new year must create a new sibling edition");

const otherSnapshot = buildFamilyOtherPaidInputSnapshot({
  relationshipKind: "grandparent_grandchild",
  userRole: otherRoles.user,
  familyMemberRole: otherRoles.familyMember,
  evaluationDate,
  evaluationYear: 2026,
  myProfileLabel: profile.label,
  familyMemberLabel: memberInput.value.label,
  familyMemberBirthTimeKnown: true,
  mine,
  familyMember: member,
});
const otherEdition = buildFamilyOtherPaidEditionKey(otherSnapshot);
const changedRelationshipEdition = buildFamilyOtherPaidEditionKey({
  ...otherSnapshot,
  relationshipKind: "other_relatives",
  userRole: "relative",
  familyMemberRole: "relative",
});
assert(/^FAMILY_OTHER_YEAR:2026:[a-f0-9]{16}$/.test(otherEdition), "other-family edition must bind year, relationship semantics and natal pair");
assert(otherEdition !== changedRelationshipEdition, "changing other-family relationship semantics must create a different edition");

assert(COMPATIBILITY_FAMILY_SIBLING_PRODUCT.amount === 19_900, "sibling compatibility must use the family premium price");
assert(COMPATIBILITY_FAMILY_OTHER_PRODUCT.amount === 19_900, "other-family compatibility must use the family premium price");
assert(COMPATIBILITY_FAMILY_SIBLING_SESSION_KEY !== COMPATIBILITY_FAMILY_OTHER_SESSION_KEY, "extended family raw-input session keys must remain isolated");

const selector = readFileSync("app/components/FamilyCompatibilityAnalysisClient.tsx", "utf8");
const inputClient = readFileSync("app/components/PaidFamilyExtendedAnalysisClient.tsx", "utf8");
const orderRoute = readFileSync("app/api/orders/family-extended/route.ts", "utf8");
const checkoutPanel = readFileSync("app/checkout/[productId]/FamilyExtendedCheckoutAccessPanel.tsx", "utf8");
const generation = readFileSync("app/lib/paidReports/generation.ts", "utf8");
const reportContract = readFileSync("app/lib/familyCompatibilityExtendedReportContract.ts", "utf8");
const purchasedList = readFileSync("app/components/PurchasedAnalysesListMultiEdition.tsx", "utf8");

assert(selector.includes('mode="siblings"') && selector.includes('mode="other_family"') && !selector.includes("준비 중"), "family selector must activate sibling and other-family without reusing parent-child content");
assert(inputClient.includes("조부모·손주") && inputClient.includes("삼촌·이모·고모·조카") && inputClient.includes("사촌") && inputClient.includes("인척"), "other-family input must collect relationship semantics");
assert(inputClient.includes("sessionStorage.setItem") && !inputClient.includes('birthTime: "12:00"'), "raw family input must remain session-scoped and never synthesize noon");
assert(orderRoute.includes("validateCompatibilityPartnerInput") && orderRoute.includes("buildFamilySiblingPaidInputSnapshot") && orderRoute.includes("buildFamilyOtherPaidInputSnapshot"), "extended family orders must validate raw input then derive frozen snapshots server-side");
assert(checkoutPanel.includes('paidEligibilityStatus !== "VERIFIED_ADULT"') && checkoutPanel.includes("immediateGenerationAcknowledged: true"), "extended family checkout must keep adult and immediate-generation gates");
assert(generation.includes("isCompatibilityFamilySiblingProductId") && generation.includes("generateFamilySiblingReport"), "paid generation must dispatch sibling reports from the frozen snapshot");
assert(generation.includes("isCompatibilityFamilyOtherProductId") && generation.includes("generateFamilyOtherReport"), "paid generation must dispatch other-family reports from the frozen snapshot");
assert(reportContract.includes("comparisonAndCompetition") && reportContract.includes("roleAndExpectations") && reportContract.includes("boundariesAndContact"), "report contracts must preserve relationship-specific sections");
assert(purchasedList.includes("FAMILY_SIBLINGS_YEAR") && purchasedList.includes("FAMILY_OTHER_YEAR"), "purchased analysis must reopen both extended family yearly editions");

console.log("family-compatibility-extended-regression: OK");
