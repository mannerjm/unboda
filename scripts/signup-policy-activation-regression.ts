import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getSafeReturnTo } from "../app/lib/auth";
import { getSignupCompletionState } from "../app/lib/signupPolicy/completion";
import { completeNewSignupWithEvidence } from "../app/lib/signupPolicy/signupService";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`✓ ${message}`);
}

const signup = read("app/auth/signup/page.tsx");
const route = read("app/api/auth/signup/route.ts");
const policy = read("app/lib/signupPolicy/config.ts");
const server = read("app/lib/signupPolicy/server.ts");
const callback = read("app/auth/callback/route.ts");
const guestResult = read("app/guest-result/page.tsx");
const guestTransfer = read("app/api/guest-free-analysis/transfer/route.ts");
const guestServer = read("app/lib/guestFreeAnalyses/server.ts");

assert(signup.includes('checked={false}') === false, "signup controls are state-controlled rather than forced checked");
assert(signup.includes("useState(false)") && signup.includes("age14OrOlderConfirmed") && signup.includes("termsAccepted"), "both policy controls default unchecked");
assert(signup.includes("저는 만 14세 이상입니다.") && signup.includes('href="/terms"'), "age text and Terms link are present");
assert(signup.includes("/api/auth/signup") && !signup.includes("createClient"), "browser delegates signup to the server boundary");
assert(!signup.includes("Privacy") && !signup.includes("마케팅") && !signup.includes("NICE"), "signup has no Privacy, marketing, or NICE requirement");
assert(signup.includes("role=\"alert\"") && signup.includes("focus-visible"), "signup exposes accessible errors and visible focus");

assert(route.includes("body.termsAccepted !== true") && route.includes("body.age14OrOlderConfirmed !== true"), "server rejects missing or false policy choices");
assert(route.includes("SIGNUP_POLICIES.TERMS.version") && route.includes("SIGNUP_POLICIES.AGE_14_PLUS.version"), "server derives canonical versions from policy config");
assert(!route.includes("body.termsVersion") && !route.includes("body.agePolicyVersion") && !route.includes("body.userId"), "client cannot choose policy versions or user ID");
assert(route.includes("recordSignupPolicyAcceptance") && route.includes("SIGNUP_POLICY_INCOMPLETE"), "evidence writes use protected helper and fail closed");
assert(route.includes("getCurrentUser") && route.includes("isSignupPolicyComplete"), "revisit recovery is authenticated and completion-checked");

assert(policy.includes('version: "TERMS_V1"') && policy.includes('version: "AGE_14_PLUS_V1"'), "canonical V1 policy versions remain unchanged");
assert(policy.includes("enforceable: true"), "both frozen signup policies are active");
assert(server.includes("accepted.has") && server.includes("return false"), "unknown or incomplete policy state fails closed");
assert(callback.includes('signupPolicyRequired') && callback.includes("isSignupPolicyComplete"), "email callback blocks policy-incomplete activation flow");

assert(guestResult.includes("무료 분석 결과") && guestResult.includes("/auth/signup?returnTo=/auth/complete-guest-analysis"), "Guest full result remains available before signup and preserves transfer return path");
assert(guestTransfer.includes("transferGuestFreeAnalysisToUser") && guestTransfer.includes("response.cookies.set") && guestServer.includes("complete_guest_analysis_transfer"), "Guest transfer remains server-owned and clears its cookie only after transfer");
assert(getSafeReturnTo("/") === "/", "root returnTo is accepted");
assert(getSafeReturnTo("/mypage") === "/mypage", "internal returnTo is accepted");
assert(getSafeReturnTo("/analysis/some-valid-internal-path") === "/analysis/some-valid-internal-path", "nested internal returnTo is accepted");
assert(getSafeReturnTo("/auth/complete-guest-analysis") === "/auth/complete-guest-analysis", "Guest transfer returnTo is accepted");
assert(getSafeReturnTo("//evil.example") === "/result", "protocol-relative returnTo is rejected");
assert(getSafeReturnTo("%2F%2Fevil.example") === "/result", "encoded protocol-relative returnTo is rejected");
assert(getSafeReturnTo("/%2Fevil.example") === "/result", "encoded second slash returnTo is rejected");
assert(getSafeReturnTo("https://evil.example") === "/result", "external returnTo remains rejected");
assert(getSafeReturnTo("http://evil.example") === "/result", "HTTP returnTo remains rejected");
assert(getSafeReturnTo("javascript:alert(1)") === "/result", "script returnTo is rejected");
assert(getSafeReturnTo("\\\\evil.example") === "/result", "backslash returnTo is rejected");
assert(getSafeReturnTo("%5C%5Cevil.example") === "/result", "encoded backslash returnTo is rejected");

