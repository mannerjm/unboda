import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAuthBackHref, getSafeReturnTo } from "../app/lib/auth";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`✓ ${message}`);
}

const login = read("app/auth/login/page.tsx");
const signup = read("app/auth/signup/page.tsx");

// Case A/B: home -> auth (returnTo=/, no origin) -> back link must go home, not /result.
assert(getSafeReturnTo("/", "/") === "/", "login back link from returnTo=/ resolves to /");
assert(getSafeReturnTo("/", "/") === "/", "signup back link from returnTo=/ resolves to /");

// Case: invalid/external returnTo must fall back to / (not /result) for the back link.
assert(getSafeReturnTo("https://evil.example", "/") === "/", "invalid/external returnTo back link falls back to /");
assert(getSafeReturnTo("//evil.example", "/") === "/", "protocol-relative returnTo back link falls back to /");
assert(getSafeReturnTo("javascript:alert(1)", "/") === "/", "javascript: returnTo back link falls back to /");
assert(getSafeReturnTo(undefined, "/") === "/", "missing returnTo back link falls back to /");

// Case C: safe internal returnTo is preserved for the back link.
assert(getSafeReturnTo("/mypage", "/") === "/mypage", "safe internal returnTo is preserved for back link");
assert(getSafeReturnTo("/recommendations", "/") === "/recommendations", "safe internal returnTo (/recommendations) is preserved for back link");

// The back link must no longer hardcode /result as its non-guest fallback.
assert(
  login.includes('backHref = getAuthBackHref(returnTo, origin)'),
  "login back link uses getSafeReturnTo(returnTo, \"/\") instead of hardcoded /result",
);
assert(
  signup.includes('backHref = getAuthBackHref(returnTo, origin)'),
  "signup back link uses getSafeReturnTo(returnTo, \"/\") instead of hardcoded /result",
);
assert(!login.includes('backHref = ') || !login.match(/backHref = [^;]*"\/result"/), "login back link no longer hardcodes /result");
assert(!signup.match(/backHref = [^;]*"\/result"/), "signup back link no longer hardcodes /result");

// Public fallback routes must not redirect the unauthenticated visitor back to login.
const compatibility = "/special-analysis/compatibility";
for (const path of ["romantic", "family", "family/parent-child", "family/siblings", "family/other", "family/other-family", "workplace", "friend", "business"]) {
  const target = compatibility + "/" + path;
  for (const variant of [target, target + "/", target + "?profileId=test#family-relationship-selector", encodeURIComponent(target)]) {
    assert(getAuthBackHref(variant) === compatibility, "guest back from " + variant + " returns to public compatibility catalog");
  }
  assert(getSafeReturnTo(target) === target, "post-login compatibility destination remains intact: " + target);
}
assert(getAuthBackHref(compatibility) === compatibility, "public catalog stays public");
assert(getAuthBackHref("/ai-consulting") === "/", "home AI consultation back returns to home");
assert(getAuthBackHref("/ai-consulting?productId=career&edition=2026") === "/", "consulting query does not recreate the login loop");
assert(getAuthBackHref("/ai-consulting/room") === "/", "nested consulting back returns home");
assert(getAuthBackHref("/ai-consulting", "guest-result-navigation") === "/guest-result", "existing guest result origin is preserved");
assert(getAuthBackHref("/interests", "guest-navigation") === "/guest-saju", "existing guest entry origin is preserved");
assert(getAuthBackHref("/auth/complete-guest-analysis", "guest-result") === "/guest-result", "guest purchase transfer back remains intact");
assert(getAuthBackHref(undefined) === "/" && getAuthBackHref("//evil.example") === "/" && getAuthBackHref("https://evil.example") === "/" && getAuthBackHref("%2F%2Fevil.example") === "/", "unsafe or absent return URLs cannot escape public home");
assert(getSafeReturnTo("/ai-consulting?productId=career&edition=2026") === "/ai-consulting?productId=career&edition=2026", "post-login AI destination retains query parameters");
assert(login.includes("href={backHref}") && signup.includes("href={backHref}"), "both auth screens use tested back link");

 // Post-login/signup redirect fallback (unrelated to the back link) remains unchanged.
assert(login.includes("getSafeReturnTo(returnTo)"), "login post-login redirect still defaults through getSafeReturnTo's own /result fallback");
assert(signup.includes('getSafeReturnTo(returnTo, "/saju")'), "signup post-signup redirect fallback (/saju) is unchanged");

console.log("auth-back-link-fallback-regression passed ✓");
