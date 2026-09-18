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
import {
  buildFamilyOtherReportContext,
  buildFamilyOtherReportPrompt,
  buildFamilySiblingReportContext,
  buildFamilySiblingReportPrompt,
} from "../app/lib/familyCompatibilityExtendedReportContract";
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

const siblingPrompt = buildFamilySiblingReportPrompt(buildFamilySiblingReportContext(siblingA));
assert(siblingPrompt.system.includes("두 directional_structure 근거를 모두 사용"), "sibling report prompt must require both directional facts in the core");
assert(siblingPrompt.user.includes("family-sibling:direction:user-to-sibling") && siblingPrompt.user.includes("family-sibling:direction:sibling-to-user"), "sibling report prompt must carry both directional facts");

assert(resolveFamilyOtherRolePair("grandparent_grandchild", "grandparent")?.familyMember === "grandchild", "grandparent relation must map counterpart to grandchild");
assert(resolveFamilyOtherRolePair("grandparent_grandchild", "grandchild")?.familyMember === "grandparent", "grandchild relation must map counterpart to grandparent");
assert(resolveFamilyOtherRolePair("aunt_uncle_niece_nephew", "aunt_uncle")?.familyMember === "niece_nephew", "aunt/uncle relation must map to niece/nephew");
assert(resolveFamilyOtherRolePair("aunt_uncle_niece_nephew", "niece_nephew")?.familyMember === "aunt_uncle", "niece/nephew relation must map to aunt/uncle");
assert(resolveFamilyOtherRolePair("cousins", "cousin")?.familyMember === "cousin", "cousin relation must remain symmetric");
assert(resolveFamilyOtherRolePair("in_laws", "in_law")?.familyMember === "in_law", "in-law relation must remain symmetric");
assert(resolveFamilyOtherRolePair("other_relatives", "relative")?.familyMember === "relative", "other relative relation must remain symmetric");
assert(resolveFamilyOtherRolePair("grandparent_grandchild", "cousin") === null, "invalid other-family role pair must fail closed");

const otherRoles = resolveFamilyOtherRolePair("grandparent_grandchild", "grandparent");
assert(otherRoles !== null, "other-family role semantics must resolve");
const otherResult = buildFamilyOtherCompatibility(timing, "grandparent_grandchild", otherRoles);
assert(otherResult.relationshipType === "other_family", "other-family model must preserve its relationship type");
assert(Object.keys(otherResult.domains).sort().join("|") === [...FAMILY_OTHER_DOMAINS].sort().join("|"), "other-family model must expose only its dedicated domains");
assert(JSON.stringify([...FAMILY_SIBLING_DOMAINS].sort()) !== JSON.stringify([...FAMILY_PARENT_CHILD_DOMAINS].sort()), "sibling domains must not be a renamed parent-child contract");
assert(JSON.stringify([...FAMILY_OTHER_DOMAINS].sort()) !== JSON.stringify([...FAMILY_PARENT_CHILD_DOMAINS].sort()), "other-family domains must not be a renamed parent-child contract");

const grandparentPrompt = buildFamilyOtherReportPrompt(buildFamilyOtherReportContext(otherResult));
assert(grandparentPrompt.user.includes("보호·지원과 자율성") && grandparentPrompt.user.includes("연락·방문"), "grandparent report prompt must use grandparent-specific relationship guidance");

const cousinRoles = resolveFamilyOtherRolePair("cousins", "cousin");
assert(cousinRoles !== null, "cousin role semantics must resolve");
const cousinPrompt = buildFamilyOtherReportPrompt(buildFamilyOtherReportContext(buildFamilyOtherCompatibility(timing, "cousins", cousinRoles)));
assert(cousinPrompt.user.includes("수평적인 친밀감") && cousinPrompt.user.includes("비교·평가"), "cousin report prompt must use cousin-specific relationship guidance");

const inLawRoles = resolveFamilyOtherRolePair("in_laws", "in_law");
assert(inLawRoles !== null, "in-law role semantics must resolve");
const inLawPrompt = buildFamilyOtherReportPrompt(buildFamilyOtherReportContext(buildFamilyOtherCompatibility(timing, "in_laws", inLawRoles)));
assert(inLawPrompt.user.includes("예의와 역할 기대") && inLawPrompt.user.includes("연락·도움·관여"), "in-law report prompt must use in-law-specific relationship guidance");

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
assert(String(COMPATIBILITY_FAMILY_SIBLING_SESSION_KEY) !== String(COMPATIBILITY_FAMILY_OTHER_SESSION_KEY), "extended family raw-input session keys must remain isolated");

const selector = readFileSync("app/components/FamilyCompatibilityAnalysisClient.tsx", "utf8");
const romanticInputClient = readFileSync("app/components/PaidCompatibilityAnalysisClient.tsx", "utf8");
const inputClient = readFileSync("app/components/PaidFamilyExtendedAnalysisClient.tsx", "utf8");
const parentChildInputClient = readFileSync("app/components/PaidFamilyParentChildAnalysisClient.tsx", "utf8");
const reportValuePreview = readFileSync("app/components/CompatibilityReportValuePreview.tsx", "utf8");
const orderRoute = readFileSync("app/api/orders/family-extended/route.ts", "utf8");
const checkoutPanel = readFileSync("app/checkout/[productId]/FamilyExtendedCheckoutAccessPanel.tsx", "utf8");
const generation = readFileSync("app/lib/paidReports/generation.ts", "utf8");
const reportContract = readFileSync("app/lib/familyCompatibilityExtendedReportContract.ts", "utf8");
const reportService = readFileSync("app/lib/familyCompatibilityExtendedReportService.ts", "utf8");
const purchasedList = readFileSync("app/components/PurchasedAnalysesListMultiEdition.tsx", "utf8");

