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
