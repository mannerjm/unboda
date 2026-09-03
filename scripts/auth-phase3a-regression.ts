/**
 * Phase 3A Auth regression:
 * Verifies that the Supabase auth foundation is correctly wired.
 * Tests contracts only — no browser/network required.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { getSafeReturnTo } from "../app/lib/auth";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

// --- 1. Legacy localStorage auth functions are neutralized ---
const authTs = readFileSync(join(process.cwd(), "app/lib/auth.ts"), "utf-8");

assert(
  !authTs.includes(`AUTH_STORAGE_KEY`),
  "auth.ts must not define AUTH_STORAGE_KEY (localStorage auth removed)",
);
assert(
  !authTs.includes(`window.localStorage.setItem`) || authTs.includes("@deprecated"),
  "auth.ts localStorage write must be removed or deprecated",
);
assert(
  authTs.includes("saveAuthState") && authTs.includes("no-op"),
  "saveAuthState must be a no-op stub",
);
assert(
  authTs.includes("loadAuthState") && authTs.includes("guestAuthState"),
  "loadAuthState must return guestAuthState (no localStorage read)",
);
console.log("1. Legacy localStorage auth neutralized ✓");

// --- 2. demo-user hardcode is removed from login page ---
const loginTs = readFileSync(join(process.cwd(), "app/auth/login/page.tsx"), "utf-8");

assert(
  !loginTs.includes("demo-user"),
  "login page must not contain hardcoded demo-user",
);
assert(
  !loginTs.includes("demo@unboda.com"),
  "login page must not contain hardcoded demo email",
);
assert(
  loginTs.includes("signInWithPassword"),
  "login page must use supabase.auth.signInWithPassword",
);
console.log("2. Demo-user removed from login; Supabase signInWithPassword used ✓");

// --- 3. Signup page uses the server-owned signup boundary ---
const signupTs = readFileSync(join(process.cwd(), "app/auth/signup/page.tsx"), "utf-8");
assert(
  signupTs.includes("/api/auth/signup") && !signupTs.includes("createClient"),
  "signup page must use the server-owned signup boundary",
);
assert(
  signupTs.includes("termsAccepted") && signupTs.includes("age14OrOlderConfirmed"),
  "signup must submit both required policy choices",
);
console.log("3. Signup uses server-owned policy activation boundary ✓");

// --- 4. Auth callback route exists ---
const callbackTs = readFileSync(join(process.cwd(), "app/auth/callback/route.ts"), "utf-8");
assert(
  callbackTs.includes("exchangeCodeForSession"),
  "callback route must call exchangeCodeForSession",
);
assert(
  callbackTs.includes("getSafeReturnTo"),
  "callback route must use getSafeReturnTo to prevent open redirects",
);
console.log("4. Auth callback route exists with code exchange + safe redirect ✓");

// --- 5. Middleware exists for session refresh ---
const middlewareTs = readFileSync(join(process.cwd(), "middleware.ts"), "utf-8");
assert(
  middlewareTs.includes("getClaims"),
  "middleware must call getClaims (not getSession) for session refresh",
);
assert(
  !middlewareTs.includes("getSession()"),
  "middleware must NOT call getSession() (deprecated pattern)",
);
assert(
  middlewareTs.includes("config") && middlewareTs.includes("matcher"),
  "middleware must export config.matcher",
);
console.log("5. Middleware uses getClaims (not getSession) ✓");

// --- 6. Server auth helper exists ---
const serverAuthTs = readFileSync(join(process.cwd(), "app/lib/supabase/auth.ts"), "utf-8");
assert(
  serverAuthTs.includes("getCurrentUser"),
  "server auth helper must export getCurrentUser()",
);
assert(
  serverAuthTs.includes("getUser"),
  "getCurrentUser must call supabase.auth.getUser()",
);
console.log("6. Server getCurrentUser() helper exists and uses getUser() ✓");

// --- 7. Access gate resolves identity from the Supabase server session ---
// (Phase 3B moved this panel from a browser-client component to a server component.)
const accessPanelTs = readFileSync(
  join(process.cwd(), "app/paid-analysis/[productId]/PaidAnalysisAccessPanel.tsx"),
  "utf-8",
);
assert(
  accessPanelTs.includes("getCurrentUser") && accessPanelTs.includes("supabase/auth"),
  "PaidAnalysisAccessPanel must resolve the user from the Supabase server session",
);
assert(
  !accessPanelTs.includes("loadAuthState"),
  "PaidAnalysisAccessPanel must not use loadAuthState",
);
console.log("7. PaidAnalysisAccessPanel uses Supabase server session ✓");

// --- 8. getSafeReturnTo validates redirect destination ---
assert(getSafeReturnTo("/checkout/foo") === "/checkout/foo", "relative paths allowed");
assert(getSafeReturnTo("https://evil.com") === "/result", "external URLs rejected");
assert(getSafeReturnTo(undefined) === "/result", "undefined uses fallback");
console.log("8. getSafeReturnTo rejects external URLs (open redirect prevention) ✓");

// --- 9. Supabase clients use publishable key env var (not anon key) ---
const clientTs = readFileSync(join(process.cwd(), "app/lib/supabase/client.ts"), "utf-8");
assert(
  clientTs.includes("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  "client.ts must use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (current Supabase naming)",
);
assert(
  !clientTs.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  "client.ts must NOT use deprecated ANON_KEY name",
);
console.log("9. Supabase clients use PUBLISHABLE_KEY (current naming) ✓");

// --- 10. No service role key in client code ---
assert(
  !clientTs.includes("SERVICE_ROLE"),
  "service role key must not appear in browser client",
);
console.log("10. Service role key absent from browser client ✓");

console.log("\nauth-phase3a-regression passed ✓");
