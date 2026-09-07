import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getSafeReturnTo } from "../app/lib/auth";

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
  login.includes('backHref = isGuestResultOrigin || isGuestResultNavigationOrigin ? "/guest-result" : isGuestNavigationOrigin ? "/guest-saju" : getSafeReturnTo(returnTo, "/")'),
  "login back link uses getSafeReturnTo(returnTo, \"/\") instead of hardcoded /result",
);
assert(
  signup.includes('backHref = origin === "guest-result" || origin === "guest-result-navigation" ? "/guest-result" : origin === "guest-navigation" ? "/guest-saju" : getSafeReturnTo(returnTo, "/")'),
  "signup back link uses getSafeReturnTo(returnTo, \"/\") instead of hardcoded /result",
);
assert(!login.includes('backHref = ') || !login.match(/backHref = [^;]*"\/result"/), "login back link no longer hardcodes /result");
assert(!signup.match(/backHref = [^;]*"\/result"/), "signup back link no longer hardcodes /result");

// Post-login/signup redirect fallback (unrelated to the back link) remains unchanged.
assert(login.includes("getSafeReturnTo(returnTo)"), "login post-login redirect still defaults through getSafeReturnTo's own /result fallback");
assert(signup.includes('getSafeReturnTo(returnTo, "/saju")'), "signup post-signup redirect fallback (/saju) is unchanged");

console.log("auth-back-link-fallback-regression passed ✓");
