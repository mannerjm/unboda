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
import { COMPATIBILITY_ROMANTIC_PRODUCT } from "../app/lib/specialAnalysisProducts";
import type { ProfileDto } from "../app/lib/profiles/types";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const evaluationDate = "2026-09-15";
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
assert(!validateCompatibilityPartnerInput({ ...knownPartner.value, birthDate: "199548" }).valid, "six-digit malformed date must fail");
assert(!validateCompatibilityPartnerInput({ ...knownPartner.value, birthDate: "2999-01-01" }).valid, "future date must fail");

const mine = buildProfileCompatibilitySnapshot(profile, evaluationDate);
const knownSnapshot = buildPartnerCompatibilitySnapshot(knownPartner.value, evaluationDate);
const timing = buildCompatibilityTiming(mine.person, knownSnapshot.person, {
  evaluationYear: 2026,
  A: mine.timing,
  B: knownSnapshot.timing,
});
const perspectives = buildCompatibilityPairPerspectives(timing);
assert(perspectives.meToPartner.direction === "me_to_partner", "user-to-partner direction must remain distinct");
assert(perspectives.partnerToMe.direction === "partner_to_me", "partner-to-user direction must remain distinct");
assert(!/\d{1,3}\s*(?:점|%)/u.test(`${perspectives.meToPartner.summary}${perspectives.partnerToMe.summary}`), "directional copy must not expose numeric scores");

const unknownSnapshot = buildPartnerCompatibilitySnapshot(unknownPartner.value, evaluationDate);
assert(unknownSnapshot.person.pillars.hour === null, "unknown partner time must keep hour pillar absent");
assert(unknownSnapshot.timing.daeunGanji === null, "unknown partner time must not synthesize daeun");

const paidSnapshot = buildCompatibilityPaidInputSnapshot({
  evaluationDate,
  evaluationYear: 2026,
  myProfileLabel: profile.label,
  partnerLabel: knownPartner.value.label,
  partnerBirthTimeKnown: true,
  mine,
  partner: knownSnapshot,
});
assert(parseCompatibilityPaidInputSnapshot(paidSnapshot).relationshipType === "romantic_partner", "paid snapshot must preserve romantic/partner scope");
assert(/^PAIR_YEAR:2026:[a-f0-9]{16}$/.test(buildCompatibilityPaidEditionKey(paidSnapshot)), "paid pair edition must bind year and derived partner fingerprint");
assert(COMPATIBILITY_ROMANTIC_PRODUCT.amount === 19_900, "romantic compatibility must be priced at 19,900 KRW");

const shell = readFileSync("app/components/AppShell.tsx", "utf8");
const hub = readFileSync("app/special-analysis/page.tsx", "utf8");
const compatibilityPage = readFileSync("app/special-analysis/compatibility/page.tsx", "utf8");
const romanticPage = readFileSync("app/special-analysis/compatibility/romantic/page.tsx", "utf8");
const familyPage = readFileSync("app/special-analysis/compatibility/family/page.tsx", "utf8");
const paidClient = readFileSync("app/components/PaidCompatibilityAnalysisClient.tsx", "utf8");
const oldApi = readFileSync("app/api/special-analysis/compatibility/route.ts", "utf8");
const ordersApi = readFileSync("app/api/orders/route.ts", "utf8");
const checkout = readFileSync("app/checkout/[productId]/CheckoutAccessPanel.tsx", "utf8");
const checkoutPage = readFileSync("app/checkout/[productId]/page.tsx", "utf8");
const successPage = readFileSync("app/checkout/success/page.tsx", "utf8");
const generation = readFileSync("app/lib/paidReports/generation.ts", "utf8");
const compatibilityPurchase = readFileSync("app/lib/compatibilityPurchases.ts", "utf8");
const reportView = readFileSync("app/components/CompatibilityPaidReportView.tsx", "utf8");
const purchasedList = readFileSync("app/components/PurchasedAnalysesListMultiEdition.tsx", "utf8");
const mypageSummary = readFileSync("app/api/mypage/summary/route.ts", "utf8");
const perspectiveSource = readFileSync("app/lib/compatibilityPairPerspective.ts", "utf8");
const adapter = readFileSync("app/lib/compatibilityCustomerInput.ts", "utf8");

