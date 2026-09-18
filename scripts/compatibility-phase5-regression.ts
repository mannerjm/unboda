import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  COMPATIBILITY_ROMANTIC_PRODUCT,
  COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  COMPATIBILITY_ROMANTIC_SESSION_KEY,
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT,
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID,
  COMPATIBILITY_FAMILY_PARENT_CHILD_SESSION_KEY,
  COMPATIBILITY_FAMILY_SIBLING_PRODUCT,
  COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID,
  COMPATIBILITY_FAMILY_SIBLING_SESSION_KEY,
  COMPATIBILITY_FAMILY_OTHER_PRODUCT,
  COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID,
  COMPATIBILITY_FAMILY_OTHER_SESSION_KEY,
} from "../app/lib/specialAnalysisProducts";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const specialEntry = read("app/special-analysis/page.tsx");
const compatibilityEntry = read("app/special-analysis/compatibility/page.tsx");
const romanticPage = read("app/special-analysis/compatibility/romantic/page.tsx");
const familyPage = read("app/special-analysis/compatibility/family/page.tsx");
const familyInputPage = read("app/special-analysis/compatibility/family/parent-child/page.tsx");
const romanticInput = read("app/components/PaidCompatibilityAnalysisClient.tsx");
const familySelector = read("app/components/FamilyCompatibilityAnalysisClient.tsx");
const parentChildInput = read("app/components/PaidFamilyParentChildAnalysisClient.tsx");
const extendedInput = read("app/components/PaidFamilyExtendedAnalysisClient.tsx");
const reportPreview = read("app/components/CompatibilityReportValuePreview.tsx");
const checkout = read("app/checkout/[productId]/CheckoutAccessPanel.tsx");
const extendedCheckout = read("app/checkout/[productId]/FamilyExtendedCheckoutAccessPanel.tsx");
const checkoutPage = read("app/checkout/[productId]/page.tsx");

const phase5Surfaces = [
  ["special entry", specialEntry],
  ["compatibility entry", compatibilityEntry],
  ["romantic page", romanticPage],
  ["family page", familyPage],
  ["family input page", familyInputPage],
  ["romantic input", romanticInput],
  ["family selector", familySelector],
  ["parent-child input", parentChildInput],
  ["extended family input", extendedInput],
  ["compatibility preview", reportPreview],
  ["extended family checkout", extendedCheckout],
] as const;

for (const [name, source] of phase5Surfaces) {
  for (const warmToken of ["#fbfbfa", "#f3eadb", "#e7ddcd", "#fbf8f2", "#fffdfa", "#e6dccb", "#faf6ee"]) {
    assert(!source.includes(warmToken), `${name} must not use legacy warm token ${warmToken}`);
  }
  assert(
    !source.includes("text-stone-") && !source.includes("bg-stone-") && !source.includes("border-stone-"),
    `${name} must use the cool Phase 5 neutral system`,
  );
}

for (const [name, source] of [
  ["special entry", specialEntry],
  ["compatibility entry", compatibilityEntry],
  ["romantic page", romanticPage],
  ["family page", familyPage],
  ["family input page", familyInputPage],
] as const) {
  assert(source.includes('bg-[#f5f7fc]'), `${name} must use the cool service canvas`);
}

assert(compatibilityEntry.includes("연인·배우자 궁합") && compatibilityEntry.includes("가족 궁합"), "compatibility entry must keep both relationship worlds");
assert(compatibilityEntry.includes("COMPATIBILITY_ROMANTIC_PRODUCT.amount") && compatibilityEntry.includes("COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT.amount"), "compatibility entry must keep registry pricing");
assert(romanticPage.includes("PaidCompatibilityAnalysisClient"), "romantic route must keep the existing paid input client");
assert(familyInputPage.includes("FamilyCompatibilityAnalysisClient"), "family route must keep the existing family selector client");

assert(romanticInput.includes("두 흐름을 연결합니다"), "romantic input must express the two-flow relationship language");
assert(parentChildInput.includes("두 흐름을 연결합니다"), "parent-child input must express the two-flow relationship language");
assert(extendedInput.includes("두 흐름을 연결합니다"), "extended-family input must express the two-flow relationship language");

assert(romanticInput.includes("sessionStorage.setItem(COMPATIBILITY_ROMANTIC_SESSION_KEY"), "romantic raw partner input must remain browser-session scoped");
assert(romanticInput.includes(`router.push(\`/checkout/${COMPATIBILITY_ROMANTIC_PRODUCT_ID}?profileId=${encodeURIComponent(profileId)}\`)`), "romantic checkout must remain profile scoped");
assert(parentChildInput.includes("COMPATIBILITY_FAMILY_PARENT_CHILD_SESSION_KEY") && parentChildInput.includes("sessionStorage.setItem"), "parent-child raw family input must remain browser-session scoped");
assert(parentChildInput.includes(`/checkout/${COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID}?profileId=`), "parent-child checkout must remain profile scoped");
assert(extendedInput.includes("COMPATIBILITY_FAMILY_SIBLING_SESSION_KEY") && extendedInput.includes("COMPATIBILITY_FAMILY_OTHER_SESSION_KEY"), "extended family must preserve separate session contracts");
assert(extendedInput.includes(`router.push(\`/checkout/${productId}?profileId=${encodeURIComponent(profileId)}\`)`), "extended-family checkout must remain profile scoped");

