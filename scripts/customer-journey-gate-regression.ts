import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const eligibility = read("app/lib/freeAnalysisEligibility.ts");
const checkoutPage = read("app/checkout/[productId]/page.tsx");
const checkout = read("app/checkout/[productId]/CheckoutAccessPanel.tsx");
const familyCheckout = read("app/checkout/[productId]/FamilyExtendedCheckoutAccessPanel.tsx");
const orders = read("app/api/orders/route.ts");
const familyOrders = read("app/api/orders/family-extended/route.ts");
const aiPage = read("app/ai-consulting/page.tsx");
const aiClient = read("app/ai-consulting/AiConsultingPortfolioClient.tsx");
const deepAnalysis = read("app/deep-analysis/page.tsx");
const specialAnalysis = read("app/special-analysis/page.tsx");
const guestTransfer = read("supabase/migrations/046_guest_profile_transfer_policy.sql");

assert(eligibility.includes('status === "completed" || status === "needs_retry"'), "completed stored free analysis must open the paid journey");
assert(eligibility.includes("resolveProfileFreeAnalysisStatus(profile, summaries)") && !eligibility.includes("createEvaluationContext"), "purchase readiness must follow the current profile fingerprint without monthly re-locking");

assert(checkoutPage.includes("getProfileFreeAnalysisFoundationStatus") && checkoutPage.includes("freeAnalysisStatus"), "checkout page must resolve the selected profile's free-analysis foundation");
assert(checkout.includes("FREE ANALYSIS REQUIRED") && checkout.includes("무료 사주 먼저 보기"), "standard checkout must guide an unready profile to free saju");
assert(familyCheckout.includes("FREE ANALYSIS REQUIRED") && familyCheckout.includes("무료 사주 먼저 보기"), "family checkout must enforce the same customer journey");

for (const source of [orders, familyOrders]) {
  const freeGate = source.indexOf("getProfileFreeAnalysisFoundationStatus");
  const orderMutation = Math.max(source.indexOf("await createPendingOrder"), source.indexOf("await createFamilySiblingPendingOrder"));
  assert(freeGate !== -1 && source.includes("FREE_ANALYSIS_REQUIRED"), "order API must enforce free-analysis readiness server-side");
  assert(orderMutation === -1 || freeGate < orderMutation, "free-analysis gate must run before commercial order mutation");
}

assert(aiPage.includes("getProfileFreeAnalysisFoundationStatus") && aiPage.includes("freeAnalysisStatus"), "AI hub must know the active profile's free-analysis journey state");
assert(aiClient.includes("무료 사주부터 확인해 주세요") && aiClient.includes("유료 분석 리포트가 먼저 필요합니다"), "AI empty state must guide users through free then paid analysis");
assert(aiClient.includes("질문권 구매하기 →") && aiClient.includes("질문권 상품 보기 →") && aiClient.includes("creditCheckoutAvailable"), "AI hub must expose a prominent credit purchase path only when checkout is available for the active user");

assert(!deepAnalysis.includes('redirect("/auth/login'), "deep-analysis discovery must remain publicly browsable");
assert(!specialAnalysis.includes('redirect("/auth/login'), "special-analysis discovery must remain publicly browsable");
assert(specialAnalysis.includes("로그인 없이 둘러보기 가능"), "special-analysis discovery must explain the deferred purchase gate");

assert(guestTransfer.includes("insert into public.active_profiles") && guestTransfer.includes("free_analysis_results"), "guest free-saju transfer must keep profile activation and stored result continuity");

console.log("customer journey gate regression passed");