assert(shell.includes('href: "/special-analysis"') && shell.includes('label: "전문 분석"'), "AppShell must expose professional analysis");
assert(hub.includes("궁합 분석") && hub.includes('href="/special-analysis/compatibility"'), "professional hub must expose compatibility without requiring payment first");
assert(hub.includes("관계 유형별 분석") && hub.includes("궁합 유형 선택하기"), "professional hub must present compatibility as a relationship-type family");
assert(compatibilityPage.includes("어떤 관계를 살펴볼까요?") && compatibilityPage.includes('href="/special-analysis/compatibility/romantic"'), "compatibility route must be a relationship-type selector");
assert(compatibilityPage.includes('href="/special-analysis/compatibility/family"') && compatibilityPage.includes("가족 궁합") && compatibilityPage.includes("설계 중"), "compatibility selector must expose the family structure without pretending it is purchasable");
assert(!compatibilityPage.includes("PaidCompatibilityAnalysisClient"), "relationship-type selector must not mount a paid input form");
assert(romanticPage.includes("PaidCompatibilityAnalysisClient") && romanticPage.includes("연인·배우자 궁합 분석"), "romantic route must own the paid product input flow");
assert(romanticPage.includes("← 궁합 유형 선택"), "romantic route must return to the compatibility type selector");
assert(!romanticPage.includes("CompatibilityAnalysisClient myProfileLabel"), "romantic customer route must not mount the old free-generation flow");
assert(familyPage.includes("부모·자녀") && familyPage.includes("형제·자매") && familyPage.includes("기타 가족"), "family route must split family relationship types before analysis input");
assert(familyPage.includes("아직 결제나 분석 생성은 연결하지 않았습니다"), "unfinished family compatibility must stay explicitly non-purchasable");
assert(!familyPage.includes("/checkout/") && !familyPage.includes("PaidCompatibilityAnalysisClient"), "family structure must not reuse romantic payment or input before its own interpretation contract exists");

assert(paidClient.includes("COMPATIBILITY_ROMANTIC_SESSION_KEY"), "raw partner input must remain browser-session scoped until checkout");
assert(paidClient.includes("sessionStorage.setItem") && paidClient.includes("/checkout/"), "partner input must move to the shared checkout rather than generate directly");
assert(paidClient.includes("19,900") || paidClient.includes("toLocaleString"), "input flow must present paid product pricing");
assert(paidClient.includes("function BirthDateSelector") && !paidClient.includes('type="date"'), "paid compatibility must retain deliberate year/month/day entry");
assert(paidClient.includes('gender: ""') && paidClient.includes('birthTime: ""'), "gender and birth time must require deliberate user input");
assert(!paidClient.includes('birthTime: "12:00"'), "paid compatibility must never synthesize noon");

assert(oldApi.includes("COMPATIBILITY_PURCHASE_REQUIRED") && oldApi.includes("status: 402"), "old direct compatibility generation endpoint must fail closed behind purchase");
assert(!oldApi.includes("generateCompatibilityReport"), "old direct customer API must no longer generate a free paid report");

assert(checkout.includes('fetch("/api/account/status"') && checkout.includes("NiceAdultVerificationButton"), "shared checkout must proactively read account status and expose NICE verification");
assert(checkout.includes('paidEligibilityStatus !== "VERIFIED_ADULT"'), "shared checkout must gate payment until adult eligibility is verified");
assert(checkout.includes("상품은 자유롭게 둘러볼 수 있습니다"), "adult verification must remain a purchase boundary, not a catalog browsing boundary");
assert(checkout.includes("COMPATIBILITY_ROMANTIC_SESSION_KEY") && checkout.includes("compatibilityPartner"), "shared checkout must pass temporary compatibility partner input only when creating the order");
assert(checkout.includes('/special-analysis/compatibility/romantic'), "missing romantic partner input must return to the romantic route");
assert(checkoutPage.includes("getSpecialAnalysisProduct") && checkoutPage.includes("resolveLaunchPurchasableProduct"), "shared checkout page must support both premium and special products");
assert(checkoutPage.includes('/special-analysis/compatibility/romantic'), "special checkout back navigation must return to the romantic product input route");

