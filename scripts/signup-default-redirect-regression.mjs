import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const signup = await readFile("app/auth/signup/page.tsx", "utf8");
const auth = await readFile("app/lib/auth.ts", "utf8");
const callback = await readFile("app/auth/callback/route.ts", "utf8");
const result = await readFile("app/result/page.tsx", "utf8");

assert.match(signup, /getSafeReturnTo\(returnTo, "\/saju"\)/, "signup uses /saju fallback");
assert.match(signup, /router\.push\(safeReturnTo\)/, "successful signup uses safe return target");
assert.match(signup, /returnTo: safeReturnTo/, "signup API receives the safe return target");
assert.match(signup, /origin === "guest-result"|origin === "guest-navigation"|origin === "guest-result-navigation"/, "Guest-origin context remains supported");
assert.doesNotMatch(signup, /getSafeReturnTo\(returnTo\)\s*;/, "signup does not use the shared /result default");

assert.match(auth, /fallback = "\/result"/, "shared helper fallback remains unchanged for login");
assert.match(callback, /getSafeReturnTo\(returnTo, "\/result"\)/, "auth callback fallback remains unchanged");
assert.match(result, /searchParams\.get\("profileId"\)/, "result requires profile context from the query or result context");
assert.match(result, /분석할 프로필을 찾을 수 없습니다\./, "profile-less result state remains explicit");

console.log("signup default redirect regression: PASS");
