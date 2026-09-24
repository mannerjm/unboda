import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hasCanonicalAnalysisInputChanged } from "../app/lib/analysisInputIdentity";
import { mergeProfileInput, type ProfileInput } from "../app/lib/profiles/types";

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
assert(mypage.includes("birthTimeKnown: profile.birthTimeKnown ?? null"), "legacy unverified birth-time status must remain null on form open");
assert(!mypage.includes("birthTimeKnown: profile.birthTimeKnown ?? true"), "opening an old profile must not silently confirm its time");
assert(mypage.includes("birthTimeKnown: formInput.birthTimeKnown == null ? true : formInput.birthTimeKnown"), "editing the time explicitly confirms it without changing certainty on unrelated edits");
assert(mypage.includes('birthTime: event.target.checked ? "12:00" : ""'));
assert(!mypage.includes("기존 프로필의 출생 시간 확인 여부가 저장되지 않았습니다."), "the confusing legacy profile note must not be visible");
assert(!mypage.includes("시주는 시간 미상으로 표시하며 시각을 이용한 세부 분석은 제외합니다."), "no extra explanation below the birth-time checkbox");
assert(profileTypes.includes('"birthTimeKnown"') && profileServer.includes("birth_time_known: input.birthTimeKnown ?? null"), "time certainty must still be stored and validated");

const legacyProfile: ProfileInput = {
  label: "기존 인원", relationshipType: "self", birthDate: "1990-05-15",
  birthTime: "12:00", birthTimeKnown: null, gender: "여성",
  calendarType: "양력", isLeapMonth: false,
};
const labelOnlyEdit: ProfileInput = { ...legacyProfile, label: "변경한 이름", birthTimeKnown: legacyProfile.birthTimeKnown ?? null };
assert(!hasCanonicalAnalysisInputChanged(legacyProfile, labelOnlyEdit), "name-only edit of legacy profile must not invalidate prior analysis");
const savedLabelOnlyEdit = mergeProfileInput(legacyProfile, labelOnlyEdit);
assert(savedLabelOnlyEdit.valid && savedLabelOnlyEdit.value.birthTimeKnown === null, "server-side profile merge must persist unverified status unchanged");
assert(hasCanonicalAnalysisInputChanged(legacyProfile, { ...labelOnlyEdit, birthTimeKnown: true }), "explicit time confirmation must trigger birth-data change detection");
assert(hasCanonicalAnalysisInputChanged(legacyProfile, { ...labelOnlyEdit, birthTimeKnown: false }), "explicit unknown-time selection must trigger birth-data change detection");
assert(hasCanonicalAnalysisInputChanged(legacyProfile, { ...labelOnlyEdit, birthTime: "09:30", birthTimeKnown: true }), "entering a new time must trigger birth-data change detection");

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
