import { readFileSync } from "node:fs";
import {
  buildPartnerCompatibilitySnapshot,
  buildProfileCompatibilitySnapshot,
  validateCompatibilityPartnerInput,
} from "../app/lib/compatibilityCustomerInput";
import { buildCompatibilityTiming } from "../app/lib/compatibilityTiming";
import {
  buildCompatibilityPaidEditionKey,
  buildCompatibilityPaidInputSnapshot,
  parseCompatibilityPaidInputSnapshot,
} from "../app/lib/compatibilityPaidAnalysis";
import { buildCompatibilityReportContext, buildCompatibilityReportPrompt } from "../app/lib/compatibilityReportContract";
import { WORKPLACE_RELATIONS } from "../app/lib/workplaceCompatibilityRelation";
import {
  buildFamilyOtherPaidEditionKey,
  buildFamilyOtherPaidInputSnapshot,
  buildFamilySiblingPaidEditionKey,
  buildFamilySiblingPaidInputSnapshot,
} from "../app/lib/familyCompatibilityExtendedPaidAnalysis";
import { resolveFamilyOtherRolePair } from "../app/lib/familyCompatibilityExtended";
import {
  buildFamilyParentChildPaidEditionKey,
  buildFamilyParentChildPaidInputSnapshot,
} from "../app/lib/familyCompatibilityPaidAnalysis";
import {
  COMPATIBILITY_FAMILY_OTHER_PRODUCT,
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT,
  COMPATIBILITY_FAMILY_SIBLING_PRODUCT,
  COMPATIBILITY_ROMANTIC_PRODUCT,
  COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  COMPATIBILITY_WORKPLACE_PRODUCT_ID,
} from "../app/lib/specialAnalysisProducts";
import type { ProfileDto } from "../app/lib/profiles/types";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

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
const familyInput = validateCompatibilityPartnerInput({
  label: "가족",
  birthDate: "1992-07-20",
  birthTimeKnown: true,
  birthTime: "14:20",
  gender: "여성",
  calendarType: "양력",
  isLeapMonth: false,
});
assert(familyInput.valid, "known-time family input must validate");
const unknownInput = validateCompatibilityPartnerInput({
  ...familyInput.value,
  birthTimeKnown: false,
  birthTime: null,
});
assert(unknownInput.valid, "unknown-time family input must validate without a fake time");

const evaluationDate = "2026-09-16";
const mine = buildProfileCompatibilitySnapshot(profile, evaluationDate);
const member = buildPartnerCompatibilitySnapshot(familyInput.value, evaluationDate);
const unknown = buildPartnerCompatibilitySnapshot(unknownInput.value, evaluationDate);
assert(unknown.person.pillars.hour === null, "unknown time must keep hour pillar absent");
assert(unknown.timing.daeunGanji === null, "unknown time must not synthesize daeun");
assert(!validateCompatibilityPartnerInput({ ...familyInput.value, birthDate: "2999-01-01" }).valid, "future family birth date must fail");

const timing = buildCompatibilityTiming(mine.person, member.person, {
  evaluationYear: 2026,
  A: mine.timing,
  B: member.timing,
});
assert(timing.evaluationYear === 2026, "compatibility timing must preserve the frozen purchase year");

const romantic = buildCompatibilityPaidInputSnapshot({
  evaluationDate,
  evaluationYear: 2026,
  myProfileLabel: profile.label,
  partnerLabel: familyInput.value.label,
  partnerBirthTimeKnown: true,
  mine,
  partner: member,
});
assert(/^PAIR_YEAR:2026:[a-f0-9]{16}$/.test(buildCompatibilityPaidEditionKey(romantic)), "romantic edition must remain yearly");

