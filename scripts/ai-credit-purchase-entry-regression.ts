import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AI_CONSULTING_CREDIT_BUNDLES } from "../app/lib/aiConsulting/commercialPolicy";

const read = (path: string) => readFileSync(path, "utf8");
const main = read("app/ai-consulting/AiConsultingPortfolioClient.tsx");
const page = read("app/ai-consulting/page.tsx");
const creditsPage = read("app/ai-consulting/credits/page.tsx");
const checkout = read("app/ai-consulting/credits/CreditCheckoutClient.tsx");
const success = read("app/ai-consulting/credits/success/page.tsx");
const orders = read("app/api/ai-consulting/credits/orders/route.ts");

assert(main.includes("creditCheckoutAvailable = false") && main.includes("const creditCheckoutEnabled = creditCheckoutAvailable;"), "client must receive server-validated purchase eligibility instead of trusting public config alone");
assert(page.includes("isAiConsultingCreditCheckoutEnabled()") && page.includes("isTossCheckoutUserAllowed(user.id)") && page.includes("creditCheckoutAvailable={creditCheckoutAvailable}"), "purchase CTA must respect both feature switch and production review-user allowlist");
assert(creditsPage.includes("isTossCheckoutUserAllowed(user.id)") && creditsPage.includes("checkoutEnabled={providerReady}"), "credit checkout must stay disabled for users blocked by the TEST allowlist");
assert(orders.includes("isAiConsultingCreditCheckoutEnabled()") && orders.includes("isTossCheckoutUserAllowed(user.id)"), "purchase server must preserve authoritative feature and review-account checks");
assert(main.includes('href={creditPurchaseHref}') && main.includes("#question-bundles"), "main CTA must jump directly to purchase options");
assert(main.includes("공용 질문권") && main.includes("질문권 구매하기 →") && main.includes("질문권 상품 보기 →"), "the balance card must expose the only prominent purchase or product-browse action");
assert(main.includes("portfolio.questionsRemaining > 0") && main.includes("현재 질문권 결제 준비 중") && !main.includes("credit-recharge-title"), "zero balance must preserve honest disabled-checkout copy without duplicating a large recharge banner");
assert(main.includes("!isPreview") && main.includes("새 답변에는 질문권이 필요해요. 지난 상담 기록은 그대로 볼 수 있어요."), "operator preview cannot launch checkout and zero-credit history remains readable");
assert(main.includes("creditPurchaseHref && !isPreview"), "no clickable purchase action in preview");
assert(checkout.includes('id="question-bundles"') && checkout.includes("몇 번 더 물어보고 싶으세요?"), "purchase cards must appear near top and support deep link");
assert(checkout.includes("!checkoutEnabled") && checkout.includes("disabled={!checkoutEnabled || activeBundleId !== null}"), "disabled checkout must never create an order");
assert(checkout.includes("bundle.priceKrw.toLocaleString") && checkout.includes("bundle.questions}회 구매하기"), "each bundle must show its own server-defined price and clear purchase CTA");
for (const { questions, priceKrw } of AI_CONSULTING_CREDIT_BUNDLES) {
  assert(questions > 0 && priceKrw > 0, "bundles must have a positive count and price");
}
assert(success.includes("router.replace(consultationHref)") && success.includes("confirm-payment"), "successful purchase returns to the existing consultation only after payment confirmation");
console.log("AI credit purchase entry regression: PASS");
