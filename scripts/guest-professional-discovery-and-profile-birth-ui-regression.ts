import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const mypage = read("app/mypage/page.tsx");
const shell = read("app/components/AppShell.tsx");
const special = read("app/special-analysis/page.tsx");
const compatibility = read("app/special-analysis/compatibility/page.tsx");
const pair = read("app/special-analysis/compatibility/PairCompatibilityPage.tsx");
const profileTypes = read("app/lib/profiles/types.ts");
const profileServer = read("app/lib/profiles/server.ts");

// My Page: only the two user-facing controls remain. Remove explanatory notes
// below the checkbox without changing birth-time certainty or its persistence.
assert(mypage.includes('id="profile-birth-time"') && mypage.includes('출생 시간 모름'));
assert(mypage.includes("birthTimeKnown: profile.birthTimeKnown ?? true"));
assert(mypage.includes('birthTime: event.target.checked ? "12:00" : ""'));
assert(!mypage.includes("기존 프로필의 출생 시간 확인 여부가 저장되지 않았습니다."), "the confusing legacy profile note must not be visible");
assert(!mypage.includes("시주는 시간 미상으로 표시하며 시각을 이용한 세부 분석은 제외합니다."), "no extra explanation below the birth-time checkbox");
assert(profileTypes.includes('"birthTimeKnown"') && profileServer.includes("birth_time_known: input.birthTimeKnown ?? null"), "time certainty must still be stored and validated");

// Both guest desktop and mobile navigation open PUBLIC professional browsing.
assert(shell.includes('if (item.href === "/special-analysis") return "/special-analysis";'), "guest professional entry must not redirect to login");
const lockRule = 'item.activeHref !== "/deep-analysis" && item.activeHref !== "/special-analysis" ? <LockIcon /> : null';
assert.equal(shell.split(lockRule).length - 1, 2, "desktop and mobile must not show a lock on public professional browsing");
assert(shell.includes('return `/auth/login?returnTo=${encodeURIComponent(item.href)}&origin=${guestOrigin}`;'), "other guest-only entries must retain their login boundary");
assert(special.includes('const user = await getCurrentUser();') && !special.includes('redirect("/auth/login'), "public catalog must not force login");
assert(special.includes('href="/special-analysis/compatibility"'), "professional page must expose the compatibility product overview");
assert(compatibility.includes("로그인 없이 둘러보기 가능") && compatibility.includes("/special-analysis/compatibility/romantic"), "guests can see professional categories and products");
assert(pair.includes('redirect(`/auth/login?returnTo=${entryPath}`)'), "actual pair analysis requires login");
console.log("guest-professional-discovery-and-profile-birth-ui-regression: PASS");