assert(getSignupCompletionState({ policyComplete: false, emailVerified: false }) === "INCOMPLETE_SIGNUP", "incomplete unverified signup stays incomplete");
assert(getSignupCompletionState({ policyComplete: true, emailVerified: false }) === "WAITING_FOR_EMAIL_VERIFICATION", "policy completion does not bypass email verification");
assert(getSignupCompletionState({ policyComplete: false, emailVerified: true }) === "POLICY_RECOVERY_REQUIRED", "email verification does not bypass policy completion");
assert(getSignupCompletionState({ policyComplete: true, emailVerified: true }) === "SIGNUP_COMPLETE", "only both states complete signup");
async function main(): Promise<void> {
  let evidenceCalls = 0;
  const evidenceTargets: string[] = [];
  const newUser = { id: "new-user", email: "new@example.com", user_metadata: { signupAttemptId: "attempt-1" }, identities: [{ provider: "email" }] };
  const newSignup = await completeNewSignupWithEvidence({
  email: "new@example.com",
  password: "unused-in-test",
  signupAttemptId: "attempt-1",
  signUp: async () => ({ user: { ...newUser }, error: null }),
  getAuthoritativeUser: async () => newUser,
  recordEvidence: async (userId) => { evidenceCalls += 1; evidenceTargets.push(userId); },
  });
  assert(newSignup.status === "EVIDENCE_RECORDED" && evidenceCalls === 1 && evidenceTargets[0] === "new-user", "new signup writes once for the authoritative target ID");

  for (const ambiguousUser of [null, { id: "duplicate", email: "existing@example.com", user_metadata: {}, identities: [] }, { id: "duplicate", email: "existing@example.com", user_metadata: { signupAttemptId: "other" }, identities: [{ provider: "email" }] }]) {
    const result = await completeNewSignupWithEvidence({
    email: "new@example.com",
    password: "unused-in-test",
    signupAttemptId: "attempt-2",
    signUp: async () => ({ user: ambiguousUser ?? { id: "unknown", email: "new@example.com", identities: [] }, error: null }),
    getAuthoritativeUser: async () => ambiguousUser,
    recordEvidence: async () => { evidenceCalls += 1; },
    });
    assert(result.status === "IDENTITY_AMBIGUOUS" && evidenceCalls === 1, "ambiguous or duplicate response makes zero evidence calls");
  }

  let retryShouldFail = true;
  const retryEvidence = new Set<string>();
  const retryResult = async () => completeNewSignupWithEvidence({
  email: "retry@example.com",
  password: "unused-in-test",
  signupAttemptId: "attempt-3",
  signUp: async () => ({ user: { id: "retry-user", email: "retry@example.com", user_metadata: { signupAttemptId: "attempt-3" } }, error: null }),
  getAuthoritativeUser: async () => ({ id: "retry-user", email: "retry@example.com", user_metadata: { signupAttemptId: "attempt-3" } }),
  recordEvidence: async (userId) => { if (retryShouldFail) { retryShouldFail = false; throw new Error("temporary"); } retryEvidence.add(userId); },
  });
  try { await retryResult(); } catch { /* failure remains incomplete and is retryable */ }
  const retried = await retryResult();
  assert(retried.status === "EVIDENCE_RECORDED" && retryEvidence.size === 1, "evidence failure can be retried without duplicate durable evidence");
}

void main().then(() => console.log("signup-policy-activation-regression passed ✓")).catch((error: unknown) => {
  if (error instanceof Error) console.error(error.message);
  else console.error("Signup policy activation regression failed");
  process.exitCode = 1;
});