const sharedStorageNotice = "상대방 정보는 결제 연결을 위해 현재 브라우저에만 잠시 보관됩니다.";
assert(selector.includes('mode="siblings"') && selector.includes('mode="other_family"') && !selector.includes("준비 중"), "family selector must activate sibling and other-family without reusing parent-child content");
assert(inputClient.includes("조부모·손주") && inputClient.includes("삼촌·이모·고모·조카") && inputClient.includes("사촌") && inputClient.includes("인척"), "other-family input must collect relationship semantics");
assert(inputClient.includes("sessionStorage.setItem") && !inputClient.includes('birthTime: "12:00"'), "raw family input must remain session-scoped and never synthesize noon");
assert(parentChildInputClient.includes('<option value="parent">부모예요</option>') && parentChildInputClient.includes('<option value="child">자녀예요</option>') && !parentChildInputClient.includes('name="familyRole"'), "parent-child role must use the same open-list select pattern as gender");
assert(inputClient.includes("value={form.relationshipKind}") && inputClient.includes("value={effectiveRole}") && !inputClient.includes('name="otherRelationship"') && !inputClient.includes('name="otherRole"'), "other-family relationship and role must use select controls instead of card radios");
assert(
  romanticInputClient.includes('previewMode = "romantic"')
    && romanticInputClient.includes("<CompatibilityReportValuePreview mode={previewMode}")
    && parentChildInputClient.includes('<CompatibilityReportValuePreview mode="parent_child"')
    && inputClient.includes('mode={mode === "siblings" ? "siblings" : "other_family"}'),
  "all four paid compatibility inputs must show the shared report value preview",
);
assert(
  reportValuePreview.includes("리포트 구성 미리보기")
    && reportValuePreview.includes("실제 분석 결과를 미리 보여주는 화면이 아니라")
    && reportValuePreview.includes("정서적 연결")
    && reportValuePreview.includes("비교·경쟁")
    && reportValuePreview.includes("연락·도움·관여 경계")
    && reportValuePreview.includes("실제 문장은 입력한 두 사람의 계산 결과에 따라 달라집니다."),
  "report preview must explain structure, preserve relationship-specific domains, and avoid presenting sample copy as an actual result",
);
assert(!romanticInputClient.includes("결제 후 제공되는 내용") && !parentChildInputClient.includes("결제 후 제공되는 내용") && !inputClient.includes("결제 후 제공되는 내용"), "old flat included-content lists must be replaced by the richer shared preview");
assert(inputClient.includes("전문 궁합 리포트") && inputClient.includes("결제 금액") && inputClient.includes("NICE 본인확인"), "extended family checkout summary must match the parent-child pre-purchase structure");
assert(inputClient.includes(sharedStorageNotice) && parentChildInputClient.includes(sharedStorageNotice), "all family purchase forms must use the same browser-session privacy notice");
assert(inputClient.includes("결제가 완료되면 브라우저에 남아 있던 상대방 정보는 자동으로 삭제됩니다."), "family privacy copy must explain post-payment browser cleanup");
assert(inputClient.includes("구매 리포트는 {evaluationYear}년판으로 고정 저장됩니다."), "family privacy copy must explain fixed purchase-year storage");
assert(orderRoute.includes("validateCompatibilityPartnerInput") && orderRoute.includes("buildFamilySiblingPaidInputSnapshot") && orderRoute.includes("buildFamilyOtherPaidInputSnapshot"), "extended family orders must validate raw input then derive frozen snapshots server-side");
assert(checkoutPanel.includes('paidEligibilityStatus !== "VERIFIED_ADULT"') && checkoutPanel.includes("immediateGenerationAcknowledged: true"), "extended family checkout must keep adult and immediate-generation gates");
assert(generation.includes("isCompatibilityFamilySiblingProductId") && generation.includes("generateFamilySiblingReport"), "paid generation must dispatch sibling reports from the frozen snapshot");
assert(generation.includes("isCompatibilityFamilyOtherProductId") && generation.includes("generateFamilyOtherReport"), "paid generation must dispatch other-family reports from the frozen snapshot");
assert(reportContract.includes("comparisonAndCompetition") && reportContract.includes("roleAndExpectations") && reportContract.includes("boundariesAndContact"), "report contracts must preserve relationship-specific sections");
assert(reportContract.includes("validateDirectionRefs") && reportContract.includes("OVERUSED_NARRATIVE_PATTERNS"), "report validation must enforce two-way grounding and guard repeated abstract language");
assert(reportContract.includes("grandparent_grandchild") && reportContract.includes("aunt_uncle_niece_nephew") && reportContract.includes("cousins") && reportContract.includes("in_laws"), "other-family report writing must distinguish supported relationship kinds");
assert(reportService.includes("relationshipCore는 두 directional_structure 근거를 모두 반영") && reportService.includes("작성자의 판단 과정을 설명하는 메타 문구를 쓰지 않습니다"), "report service must instruct premium directional and direct customer language");
assert(purchasedList.includes("FAMILY_SIBLINGS_YEAR") && purchasedList.includes("FAMILY_OTHER_YEAR"), "purchased analysis must reopen both extended family yearly editions");

console.log("family-compatibility-extended-regression: OK");
