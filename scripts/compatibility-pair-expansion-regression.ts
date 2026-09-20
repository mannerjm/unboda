import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  COMPATIBILITY_BUSINESS_PRODUCT_ID,
  COMPATIBILITY_FRIEND_PRODUCT_ID,
  COMPATIBILITY_WORKPLACE_PRODUCT_ID,
  getCompatibilityPairEntryPath,
  getCompatibilityPairReportPath,
  getCompatibilityPairSessionKey,
  getSpecialAnalysisProduct,
} from "../app/lib/specialAnalysisProducts";
import { getPairCompatibilityConfig } from "../app/lib/pairCompatibilityConfig";
import { WORKPLACE_RELATIONS } from "../app/lib/workplaceCompatibilityRelation";
import { evaluateCompatibilityAiConsultingScope } from "../app/lib/aiConsultingCompatibilityScope";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const ids = [
  COMPATIBILITY_WORKPLACE_PRODUCT_ID,
  COMPATIBILITY_FRIEND_PRODUCT_ID,
  COMPATIBILITY_BUSINESS_PRODUCT_ID,
] as const;
assert(new Set(ids).size === 3, "new compatibility product IDs must be distinct");

for (const id of ids) {
  const product = getSpecialAnalysisProduct(id);
  assert(product, `${id} must be registered as a special analysis product`);
  assert(product.amount === 19_900, `${id} must use the existing compatibility price`);
  assert(getCompatibilityPairSessionKey(id).includes(id), `${id} must use an isolated browser input session`);
  assert(getCompatibilityPairEntryPath(id).startsWith("/special-analysis/compatibility/"), `${id} must have a dedicated entry route`);
  assert(getCompatibilityPairReportPath(id).endsWith("/report"), `${id} must have a dedicated report route`);
}

const workplace = getPairCompatibilityConfig(COMPATIBILITY_WORKPLACE_PRODUCT_ID);
const friend = getPairCompatibilityConfig(COMPATIBILITY_FRIEND_PRODUCT_ID);
const business = getPairCompatibilityConfig(COMPATIBILITY_BUSINESS_PRODUCT_ID);
assert(workplace.promptFocus.includes("역할 분담과 책임 경계"), "workplace report must own role/collaboration analysis");
assert(friend.promptFocus.includes("친밀감과 신뢰 형성 방식"), "friend report must own trust/distance analysis");
assert(business.promptFocus.includes("역할과 책임 분담"), "business report must own role/responsibility analysis");
assert(business.promptAvoid.some((item) => item.includes("사업 성공·실패")), "business report must prohibit outcome prediction");
assert(business.promptAvoid.some((item) => item.includes("법적 계약")), "business report must prohibit legal replacement");

assert(evaluateCompatibilityAiConsultingScope({
  productId: COMPATIBILITY_WORKPLACE_PRODUCT_ID,
  question: "동료와 업무 역할을 어떻게 나누면 갈등을 줄일 수 있어?",
}).decision === "ALLOW", "workplace consulting must allow owned work-relationship questions");
assert(evaluateCompatibilityAiConsultingScope({
  productId: COMPATIBILITY_WORKPLACE_PRODUCT_ID,
  question: "배우자와의 애정 표현은 어떻게 해야 해?",
}).decision === "DENY", "workplace consulting must reject romantic scope");

assert(evaluateCompatibilityAiConsultingScope({
  productId: COMPATIBILITY_FRIEND_PRODUCT_ID,
  question: "친구와 연락 거리감을 어떻게 맞추면 좋아?",
}).decision === "ALLOW", "friend consulting must allow friendship questions");
assert(evaluateCompatibilityAiConsultingScope({
  productId: COMPATIBILITY_FRIEND_PRODUCT_ID,
  question: "동업자와 지분 문제를 어떻게 봐야 해?",
}).decision === "DENY", "friend consulting must reject business-partner scope");

const mixedBusiness = evaluateCompatibilityAiConsultingScope({
  productId: COMPATIBILITY_BUSINESS_PRODUCT_ID,
  question: "동업자와 업무 역할과 책임을 어떻게 나누면 좋아?",
});
assert(mixedBusiness.decision === "ALLOW", "business scope must prefer the owned partnership context even when work words are present");
assert(mixedBusiness.answerGuardrails.some((item) => item.includes("매출·수익")), "business AI consulting must prohibit revenue prediction");
assert(mixedBusiness.answerGuardrails.some((item) => item.includes("법적 계약 효력")), "business AI consulting must prohibit legal/contract decisions");
assert(evaluateCompatibilityAiConsultingScope({
  productId: COMPATIBILITY_BUSINESS_PRODUCT_ID,
  question: "내년 사업 매출이 얼마가 될까?",
}).decision === "DENY", "business consulting must reject future revenue prediction questions");