const workplaceBase = { ...familyInput.value };
assert(!validateCompatibilityPartnerInput(workplaceBase, COMPATIBILITY_WORKPLACE_PRODUCT_ID).valid, "workplace checkout must require role selection");
assert(!validateCompatibilityPartnerInput({ ...workplaceBase, workplaceRelation: "fake" }, COMPATIBILITY_WORKPLACE_PRODUCT_ID).valid, "workplace checkout must reject unknown roles");
assert(!validateCompatibilityPartnerInput({ ...workplaceBase, workplaceRelation: "my_manager" }, COMPATIBILITY_ROMANTIC_PRODUCT_ID).valid, "other compatibility products must reject a workplace role");
const workplaceEditions = new Set<string>();
const workplaceContext = buildCompatibilityReportContext(timing);
for (const role of WORKPLACE_RELATIONS) {
  const validated = validateCompatibilityPartnerInput({ ...workplaceBase, workplaceRelation: role.id }, COMPATIBILITY_WORKPLACE_PRODUCT_ID);
  assert(validated.valid && validated.value.workplaceRelation === role.id, `workplace role ${role.id} must validate and round-trip`);
  const snapshot = buildCompatibilityPaidInputSnapshot({
    productId: COMPATIBILITY_WORKPLACE_PRODUCT_ID,
    evaluationDate,
    evaluationYear: 2026,
    myProfileLabel: profile.label,
    partnerLabel: workplaceBase.label,
    partnerBirthTimeKnown: true,
    workplaceRelation: validated.value.workplaceRelation,
    mine,
    partner: member,
  });
  assert(parseCompatibilityPaidInputSnapshot(snapshot).workplaceRelation === role.id, `workplace role ${role.id} must survive snapshot parsing`);
  workplaceEditions.add(buildCompatibilityPaidEditionKey(snapshot));
  const prompt = buildCompatibilityReportPrompt(workplaceContext, "workplace_colleague", role.id);
  assert(prompt.user.includes(`사용자(나)의 역할: ${role.myRole}`) && prompt.user.includes(`상대방의 역할: ${role.partnerRole}`), `workplace prompt must respect both role directions for ${role.id}`);
  assert(prompt.user.includes(role.reportFocus[0]), `workplace prompt must include the ${role.id} interpretation lens`);
}
assert(workplaceEditions.size === WORKPLACE_RELATIONS.length, "same natal pair must retain a different purchased edition per workplace role");
const legacyWorkplace = buildCompatibilityPaidInputSnapshot({
  productId: COMPATIBILITY_WORKPLACE_PRODUCT_ID,
  evaluationDate,
  evaluationYear: 2026,
  myProfileLabel: profile.label,
  partnerLabel: workplaceBase.label,
  partnerBirthTimeKnown: true,
  mine,
  partner: member,
});
assert(parseCompatibilityPaidInputSnapshot(legacyWorkplace).workplaceRelation === undefined, "previous workplace purchases without role must remain readable");

const parentChild = buildFamilyParentChildPaidInputSnapshot({
  evaluationDate,
  evaluationYear: 2026,
  myProfileLabel: profile.label,
  familyMemberLabel: "자녀",
  userRole: "parent",
  familyMemberBirthTimeKnown: true,
  mine,
  familyMember: member,
});
assert(/^FAMILY_PARENT_CHILD_YEAR:2026:[a-f0-9]{16}$/.test(buildFamilyParentChildPaidEditionKey(parentChild)), "parent-child edition must remain yearly");

const siblings = buildFamilySiblingPaidInputSnapshot({
  evaluationDate,
  evaluationYear: 2026,
  myProfileLabel: profile.label,
  familyMemberLabel: "동생",
  familyMemberBirthTimeKnown: true,
  mine,
  familyMember: member,
});
assert(/^FAMILY_SIBLINGS_YEAR:2026:[a-f0-9]{16}$/.test(buildFamilySiblingPaidEditionKey(siblings)), "sibling edition must be yearly");

const otherRoles = resolveFamilyOtherRolePair("grandparent_grandchild", "grandparent");
assert(otherRoles !== null, "other-family role semantics must resolve");
const other = buildFamilyOtherPaidInputSnapshot({
  relationshipKind: "grandparent_grandchild",
  userRole: otherRoles.user,
  familyMemberRole: otherRoles.familyMember,
  evaluationDate,
  evaluationYear: 2026,
  myProfileLabel: profile.label,
  familyMemberLabel: "손주",
  familyMemberBirthTimeKnown: true,
  mine,
  familyMember: member,
});
assert(/^FAMILY_OTHER_YEAR:2026:[a-f0-9]{16}$/.test(buildFamilyOtherPaidEditionKey(other)), "other-family edition must be yearly and relationship-specific");

assert(COMPATIBILITY_ROMANTIC_PRODUCT.amount === 19_900, "romantic compatibility must remain 19,900 KRW");
assert(COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT.amount === 19_900, "parent-child compatibility must remain 19,900 KRW");
assert(COMPATIBILITY_FAMILY_SIBLING_PRODUCT.amount === 19_900, "sibling compatibility must use family premium pricing");
assert(COMPATIBILITY_FAMILY_OTHER_PRODUCT.amount === 19_900, "other-family compatibility must use family premium pricing");