assert(ordersApi.includes("validateCompatibilityPartnerInput") && ordersApi.includes("buildCompatibilityPaidInputSnapshot"), "server order boundary must validate raw partner input then derive the stored pair snapshot");
assert(ordersApi.includes("createCompatibilityPendingOrder") && ordersApi.includes("createPendingOrder"), "special and standard products must share the same order endpoint while keeping specialized snapshot creation");
assert(compatibilityPurchase.includes("assertPaidPurchaseEligibility") && compatibilityPurchase.indexOf("assertPaidPurchaseEligibility") < compatibilityPurchase.indexOf('.from("orders")'), "compatibility order creation must enforce common paid eligibility before persistence");
assert(compatibilityPurchase.includes("buildAnalysisInputSnapshot(input.profile)"), "compatibility orders must keep the standard own-profile commercial snapshot contract");
assert(compatibilityPurchase.includes("analysis_reference_snapshot: input.snapshot"), "compatibility order must freeze the derived pair snapshot for deterministic generation");
assert(!compatibilityPurchase.includes("birthDate") && !compatibilityPurchase.includes("birthTime:"), "compatibility order helper must not persist raw partner birth fields");

assert(generation.includes("isCompatibilityRomanticProductId") && generation.includes("parseCompatibilityPaidInputSnapshot"), "paid generation must dispatch compatibility from the frozen purchase snapshot");
assert(generation.includes("generateCompatibilityReport") && generation.includes("buildCompatibilityPairPerspectives"), "paid compatibility generation must use the established deterministic engine and report contract");
assert(generation.includes("canPublish") && generation.includes("getActiveEntitlementForProfileEdition"), "report publication must remain refund/account-revocation safe");

assert(successPage.includes("COMPATIBILITY_ROMANTIC_SESSION_KEY") && successPage.includes("sessionStorage.removeItem"), "successful compatibility payment must clear temporary raw partner input");
assert(successPage.includes("/special-analysis/compatibility/report"), "successful compatibility payment must open the stored compatibility report");
assert(reportView.includes("서로에게 미치는 방식") && reportView.includes("갈등 뒤 회복 방식") && reportView.includes("지금 해볼 것"), "stored paid report must preserve the premium compatibility presentation");
assert(purchasedList.includes("/special-analysis/compatibility/report") && purchasedList.includes("getSpecialAnalysisProduct"), "purchased-analysis library must reopen compatibility reports");
assert(mypageSummary.includes("listUserSpecialAnalysisPurchaseHistory") && mypageSummary.includes("getSpecialAnalysisProduct"), "My Page must include compatibility in paid analysis and financial history");

assert(perspectiveSource.includes("ELEMENT_CUSTOMER_LABELS") && perspectiveSource.includes("관계의 흐름과 유연성"), "directional evidence must stay in customer language");
assert(!perspectiveSource.includes("목(木)") && !perspectiveSource.includes("화(火)") && !perspectiveSource.includes("토(土)") && !perspectiveSource.includes("금(金)") && !perspectiveSource.includes("수(水)"), "directional cards must not lead with raw five-element notation");
assert(adapter.includes("isGuestBirthDateInRange") && adapter.includes("Array.from({ length: 24 }") && adapter.includes("signatures.size !== 1"), "server validation and unknown-time safety must be preserved");
assert(!adapter.includes('birthTime: "12:00"'), "server adapter must never synthesize noon for unknown birth time");

console.log("compatibility-customer-flow-regression: OK");