assert(familySelector.includes('mode="siblings"') && familySelector.includes('mode="other_family"'), "family selector must keep sibling and other-family modes");
assert(parentChildInput.includes('<option value="parent">부모예요</option>') && parentChildInput.includes('<option value="child">자녀예요</option>'), "parent-child semantic role selection must remain intact");
assert(extendedInput.includes("grandparent_grandchild") && extendedInput.includes("aunt_uncle_niece_nephew") && extendedInput.includes("cousins") && extendedInput.includes("in_laws"), "other-family semantic relationships must remain intact");

for (const marker of [
  'mode="romantic"',
  'mode="parent_child"',
  'mode={mode === "siblings" ? "siblings" : "other_family"}',
]) {
  assert(
    romanticInput.includes(marker) || parentChildInput.includes(marker) || extendedInput.includes(marker),
    `shared compatibility report preview contract missing: ${marker}`,
  );
}
assert(reportPreview.includes("리포트 구성 미리보기"), "all compatibility purchases must keep the report structure preview");
assert(reportPreview.includes("실제 분석 결과를 미리 보여주는 화면이 아니라"), "preview must not masquerade as an actual report");
assert(reportPreview.includes("단순 점수 대신 관계의 맥락을 나눠 설명"), "preview must retain relationship-context framing");

for (const product of [
  COMPATIBILITY_ROMANTIC_PRODUCT,
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT,
  COMPATIBILITY_FAMILY_SIBLING_PRODUCT,
  COMPATIBILITY_FAMILY_OTHER_PRODUCT,
]) {
  assert(product.amount === 19_900, `${product.id} price must stay 19,900 KRW`);
}
assert(COMPATIBILITY_ROMANTIC_PRODUCT_ID === "compatibility-romantic", "romantic product id changed");
assert(COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID === "compatibility-family-parent-child", "parent-child product id changed");
assert(COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID === "compatibility-family-siblings", "sibling product id changed");
assert(COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID === "compatibility-family-other", "other-family product id changed");
assert(new Set([
  COMPATIBILITY_ROMANTIC_SESSION_KEY,
  COMPATIBILITY_FAMILY_PARENT_CHILD_SESSION_KEY,
  COMPATIBILITY_FAMILY_SIBLING_SESSION_KEY,
  COMPATIBILITY_FAMILY_OTHER_SESSION_KEY,
]).size === 4, "all compatibility raw-input session keys must remain isolated");

assert(!romanticInput.includes("2026년판") && !parentChildInput.includes("2026년판") && !extendedInput.includes("2026년판"), "compatibility purchase-year copy must remain dynamic");
assert(romanticInput.includes("evaluationYear") && parentChildInput.includes("evaluationYear") && extendedInput.includes("evaluationYear"), "all compatibility inputs must expose the dynamic purchase year");

assert(checkout.includes("COMPATIBILITY_ROMANTIC_SESSION_KEY") && checkout.includes("COMPATIBILITY_FAMILY_PARENT_CHILD_SESSION_KEY"), "standard checkout must keep romantic and parent-child session handoff");
assert(checkout.includes('fetch("/api/orders"'), "standard compatibility checkout must preserve the existing order endpoint");
assert(checkout.includes("immediateGenerationAcknowledged: true"), "standard compatibility checkout must preserve immediate-generation acknowledgement");
assert(checkout.includes("window.TossPayments") && checkout.includes("requestPayment"), "standard compatibility checkout must preserve Toss invocation");

assert(extendedCheckout.includes("COMPATIBILITY_FAMILY_SIBLING_SESSION_KEY") && extendedCheckout.includes("COMPATIBILITY_FAMILY_OTHER_SESSION_KEY"), "extended checkout must keep isolated family payload handoff");
assert(extendedCheckout.includes('fetch("/api/orders/family-extended"'), "extended-family checkout must preserve its dedicated order endpoint");
assert(extendedCheckout.includes("immediateGenerationAcknowledged: true"), "extended-family checkout must preserve immediate-generation acknowledgement");
assert(extendedCheckout.includes("window.TossPayments") && extendedCheckout.includes("requestPayment"), "extended-family checkout must preserve Toss invocation");
assert(extendedCheckout.includes("가족 궁합 결제 준비 상태"), "extended-family checkout must expose the Phase 5 readiness summary");
assert(checkoutPage.includes("FamilyExtendedCheckoutAccessPanel") && checkoutPage.includes("CheckoutAccessPanel"), "checkout dispatcher must keep both compatibility checkout contracts");

console.log("Compatibility Phase 5 UX regression passed ✓");