const overview = read("app/special-analysis/compatibility/page.tsx");
for (const label of ["연인·배우자 궁합", "가족 궁합", "직장·동료 궁합", "친구·지인 궁합", "사업·동업 궁합"]) {
  assert(overview.includes(label), `compatibility overview must expose ${label}`);
}
for (const relationBadge of ["연인 관계", "가족 관계", "업무 관계", "사적 관계", "사업 관계"]) {
  assert(overview.includes(relationBadge), `compatibility overview must expose relation badge: ${relationBadge}`);
}
assert(
  overview.includes('section className="mt-8 grid gap-5 lg:auto-rows-fr lg:grid-cols-3"'),
  "all compatibility cards must share equal-height desktop grid rows",
);
const unifiedCardClass = 'group flex min-h-[270px] flex-col rounded-[28px] border border-[#dfe3ef] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#a99bea] hover:shadow-md';
assert(
  overview.split(unifiedCardClass).length - 1 === 5,
  "all five compatibility cards must share the same card sizing and surface treatment",
);
assert(!overview.includes("min-h-[290px]"), "legacy oversized compatibility cards must be removed");
assert(!overview.includes(">이용 가능<") && !overview.includes(">가족 궁합 이용 가능<"), "availability badges must be replaced by relation badges");
for (const route of [
  "/special-analysis/compatibility/workplace",
  "/special-analysis/compatibility/friend",
  "/special-analysis/compatibility/business",
]) {
  assert(overview.includes(route), `compatibility overview must link ${route}`);
}

const workplaceInput = read("app/components/PaidCompatibilityAnalysisClient.tsx");
const partnerValidation = read("app/lib/compatibilityCustomerInput.ts");
const paidInput = read("app/lib/compatibilityPaidAnalysis.ts");
const reportPrompt = read("app/lib/compatibilityReportContract.ts");
const reportService = read("app/lib/compatibilityReportService.ts");
const consultingPipeline = read("app/lib/aiConsulting/answerPipeline.ts");
assert(WORKPLACE_RELATIONS.length === 4 && new Set(WORKPLACE_RELATIONS.map((item) => item.id)).size === 4, "workplace relationship selector must have four unique buyer-relative roles");
assert(workplaceInput.includes("상대방과 어떤 업무 관계인가요?") && workplaceInput.includes("workplaceRelation") && workplaceInput.includes("WORKPLACE_RELATIONS.map"), "workplace input must require a role-specific dropdown");
assert(partnerValidation.includes("productId === COMPATIBILITY_WORKPLACE_PRODUCT_ID && !isWorkplaceRelation(raw.workplaceRelation)"), "server must reject workplace checkout without a valid role");
assert(paidInput.includes("workplaceRelation: snapshot.workplaceRelation"), "workplace role must be part of the paid edition fingerprint");
assert(reportPrompt.includes("[WORKPLACE_RELATION_FROM_BUYER_VIEWPOINT]") && reportService.includes("workplaceRelation?: WorkplaceRelation"), "workplace role must shape the evidence-grounded report prompt");
assert(consultingPipeline.includes("role.consultingFocus") && consultingPipeline.includes("workplaceContext + clipText"), "AI consulting must keep the purchased role in the report context");

const orderRoute = read("app/api/orders/route.ts");
const checkout = read("app/checkout/[productId]/CheckoutAccessPanel.tsx");
const checkoutSuccess = read("app/checkout/success/page.tsx");
const generation = read("app/lib/paidReports/generation.ts");
const reportView = read("app/components/CompatibilityPaidReportView.tsx");
const sharedReport = read("app/special-analysis/compatibility/PairCompatibilityReportPage.tsx");
const library = read("app/components/PurchasedAnalysesListMultiEdition.tsx");
const presentation = read("app/lib/aiConsultingPresentation.ts");
const phase9 = read("app/lib/phase9NextAnalysis.ts");

assert(orderRoute.includes("isCompatibilityPairProductId") && orderRoute.includes("productId: resolved.productId"), "orders must freeze the selected pair product into its snapshot");
assert(checkout.includes("getCompatibilityPairSessionKey") && checkout.includes("isPairCompatibility ? { compatibilityPartner }"), "checkout must preserve per-category partner input");
assert(checkoutSuccess.includes("getCompatibilityPairReportPath") && checkoutSuccess.includes("getCompatibilityPairSessionKey"), "payment success must clear and route the exact pair category");
assert(generation.includes("generateCompatibilityReport(timingResult, snapshot.relationshipType, snapshot.workplaceRelation)"), "report generation must pass the purchased relationship type and workplace role");
assert(generation.includes("COMPATIBILITY_PAIR_PAID_REPORT_VERSION"), "new pair reports must use the v2 pair schema");
assert(reportPrompt.includes("[RELATIONSHIP_FOCUS]") && reportPrompt.includes("[DO_NOT_EXPAND_INTO]"), "AI report prompt must receive relation-specific focus and exclusions");
assert(reportView.includes("getPairCompatibilityConfigByRelationshipType") && reportView.includes("config.reportConflictTitle"), "shared report UI must render relation-specific labels");
assert(sharedReport.includes("AiConsultingEntryCard") && sharedReport.includes("Phase9NextAnalysisSection"), "every pair report must continue to AI consulting and Phase 9");
assert(library.includes("getCompatibilityPairReportPath") && library.includes("isCompatibilityPairProductId"), "purchased library must reopen all pair compatibility reports");
for (const id of ["COMPATIBILITY_WORKPLACE_PRODUCT_ID", "COMPATIBILITY_FRIEND_PRODUCT_ID", "COMPATIBILITY_BUSINESS_PRODUCT_ID"]) {
  assert(presentation.includes(id), `AI consulting presentation missing ${id}`);
}
for (const mapping of [
  '"compatibility-workplace": ["career-workplace-relationships"',
  '"compatibility-friend": ["relationship-friendship"',
  '"compatibility-business": ["business-team-management"',
]) {
  assert(phase9.includes(mapping), `Phase 9 follow-up missing: ${mapping}`);
}

console.log("compatibility pair expansion regression passed ✓");
