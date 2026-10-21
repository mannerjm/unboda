import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Guard a UI-only request deduplication: no auth/permission or billing changes.
const source = readFileSync("app/mypage/page.tsx", "utf8");
const shell = readFileSync("app/components/AppShell.tsx", "utf8");
const route = readFileSync("app/api/account/status/route.ts", "utf8");

assert.equal((source.match(/fetch\("\/api\/account\/status"\)/g) ?? []).length, 1,
  "mypage must request account/status only once on mount");
assert(source.includes('if (!response.ok) {\n          router.replace("/auth/login?returnTo=/mypage&origin=guest-navigation");'),
  "unauthenticated account must still be redirected to login");
assert(source.includes('setIsAuthChecked(true);'), "authenticated screen gate must remain");
assert(source.includes('void response.json()') && source.includes('setAccountStatus(status)'),
  "account verification response must still hydrate account badge");
assert(source.includes('.catch(() => {});'), "JSON parse errors must not turn verified user into guest");
assert(source.includes('void Promise.all([fetch("/api/profiles"), fetch("/api/profiles/active")])'),
  "profile loading remains unchanged");
assert(source.includes('fetch("/api/mypage/summary", { cache: "no-store" })'),
  "sensitive summary must remain no-store");
assert(shell.includes('void fetch("/api/account/status")'),
  "shared AppShell account boundary must remain unchanged");
assert(route.includes('getCurrentUser()'), "server account identity validation preserved");
assert(!source.includes('unstable_cache('), "no new shared cache for personal account info");

console.log("mypage single account-status request regression: PASS");
