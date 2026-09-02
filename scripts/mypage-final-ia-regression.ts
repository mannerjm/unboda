import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const mypage = readFileSync("app/mypage/page.tsx", "utf8");
const accountStatusRoute = readFileSync("app/api/account/status/route.ts", "utf8");
const interests = readFileSync("app/interests/page.tsx", "utf8");
const purchased = readFileSync("app/purchased-analyses/page.tsx", "utf8");

assert(mypage.includes('fetch("/api/account/status")') && mypage.includes("setAccountStatus"), "My Page must read account status from the authoritative account endpoint");
assert(!/fetch\([^)]*\/api\/account\/.*(?:POST|PUT|PATCH|DELETE)/.test(mypage), "My Page account status must remain read-only");
assert(mypage.includes("로그인 이메일") && mypage.includes("이메일 인증") && mypage.includes("본인/성인 인증"), "My Page must present compact account status fields");
assert(mypage.includes('href="/account"') && mypage.includes("계정 설정에서 확인하기"), "My Page account status must link to sensitive account settings");
assert(!mypage.includes("NICE") && !mypage.includes("PASS") && !mypage.includes("인증 시작") && !mypage.includes('>VERIFIED_ADULT<'), "My Page must not expose provider branding, fake verification, or raw eligibility state");
console.log("1. account status is read-only, account-level, and provider-neutral ✓");

assert(mypage.includes("프로필은 분석 대상이며 계정 본인 인증과 별개입니다."), "My Page must distinguish profile data from account verification");
assert(mypage.includes("현재 분석 대상") && mypage.includes("인원 추가") && mypage.includes("프로필 수정") && mypage.includes("삭제 확인"), "existing active selection and profile actions must remain intact");
assert(!mypage.includes("회원탈퇴 요청하기"), "My Page must keep destructive closure action on /account");
console.log("2. profile ownership remains on My Page and separate from account identity ✓");

assert(mypage.includes('href="/interests"') && mypage.includes("관심 분석"), "My Page must link to the interested-analysis library");
assert(mypage.includes('href="/purchased-analyses"') && mypage.includes("구매한 분석"), "My Page must link to the purchased-analysis library");
assert(mypage.includes("내 보관함") && mypage.includes("결제 내역"), "My Page must distinguish content library from financial history");
assert(mypage.includes("아직 결제 또는 환불 내역이 없습니다."), "payment history must have a calm empty state");
assert(interests.includes("listUserInterestedAnalysesWithCurrentState") && purchased.includes("PurchasedAnalysesAutoRefresh"), "dedicated library pages must remain authoritative for interest and purchased content state");
console.log("3. library shortcuts and distinct payment history remain integrated ✓");

assert(accountStatusRoute.includes("emailVerified") && accountStatusRoute.includes("paidEligibilityStatus"), "account status endpoint must provide existing authoritative display data");
assert(mypage.includes("계정 관리") && mypage.includes("로그아웃"), "account management and logout must remain discoverable in My Page");

console.log("mypage-final-ia-regression passed ✓");
