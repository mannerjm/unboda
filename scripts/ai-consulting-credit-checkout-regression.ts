import { readFileSync } from "fs";
import { join } from "path";
import { AI_CONSULTING_CREDIT_BUNDLES } from "../app/lib/aiConsulting/commercialPolicy";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

const bundleMap = new Map(AI_CONSULTING_CREDIT_BUNDLES.map((bundle) => [bundle.id, bundle]));
assert(bundleMap.get("ai-consulting-3")?.questions === 3 && bundleMap.get("ai-consulting-3")?.priceKrw === 2900, "3-credit bundle contract must remain 2,900 KRW");
assert(bundleMap.get("ai-consulting-5")?.questions === 5 && bundleMap.get("ai-consulting-5")?.priceKrw === 4900, "5-credit bundle contract must remain 4,900 KRW");
assert(bundleMap.get("ai-consulting-10")?.questions === 10 && bundleMap.get("ai-consulting-10")?.priceKrw === 8900, "10-credit bundle contract must remain 8,900 KRW");

const service = read("app/lib/aiConsulting/creditCheckout.ts");
assert(service.includes('AI_CONSULTING_CREDIT_PAYMENT_PROVIDER = "toss_ai_credit"'), "credit orders must stay isolated from paid-analysis Toss reconciliation");
assert(service.includes("assertPaidPurchaseEligibility"), "credit checkout must preserve paid-purchase account eligibility");
assert(service.includes("getActiveEntitlementForProfileEdition"), "credit checkout must require exact paid-analysis entitlement");
assert(service.includes("getPaidReport"), "credit checkout must require a completed paid report");
assert(service.includes("amount: bundle.priceKrw"), "credit order amount must come from server commercial policy");
assert(service.includes('payment_provider: AI_CONSULTING_CREDIT_PAYMENT_PROVIDER'), "credit order must use its isolated provider discriminator");
assert(service.includes('analysis_edition_key: null'), "credit bundle purchase must not masquerade as a paid-analysis edition");
assert(service.includes('rpc("record_ai_consulting_credit_purchase"'), "verified paid purchase must issue credits through the hardened ledger RPC");
assert(service.includes("p_quantity: bundle.questions"), "ledger quantity must come from the server bundle definition");
assert(service.includes("getAiConsultingCreditBalance"), "finalization must return the authoritative profile balance");
assert(service.includes("reconcileAiConsultingCreditPaymentsBatch"), "credit checkout must expose a recovery worker");
assert(service.includes("getPaymentByOrderIdFromToss"), "recovery must verify provider state instead of inventing payment success");
assert(service.includes('provider.currency !== "KRW"'), "recovery must fail closed on currency mismatch");

const createRoute = read("app/api/ai-consulting/credits/orders/route.ts");
assert(createRoute.includes("getCurrentUser"), "credit order API must derive the authenticated user server-side");
assert(createRoute.includes("getUserProfile"), "credit order API must verify profile ownership");
assert(createRoute.includes("getTossConfig"), "credit order API must fail closed when Toss configuration is unavailable");
assert(createRoute.includes("createPendingAiConsultingCreditOrder"), "credit order API must delegate to the server-only order boundary");
assert(!createRoute.includes("amount?: unknown"), "credit order API must never accept a client-supplied amount");

const confirmRoute = read("app/api/ai-consulting/credits/orders/[orderId]/confirm-payment/route.ts");
assert(confirmRoute.includes("getOrderForUser"), "confirmation must bind the order to the authenticated user");
assert(confirmRoute.includes("order.amount !== bundle.priceKrw"), "confirmation must re-check server price");
assert(confirmRoute.includes("provider.orderId !== order.id"), "confirmation must verify provider order reference");
assert(confirmRoute.includes("provider.totalAmount !== order.amount"), "confirmation must verify provider amount");
assert(confirmRoute.includes('provider.currency !== "KRW"'), "confirmation must verify provider currency");
assert(confirmRoute.includes('provider.status !== "DONE"'), "confirmation must require provider DONE status");
const paidIndex = confirmRoute.indexOf("markOrderPaid(order, provider.paymentKey)");
const finalizeIndex = confirmRoute.indexOf("finalizeAiConsultingCreditPurchase(paidOrder)");
assert(paidIndex >= 0 && finalizeIndex > paidIndex, "credits must be issued only after the internal order is marked paid");
assert(confirmRoute.includes("reconciliation_required"), "partial persistence after provider success must remain recoverable");

const reconcileRoute = read("app/api/internal/payments/reconcile/route.ts");
assert(reconcileRoute.includes("reconcilePaymentsBatch"), "existing paid-analysis reconciliation must remain wired");
assert(reconcileRoute.includes("reconcileAiConsultingCreditPaymentsBatch"), "AI credit reconciliation must run alongside existing payment recovery");
assert(reconcileRoute.includes("PAYMENT_RECONCILIATION_SECRET"), "combined reconciliation must remain server-authenticated");

const chat = read("app/ai-consulting/AiConsultingChatClient.tsx");
assert(chat.includes("NEXT_PUBLIC_AI_CONSULTING_CREDIT_CHECKOUT_ENABLED"), "credit purchase entry must remain feature-gated until live approval");
assert(chat.includes("AI 질문권 구매·내역"), "zero-balance chat state must expose the checkout entry only when enabled");
assert(chat.includes("질문권 내역 보기"), "zero-balance chat state must keep history accessible while checkout is disabled");

console.log("ai consulting credit checkout regression passed");
