import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const account = readFileSync("app/account/page.tsx", "utf8");
const mypage = readFileSync("app/mypage/page.tsx", "utf8");
const accountStatus = readFileSync("app/api/account/status/route.ts", "utf8");
const accountsServer = readFileSync("app/lib/accounts/server.ts", "utf8");
const orders = readFileSync("app/api/orders/route.ts", "utf8");

assert(account.includes('fetch("/api/account/status")') && accountStatus.includes("emailVerified") && accountStatus.includes("paidEligibilityStatus"), "account verification display must use authoritative server account status");
assert(account.includes("로그인 이메일") && account.includes("이메일 인증") && account.includes("본인/성인 인증") && account.includes("계정 상태"), "account status must clearly separate email, email verification, adult verification, and lifecycle");
assert(account.includes('UNVERIFIED: "인증 전"'), "UNVERIFIED must use customer-facing pre-verification copy");
assert(account.includes('VERIFIED_ADULT: "인증 완료 · 유료 이용 가능"'), "VERIFIED_ADULT must use customer-facing eligible copy");
assert(account.includes('REVOKED: "재확인 필요"'), "REVOKED must use customer-facing reconfirmation copy");
assert(account.includes("회원가입과 무료 분석 이용에는 인증이 필요하지 않습니다.") && account.includes("유료 분석 결제 전에는 본인/성인 인증이 필요합니다."), "UNVERIFIED guidance must preserve free access and explain paid eligibility");
assert(account.includes("새 유료 분석 결제는 현재 이용할 수 없습니다.") && account.includes("기존에 구매한 분석은 이용 권한 상태에 따라 계속 확인할 수 있습니다."), "REVOKED guidance must block new purchases without revoking existing content");
assert(account.includes("분석 프로필의 생년월일과 계정 본인 인증은 별개입니다."), "account/profile identity separation copy must remain explicit");
console.log("1. account states have clear read-only customer guidance ✓");

assert(account.includes("본인/성인 인증") && account.includes("유료 분석 결제 전에는 본인/성인 인증이 필요합니다.") && !account.includes("본인/성인 인증 안내"), "adult verification guidance must remain inside the account status card without a duplicate future-provider section");
assert(!account.includes("NICE") && !account.includes("PASS") && !account.includes("인증 시작") && !account.includes("휴대폰 인증하기"), "account page must not expose fake provider actions");
assert(!account.includes("paid_eligibility_status") && !account.includes(">VERIFIED_ADULT<"), "account UI must not expose raw backend fields or raw state names");
assert(!account.includes("setPaidEligibility") && !account.includes("/api/account/verification"), "verification status presentation must not mutate eligibility");
assert(!accountsServer.includes("update({ paid_eligibility_status"), "no verification-state write path may be added before provider integration");
console.log("2. no provider CTA or eligibility mutation is present ✓");

for (const label of ['UNVERIFIED: "인증 전"', 'VERIFIED_ADULT: "인증 완료 · 유료 이용 가능"', 'REVOKED: "재확인 필요"']) {
  assert(mypage.includes(label), `My Page terminology must match Account for ${label}`);
}
assert(orders.includes("PAID_ELIGIBILITY_UNVERIFIED") && orders.includes("EMAIL_NOT_VERIFIED"), "paid purchase boundary must remain enforced server-side");
console.log("3. My Page terminology and paid boundary remain consistent ✓");

console.log("account-verification-ux-foundation-regression passed ✓");
