import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`✓ ${message}`);
}

const terms = read("app/terms/page.tsx");
const privacy = read("app/privacy/page.tsx");
const refund = read("app/refund/page.tsx");
const shell = read("app/components/LegalDocumentPage.tsx");
const signup = read("app/auth/signup/page.tsx");
const checkout = read("app/checkout/[productId]/CheckoutAccessPanel.tsx");
const policyConfig = read("app/lib/signupPolicy/config.ts");

for (const route of ["app/terms/page.tsx", "app/privacy/page.tsx", "app/refund/page.tsx"]) {
  assert(read(route).includes("LegalDocumentPage"), `${route} uses the shared public legal document surface`);
  assert(read(route).includes("<h2>"), `${route} has semantic section headings`);
}
assert(shell.includes("<h1") && shell.includes("aria-label=\"정책 문서\""), "shared legal surface has one H1 and labeled policy navigation");
assert(shell.includes("focus:ring-2") && shell.includes("max-w-3xl"), "shared legal surface has visible focus and readable desktop width");
assert(terms.includes("만 14세 이상") && terms.includes("분석 대상 프로필에는 별도 연령 제한"), "Terms separates direct-user age from subject age");
assert(terms.includes("회원가입 없이") && terms.includes("24시간") && terms.includes("생성 시점") && terms.includes("최대 7일"), "Terms distinguishes Guest 24-hour access from seven-day backend retention");
assert(terms.includes("실질적으로 다르거나 결함") && terms.includes("권리를 배제하지 않습니다"), "Terms preserves contract-inconsistent supply rights");
assert(terms.includes("해석적·정보적 콘텐츠") && terms.includes("전문 자문") && terms.includes("법령상 이용자 권리"), "Terms includes the calm fortune disclaimer and statutory-rights protection");
assert(privacy.includes("처리 목적과 법적 근거") && privacy.includes("모든 개인정보 처리를 일반적인 동의 하나에만"), "Privacy maps service processing without blanket consent");
assert(privacy.includes("생성 시각 기준 최대 7일까지") && privacy.includes("24시간입니다") && privacy.includes("정책 증거 기록에 저장하지 않습니다"), "Privacy accurately states Guest access, backend retention, and age-attestation non-persistence");
assert(privacy.includes("필요한 권한 또는 합법적인 근거") && privacy.includes("객관적으로 확인하지 않습니다"), "Privacy separates third-person authority from service verification");
assert(!privacy.includes("FACT-PENDING") && !privacy.includes("[사업자") && !privacy.includes("[이메일"), "Privacy omits unavailable factual provider/business fields");
assert(refund.includes("결제 전") && refund.includes("개인화 분석 생성이 즉시 시작") && refund.includes("중복 결제"), "Refund covers payment and immediate-generation states");
assert(refund.includes("실질적으로 다르거나 결함") && refund.includes("일시적인 처리 지연") && refund.includes("부분 환불을 자동 처리하지 않습니다"), "Refund covers inconsistent supply, temporary delay, and V1 partial-refund behavior");
assert(!refund.includes("결제 후 환불 불가") && !refund.includes("디지털 콘텐츠는 환불 불가") && !refund.includes("모든 환불이 불가능"), "Refund contains no blanket no-refund language");
assert(!terms.includes("FACT-PENDING") && !terms.includes("OWNER-PENDING") && !terms.includes("GENUINE LEGAL AMBIGUITY") && !terms.includes("INTERNAL DRAFT"), "Terms renders no internal project labels or placeholders");
assert(!refund.includes("FACT-PENDING") && !refund.includes("OWNER-PENDING") && !refund.includes("GENUINE LEGAL AMBIGUITY"), "Refund renders no internal project labels or placeholders");
assert(!terms.includes("tombstone") && !terms.includes("scrub") && !terms.includes("RPC") && !privacy.includes("snapshot") && !privacy.includes("fingerprint"), "Customer pages avoid internal database terminology");
assert(!signup.includes("termsAccepted") && !signup.includes("age14OrOlderConfirmed"), "Signup remains unchanged and policy enforcement is not activated");
assert(!checkout.includes("/terms") && !checkout.includes("/refund") && !checkout.includes("acknowledgement"), "Checkout remains unchanged and has no legal activation");
assert(policyConfig.includes("enforceable: false") && policyConfig.includes('TERMS:') && policyConfig.includes('AGE_14_PLUS:'), "Terms and AGE policies remain dormant");

console.log("public-legal-pages-regression passed ✓");