const compatibilityPage = readFileSync("app/special-analysis/compatibility/page.tsx", "utf8");
const familySelector = readFileSync("app/components/FamilyCompatibilityAnalysisClient.tsx", "utf8");
const extendedInput = readFileSync("app/components/PaidFamilyExtendedAnalysisClient.tsx", "utf8");
const parentDirectApi = readFileSync("app/api/special-analysis/compatibility/family/parent-child/route.ts", "utf8");
const romanticDirectApi = readFileSync("app/api/special-analysis/compatibility/route.ts", "utf8");
const extendedOrderApi = readFileSync("app/api/orders/family-extended/route.ts", "utf8");
const extendedCheckout = readFileSync("app/checkout/[productId]/FamilyExtendedCheckoutAccessPanel.tsx", "utf8");
const checkoutPage = readFileSync("app/checkout/[productId]/page.tsx", "utf8");
const generation = readFileSync("app/lib/paidReports/generation.ts", "utf8");
const successPage = readFileSync("app/checkout/success/page.tsx", "utf8");
const purchasedList = readFileSync("app/components/PurchasedAnalysesListMultiEdition.tsx", "utf8");
const adapter = readFileSync("app/lib/compatibilityCustomerInput.ts", "utf8");

assert(compatibilityPage.includes("가족 관계") && compatibilityPage.includes("부모·자녀") && compatibilityPage.includes("형제·자매") && compatibilityPage.includes("기타 가족") && !compatibilityPage.includes("준비 중"), "family catalog card must show launched family types with the relation badge");
assert(familySelector.includes('mode="siblings"') && familySelector.includes('mode="other_family"'), "same-page family selector must mount distinct extended flows");
assert(!familySelector.includes("disabled={!option.available}"), "sibling and other-family selections must no longer be disabled");
assert(extendedInput.includes("조부모·손주") && extendedInput.includes("사촌") && extendedInput.includes("인척"), "other-family input must preserve relationship semantics");
assert(extendedInput.includes("sessionStorage.setItem") && !extendedInput.includes('birthTime: "12:00"'), "extended raw input must stay session-scoped without fake noon");
assert(parentDirectApi.includes("FAMILY_PARENT_CHILD_PURCHASE_REQUIRED") && parentDirectApi.includes("status: 402"), "parent-child direct generation must remain purchase-gated");
assert(romanticDirectApi.includes("COMPATIBILITY_PURCHASE_REQUIRED") && romanticDirectApi.includes("status: 402"), "romantic direct generation must remain purchase-gated");
assert(!extendedOrderApi.includes("generateFamilySiblingReport") && !extendedOrderApi.includes("generateFamilyOtherReport"), "extended order endpoint must not expose free report generation");
assert(extendedOrderApi.includes("buildFamilySiblingPaidInputSnapshot") && extendedOrderApi.includes("buildFamilyOtherPaidInputSnapshot"), "extended orders must freeze derived snapshots server-side");
assert(extendedCheckout.includes('paidEligibilityStatus !== "VERIFIED_ADULT"') && extendedCheckout.includes("NiceAdultVerificationButton"), "extended checkout must keep adult verification at purchase boundary");
assert(checkoutPage.includes("FamilyExtendedCheckoutAccessPanel") && checkoutPage.includes("년 형제·자매 궁합") && checkoutPage.includes("년 기타 가족 궁합"), "checkout must expose fixed-year context for extended family products");
assert(generation.includes("generateFamilySiblingReport") && generation.includes("generateFamilyOtherReport") && generation.includes("canPublish"), "paid generation must dispatch extended family reports with entitlement-safe publication");
assert(successPage.includes("COMPATIBILITY_FAMILY_SIBLING_SESSION_KEY") && successPage.includes("COMPATIBILITY_FAMILY_OTHER_SESSION_KEY") && successPage.includes("sessionStorage.removeItem"), "successful extended payments must clear temporary raw input");
assert(purchasedList.includes("FAMILY_SIBLINGS_YEAR") && purchasedList.includes("FAMILY_OTHER_YEAR"), "purchased library must reopen extended family yearly reports");
assert(adapter.includes("Array.from({ length: 24 }") && adapter.includes("signatures.size !== 1") && !adapter.includes('birthTime: "12:00"'), "unknown-time stability safety must remain intact");

console.log("compatibility-customer-flow-regression: OK");
