import { readFileSync } from "fs";
import { join } from "path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const source = readFileSync(join(process.cwd(), "app/mypage/page.tsx"), "utf-8");

assert(source.includes("사주 분석 대상"), "mypage must use the user-facing analysis target title");
assert(source.includes("여기서 선택한 사람을 기준으로 무료 사주와 유료 심층분석이 진행됩니다."), "mypage must use the updated guidance copy");
assert(source.includes("formatProfileBirthDate(profile.birthDate)"), "mypage must render the stored profile birth date");
assert(!source.includes("{profile.relationshipType}"), "mypage must not render internal relationship type values");
assert(source.includes("현재 선택") && source.includes("profile.id === activeProfileId"), "only the active Profile must render the selected badge");
assert(source.includes('method: "PUT"') && source.includes('body: JSON.stringify({ profileId })'), "profile click must preserve the active profile API update contract");
assert(source.includes('fetch("/api/profiles/active")'), "mypage reload must preserve active profile state from the server");
assert(!source.includes("← 사주 조회"), "mypage must not show a top-level saju navigation link");
assert(source.includes("선택한 프로필로 사주 조회하기"), "mypage must show the selected-profile saju CTA");
assert(source.includes('disabled={!activeProfileId}'), "mypage CTA must stay disabled until an active Profile exists");
assert(source.includes('router.push("/saju")'), "mypage CTA must navigate to saju without changing the Profile selection");
assert(source.includes("!profilesResponse.ok || !activeResponse.ok"), "failed profile API responses must not be rendered as an empty list");
assert(source.includes("로그인 상태를 확인한 뒤 다시 시도해 주세요."), "mypage must surface an authentication failure");
console.log("mypage-profile-ui-regression passed ✓");
