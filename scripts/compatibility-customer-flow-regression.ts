import { readFileSync } from "node:fs";
import {
  buildPartnerCompatibilitySnapshot,
  buildProfileCompatibilitySnapshot,
  validateCompatibilityPartnerInput,
} from "../app/lib/compatibilityCustomerInput";
import { buildCompatibilityPairPerspectives } from "../app/lib/compatibilityPairPerspective";
import { buildCompatibilityTiming } from "../app/lib/compatibilityTiming";
import {
  buildCompatibilityPaidEditionKey,
  buildCompatibilityPaidInputSnapshot,
  parseCompatibilityPaidInputSnapshot,
} from "../app/lib/compatibilityPaidAnalysis";
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
  parseFamilyParentChildPaidInputSnapshot,
} from "../app/lib/familyCompatibilityPaidAnalysis";
import {
  COMPATIBILITY_FAMILY_OTHER_PRODUCT,
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT,
  COMPATIBILITY_FAMILY_SIBLING_PRODUCT,
  COMPATIBILITY_ROMANTIC_PRODUCT,
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

const knownPartner = validateCompatibilityPartnerInput({
  label: "상대방",
  birthDate: "1992-07-20",
  birthTimeKnown: true,
  birthTime: "14:20",
  gender: "여성",
  calendarType: "양력",
  isLeapMonth: false,
});
assert(knownPartner.valid, "known-time partner input must validate");

const unknownPartner = validateCompatibilityPartnerInput({
  label: "상대방",
  birthDate: "1992-07-20",
  birthTimeKnown: false,
  birthTime: null,
  gender: "여성",
  calendarType: "양력",
  isLeapMonth: false,
});
assert(unknownPartner.valid, "unknown-time partner input must validate without a fake time");
assert(!validateCompatibilityPartnerInput({ ...knownPartner.value, birthDate: "199548" }).valid, "malformed date must fail");
assert(!validateCompatibilityPartnerInput({ ...knownPartner.value, birthDate: "2999-01-01" }).valid, "future date must fail");

const mine = buildProfileCompatibilitySnapshot(profile, evaluationDate);
const knownSnapshot = buildPartnerCompatibilitySnapshot(knownPartner.value, evaluationDate);
const timing = buildCompatibilityTiming(mine.person, knownSnapshot.person, {
  evaluationYear: 2026,
  A: mine.timing,
  B: knownSnapshot.timing,
});
const perspectives = buildCompatibilityPairPerspectives(timing);
assert(perspectives.meToPartner.direction === "me_to_partner", "romantic user-to-partner direction must remain distinct");
assert(perspectives.partnerToMe.direction === "partner_to_me", "romantic partner-to-user direction must remain distinct");
assert(!/\d{1,3}\s*(?:점|%)/u.test(`${perspectives.meToPartner.summary}${perspectives.partnerToMe.summary}`), "customer direction copy must not expose numeric scores");

const unknownSnapshot = buildPartnerCompatibilitySnapshot(unknownPartner.value, evaluationDate);
assert(unknownSnapshot.person.pillars.hour === null, "unknown time must keep hour pillar absent");
assert(unknownSnapshot.timing.daeunGanji === null, "unknown time must not synthesize daeun");

const romanticSnapshot = buildCompatibilityPaidInputSnapshot({
  evaluationDate,
  evaluationYear: 2026,
  myProfileLabel: profile.label,
  partnerLabel: knownPartner.value.label,
  partnerBirthTimeKnown: true,
  mine,
  partner: knownSnapshot,
});
assert(parseCompatibilityPaidInputSnapshot(romanticSnapshot).relationshipType === "romantic_partner", "romantic paid snapshot must preserve scope");
assert(/^PAIR_YEAR:2026:[a-f0-9]{16}$/.test(buildCompatibilityPaidEditionKey(romanticSnapshot)), "romantic edition must bind year and pair fingerprint");

const parentSnapshot = buildFamilyParentChildPaidInputSnapshot({
  evaluationDate,
  evaluationYear: 2026,
  myProfileLabel: profile.label,
  familyMemberLabel: "자녀",
  userRole: "parent",
  familyMemberBirthTimeKnown: true,
  mine,
  familyMember: knownSnapshot,
});
const parentEdition2026 = buildFamilyParentChildPaidEditionKey(parentSnapshot);
const parentEdition2027 = buildFamilyParentChildPaidEditionKey({ ...parentSnapshot, evaluationDate: "2027-09-16", evaluationYear: 2027 });
assert(parseFamilyParentChildPaidInputSnapshot(parentSnapshot).relationshipType === "family_parent_child", "parent-child snapshot must preserve scope");
assert(/^FAMILY_PARENT_CHILD_YEAR:2026:[a-f0-9]{16}$/.test(parentEdition2026), "parent-child edition must bind year and natal pair");
assert(parentEdition2026.split(":").at(-1) === parentEdition2027.split(":").at(-1), "parent-child natal fingerprint must stay stable across years");

const siblingSnapshot = buildFamilySiblingPaidInputSnapshot({
  evaluationDate,
  evaluationYear: 2026,
  myProfileLabel: profile.label,
  familyMemberLabel: "동생",
  familyMemberBirthTimeKnown: true,
  mine,
  familyMember: knownSnapshot,
});
assert(/^FAMILY_SIBLINGS_YEAR:2026:[a-f0-9]{16}$/.test(buildFamilySiblingPaidEditionKey(siblingSnapshot)), "sibling edition must be a fixed yearly pair edition");

const otherRoles = resolveFamilyOtherRolePair("grandparent_grandchild", "grandparent");
assert(otherRoles, "other-family role semantics must resolve");
const otherSnapshot = buildFamilyOtherPaidInputSnapshot({
  relationshipKind: "grandparent_grandchild",
  userRole: otherRoles.user,
  familyMemberRole: otherRoles.familyMember,
  evaluationDate,
  evaluationYear: 2026,
  myProfileLabel: profile.label,
  familyMemberLabel: "손주",
  familyMemberBirthTimeKnown: true,
  mine,
  familyMember: knownSnapshot,
});
assert(/^FAMILY_OTHER_YEAR:2026:[a-f0-9]{16}$/.test(buildFamilyOtherPaidEditionKey(otherSnapshot)), "other-family edition must bind relationship semantics, year and pair");

assert(COMPATIBILITY_ROMANTIC_PRODUCT.amount === 19_900, "romantic compatibility price must stay 19,900 KRW");
assert(COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT.amount === 19_900, "parent-child compatibility price must stay 19,900 KRW");
assert(COMPATIBILITY_FAMILY_SIBLING_PRODUCT.amount === 19_900, "sibling compatibility price must stay aligned with family premium pricing");
assert(COMPATIBILITY_FAMILY_OTHER_PRODUCT.amount === 19_900, "other-family compatibility price must stay aligned with family premium pricing");

const shell = readFileSync("app/components/AppShell.tsx", "utf8");
const hub = readFileSync("app/special-analysis/page.tsx", "utf8");
const compatibilityPage = readFileSync("app/special-analysis/compatibility/page.tsx", "utf8");
const romanticPage = readFileSync("app/special-analysis/compatibility/romantic/page.tsx", "utf8");
const familyPage = readFileSync("app/special-analysis/compatibility/family/page.tsx", "utf8");
const familyRoute = readFileSync("app/special-analysis/compatibility/family/parent-child/page.tsx", "utf8");
const familySelector = readFileSync("app/components/FamilyCompatibilityAnalysisClient.tsx", "utf8");
const parentInput = readFileSync("app/components/PaidFamilyParentChildAnalysisClient.tsx", "utf8");
const extendedInput = readFileSync("app/components/PaidFamilyExtendedAnalysisClient.tsx", "utf8");
const parentDirectApi = readFileSync("app/api/special-analysis/compatibility/family/parent-child/route.ts", "utf8");
const romanticDirectApi = readFileSync("app/api/special-analysis/compatibility/route.ts", "utf8");
const familyOrderApi = readFileSync("app/api/orders/family-extended/route.ts", "utf8");
const checkout = readFileSync("app/checkout/[productId]/CheckoutAccessPanel.tsx", "utf8");
const extendedCheckout = readFileSync("app/checkout/[productId]/FamilyExtendedCheckoutAccessPanel.tsx", "utf8");
const checkoutPage = readFileSync("app/checkout/[productId]/page.tsx", "utf8");
const successPage = readFileSync("app/checkout/success/page.tsx", "utf8");
const generation = readFileSync("app/lib/paidReports/generation.ts", "utf8");
const parentPurchase = readFileSync("app/lib/familyCompatibilityPurchases.ts", "utf8");
const extendedPurchase = readFileSync("app/lib/familyCompatibilityExtendedPurchases.ts", "utf8");
const romanticPurchase = readFileSync("app/lib/compatibilityPurchases.ts", "utf8");
const romanticReport = readFileSync("app/components/CompatibilityPaidReportView.tsx", "utf8");
const parentReport = readFileSync("app/components/FamilyParentChildPaidReportView.tsx", "utf8");
const extendedReport = readFileSync("app/components/FamilyExtendedPaidReportView.tsx", "utf8");
const purchasedList = readFileSync("app/components/PurchasedAnalysesListMultiEdition.tsx", "utf8");
const specialHistory = readFileSync("app/lib/specialAnalysisPurchaseHistory.ts", "utf8");
const mypageSummary = readFileSync("app/api/mypage/summary/route.ts", "utf8");
const adapter = readFileSync("app/lib/compatibilityCustomerInput.ts", "utf8");

assert(shell.includes('href: "/special-analysis"') && shell.includes('label: "전문 분석"'), "AppShell must expose professional analysis");
assert(hub.includes("궁합 분석") && hub.includes('href="/special-analysis/compatibility"'), "professional hub must expose compatibility");
assert(compatibilityPage.includes("어떤 관계를 살펴볼까요?") && compatibilityPage.includes("형제·자매") && compatibilityPage.includes("기타 가족"), "compatibility selector must expose all relationship families");
assert(compatibilityPage.includes('href="/special-analysis/compatibility/family/parent-child#family-relationship-selector"'), "family card must open the in-page family selector directly");
assert(!compatibilityPage.includes("준비 중"), "launched family relationship types must not remain marked coming soon");
assert(!compatibilityPage.includes('href="/special-analysis/compatibility/family"'), "main customer path must not add an extra family overview step");
assert(romanticPage.includes("PaidCompatibilityAnalysisClient"), "romantic route must own its paid input flow");
assert(familyPage.includes("이용 가능") && !familyPage.includes("준비 중"), "legacy family overview must not contradict launched relationship availability");
assert(familyRoute.includes("FamilyCompatibilityAnalysisClient") && familyRoute.includes("가족 궁합 분석"), "family route must own the shared relationship selector");
assert(familySelector.includes('mode="siblings"') && familySelector.includes('mode="other_family"'), "family selector must mount distinct sibling and other-family input components");
assert(familySelector.includes("PaidFamilyParentChildAnalysisClient") && !familySelector.includes("disabled={!option.available}"), "all family types must be selectable without reusing parent-child logic");

assert(parentInput.includes("COMPATIBILITY_FAMILY_PARENT_CHILD_SESSION_KEY") && parentInput.includes("sessionStorage.setItem"), "parent-child raw input must stay session-scoped before checkout");
assert(parentInput.includes("/checkout/") && !parentInput.includes('/api/special-analysis/compatibility/family/parent-child'), "parent-child input must route through checkout");
assert(extendedInput.includes("COMPATIBILITY_FAMILY_SIBLING_SESSION_KEY") && extendedInput.includes("COMPATIBILITY_FAMILY_OTHER_SESSION_KEY"), "extended family raw input must use relationship-specific session keys");
assert(extendedInput.includes("function BirthDateSelector") && !extendedInput.includes('type="date"'), "extended family input must use deliberate year/month/day selection");
assert(!extendedInput.includes('birthTime: "12:00"'), "extended family input must never synthesize noon");
assert(extendedInput.includes("조부모·손주") && extendedInput.includes("사촌") && extendedInput.includes("인척"), "other-family input must collect relationship semantics");

assert(parentDirectApi.includes("FAMILY_PARENT_CHILD_PURCHASE_REQUIRED") && parentDirectApi.includes("status: 402"), "direct parent-child generation must fail closed behind purchase");
assert(romanticDirectApi.includes("COMPATIBILITY_PURCHASE_REQUIRED") && romanticDirectApi.includes("status: 402"), "direct romantic generation must fail closed behind purchase");
assert(!familyOrderApi.includes("generateFamilySiblingReport") && !familyOrderApi.includes("generateFamilyOtherReport"), "extended family order API must not become a free generation endpoint");
assert(familyOrderApi.includes("buildFamilySiblingPaidInputSnapshot") && familyOrderApi.includes("buildFamilyOtherPaidInputSnapshot"), "extended family order boundary must derive frozen snapshots server-side");
assert(familyOrderApi.includes("validateCompatibilityPartnerInput") && familyOrderApi.includes("getTossConfig"), "extended family orders must validate input and require the payment provider");

assert(checkout.includes('paidEligibilityStatus !== "VERIFIED_ADULT"') && checkout.includes("NiceAdultVerificationButton"), "existing checkout must keep the adult-verification gate");
assert(extendedCheckout.includes('paidEligibilityStatus !== "VERIFIED_ADULT"') && extendedCheckout.includes("NiceAdultVerificationButton"), "extended family checkout must keep the adult-verification gate");
assert(extendedCheckout.includes("/api/orders/family-extended") && extendedCheckout.includes("immediateGenerationAcknowledged: true"), "extended family checkout must create paid orders only after acknowledgement");
assert(checkoutPage.includes("FamilyExtendedCheckoutAccessPanel") && checkoutPage.includes("년 형제·자매 궁합") && checkoutPage.includes("년 기타 가족 궁합"), "checkout page must show fixed yearly context for all family products");

assert(romanticPurchase.includes("analysis_reference_snapshot: input.snapshot") && !romanticPurchase.includes("birthDate"), "romantic order helper must store only the derived partner snapshot");
assert(parentPurchase.includes("analysis_reference_snapshot: input.snapshot") && !parentPurchase.includes("birthDate"), "parent-child order helper must store only the derived family snapshot");
assert(extendedPurchase.includes("analysis_reference_snapshot: input.snapshot") && !extendedPurchase.includes("birthDate") && !extendedPurchase.includes("birthTime:"), "extended family order helper must not persist raw family birth input");

assert(generation.includes("parseCompatibilityPaidInputSnapshot") && generation.includes("generateCompatibilityReport"), "paid generation must preserve romantic dispatch");
assert(generation.includes("parseFamilyParentChildPaidInputSnapshot") && generation.includes("generateFamilyParentChildReport"), "paid generation must preserve parent-child dispatch");
assert(generation.includes("parseFamilySiblingPaidInputSnapshot") && generation.includes("generateFamilySiblingReport"), "paid generation must dispatch sibling reports from frozen snapshots");
assert(generation.includes("parseFamilyOtherPaidInputSnapshot") && generation.includes("generateFamilyOtherReport"), "paid generation must dispatch other-family reports from frozen snapshots");
assert(generation.includes("canPublish") && generation.includes("getActiveEntitlementForProfileEdition"), "all report publication must remain entitlement/account revocation safe");

assert(successPage.includes("COMPATIBILITY_ROMANTIC_SESSION_KEY") && successPage.includes("COMPATIBILITY_FAMILY_PARENT_CHILD_SESSION_KEY"), "successful legacy compatibility payments must clear temporary input");
assert(successPage.includes("COMPATIBILITY_FAMILY_SIBLING_SESSION_KEY") && successPage.includes("COMPATIBILITY_FAMILY_OTHER_SESSION_KEY"), "successful extended family payments must clear temporary raw input");
assert(successPage.includes("/special-analysis/compatibility/family/siblings/report") && successPage.includes("/special-analysis/compatibility/family/other/report"), "successful extended family payments must open stored reports");

assert(romanticReport.includes("서로에게 미치는 방식") && romanticReport.includes("지금 해볼 것"), "romantic stored report must preserve premium presentation");
assert(parentReport.includes("부모에서 자녀로, 자녀에서 부모로 나누어 봅니다") && parentReport.includes("년판"), "parent-child stored report must preserve directional yearly presentation");
assert(extendedReport.includes("비교와 경쟁") && extendedReport.includes("역할과 기대") && extendedReport.includes("년판"), "extended family report must use relationship-specific premium sections and fixed-year copy");
assert(purchasedList.includes("FAMILY_SIBLINGS_YEAR") && purchasedList.includes("FAMILY_OTHER_YEAR"), "purchased analysis library must reopen extended family editions");
assert(specialHistory.includes("getSpecialAnalysisProduct"), "financial history must use special product definitions for compatibility purchases");
assert(mypageSummary.includes("listUserSpecialAnalysisPurchaseHistory") && mypageSummary.includes("getSpecialAnalysisProduct"), "My Page must include special analysis purchases in paid history");

assert(adapter.includes("isGuestBirthDateInRange") && adapter.includes("Array.from({ length: 24 }") && adapter.includes("signatures.size !== 1"), "server unknown-time safety must remain intact");
assert(!adapter.includes('birthTime: "12:00"'), "server adapter must never synthesize noon");

console.log("compatibility-customer-flow-regression: OK");
