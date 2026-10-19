import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Build-time ownership/auth guard. Runtime cross-account E2E is a separate launch gate.
const read=(p:string)=>readFileSync(p,"utf8");
const auth=read("app/lib/supabase/auth.ts");
const profile=read("app/api/profiles/route.ts");
const mypage=read("app/api/mypage/summary/route.ts");
const refund=read("app/api/ai-consulting/credits/refunds/route.ts");
const checkout=read("app/api/orders/[orderId]/confirm-payment/route.ts");
const creditCheckout=read("app/api/ai-consulting/credits/orders/[orderId]/confirm-payment/route.ts");
const memory = read("app/api/ai-consulting/memories/route.ts");
const portfolio = read("app/api/ai-consulting/portfolio/route.ts");
const creditBalance = read("app/api/ai-consulting/credits/balance/route.ts");
const reportStatus = read("app/api/paid-analysis-detail-v2/status/route.ts");
const httpProbe = read("scripts/two-account-readonly-e2e.ts");
for(const [name,route] of [["memory",memory],["portfolio",portfolio],["credit balance",creditBalance],["report status",reportStatus]] as const) {
  assert(route.includes("getCurrentUser()") && route.includes("getUserProfile(profileId, user.id)"), name+" must use server session and owner-bound profile");
}
assert(memory.includes("activeProfile.id !== profile.id") && portfolio.includes("activeProfile.id !== profile.id"),"AI memory and portfolio must be active-profile scoped");
assert(reportStatus.includes("getActiveEntitlementForProfile") && reportStatus.includes("getPaidReport(user.id, profile.id"),"report status must validate purchased entitlement for owner");
assert(httpProbe.includes("UNBODA_E2E_EXPECTED_HOST") && httpProbe.includes("UNBODA_E2E_COOKIE_A")
  && httpProbe.includes("mustDeny(\"/api/ai-consulting/memories?profileId=\""),"HTTP probe must pin target host and attempt actual foreign-profile GET");
assert(httpProbe.includes("async function anonymousMustDeny")
  && httpProbe.includes('assert.equal(response.status, 401, "anonymous access must return 401:')
  && httpProbe.includes("own AI memory list must be readable")
  && httpProbe.includes("own AI portfolio must be readable")
  && httpProbe.includes("own credit balance must return the selected profile")
  && httpProbe.includes("unpaid report 403"),
  "staging HTTP E2E must check anonymous, owner-positive and foreign-owner-negative boundaries");
const e2eReadiness = read("app/api/internal/e2e-readiness/route.ts");
const e2eProbe = read("scripts/two-account-readonly-e2e.ts");
assert(e2eReadiness.includes('process.env.VERCEL_ENV === "preview"')
  && e2eReadiness.includes('process.env.UNBODA_E2E_STAGING_ENABLED === "true"')
  && e2eReadiness.includes('process.env.TOSS_LIVE_CHECKOUT_ENABLED !== "true"')
  && e2eReadiness.includes('process.env.TOSS_LIVE_PILOT_ENABLED !== "true"')
  && e2eReadiness.includes('process.env.VERCEL_GIT_COMMIT_REF === "test/staging-tenant-e2e"')
  && e2eReadiness.includes('createAdminClient()')
  && e2eReadiness.includes('enabled = !error && typeof count === "number" && count >= 2')
  && e2eReadiness.includes('status: enabled ? 200 : 404'),"staging readiness must verify server-side staging DB credentials and fail closed");
assert(e2eProbe.includes('"/api/internal/e2e-readiness"')
  && e2eProbe.indexOf("readyResponse.status") < e2eProbe.indexOf("cookieA),"),"staging proof required before sending any test session");
// Owner-scoped reads use the privileged DB client, so RLS alone is insufficient.
const paidReportDb = read("app/lib/paidReports/server.ts");
const purchaseDb = read("app/lib/purchases/server.ts");
const aiMemoryDb = read("app/lib/aiConsulting/memory.ts");
const aiPortfolioDb = read("app/lib/aiConsulting/portfolio.ts");
for(const [name,source] of [["paid report",paidReportDb],["purchase entitlement",purchaseDb],["AI memory",aiMemoryDb],["AI portfolio",aiPortfolioDb]] as const) {
  assert(source.includes('.eq("user_id",') && source.includes('.eq("profile_id",'),
    name+" privileged server query must enforce user and profile ownership");
}
assert(paidReportDb.includes('.eq("product_id", productId)') && paidReportDb.includes('.eq("analysis_edition_key", analysisEditionKey)'),
  "paid report must enforce product and purchased edition");
assert(purchaseDb.includes('getActiveEntitlementForProfileEdition') && purchaseDb.includes('.eq("analysis_edition_key", analysisEditionKey)'),
  "entitlement must enforce edition identity");
const paidMemorySql = read("scripts/staging-paid-content-memory-rls-rollback.sql");
assert(paidMemorySql.includes("\\nROLLBACK;") || paidMemorySql.trimEnd().endsWith("ROLLBACK;"), "staging paid-content test must roll back");
assert(paidMemorySql.includes("ACCOUNT_A_OWN_CONTENT_VISIBILITY_FAILED")
  && paidMemorySql.includes("ACCOUNT_B_FOREIGN_CONTENT_DENIAL_FAILED")
  && paidMemorySql.includes("ANONYMOUS_PAID_OR_AI_CONTENT_VISIBLE")
  && paidMemorySql.includes("CROSS_ACCOUNT_MESSAGE_REFERENCE_NOT_BLOCKED"),
  "staging fixture must test both identities, anonymous denial and cross-owner references");
const captcha=read("app/auth/AuthCaptcha.tsx");
const signup=read("app/api/auth/signup/route.ts");
assert(auth.includes("supabase.auth.getUser()"), "auth identity must be validated server-side");
assert(profile.includes("getCurrentUser()") && profile.includes("listUserProfiles(user.id)") && profile.includes("createUserProfile(validation.value, user.id)"), "profile reads and creates must use verified user");
for(const x of ["listUserProfiles(user.id)","listUserFreeAnalysisResults(user.id)","listUserPaidAnalysisSummaries(user.id)","getAccountPaymentHistory(user.id)"]){assert(mypage.includes(x),"mypage must be user-scoped: "+x)}
assert(refund.includes("getCurrentUser()") && refund.includes("getUserProfile(profileId,user.id)") && refund.includes("isAiCreditRefundAllowedForUser(user.id)"),"refund requires identity, profile ownership and rollout gate");
assert(checkout.includes("getOrderForUser(orderId, user.id)") && checkout.includes("order.amount !== resolved.amount"),"paid confirmation requires owned order and server amount");
assert(creditCheckout.includes("getCurrentUser()") && creditCheckout.includes("isTossCheckoutUserAllowed(user.id)"),"credit confirmation must authorize checkout account");
assert(captcha.includes("NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED") && captcha.includes("NEXT_PUBLIC_TURNSTILE_SITE_KEY"),"CAPTCHA readiness must stay explicit");
assert(signup.includes("captchaToken: captchaRequired") && signup.includes("supabase.auth.signUp("),"signup must forward enforced CAPTCHA to Supabase");
console.log("auth-tenant-isolation-launch-regression: PASS (static code boundaries, not physical cross-account E2E)");
