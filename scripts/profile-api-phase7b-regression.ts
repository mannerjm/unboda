import { readFileSync } from "fs";
import { join } from "path";
import {
  fromProfileDbCalendarType,
  fromProfileDbGender,
  MAX_PROFILES_PER_USER,
  mergeProfileInput,
  type ProfileDto,
  toProfileDbCalendarType,
  toProfileDbGender,
  validateProfileInput,
} from "../app/lib/profiles/types";
import { sortUserProfiles } from "../app/lib/profiles/server";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

const selfProfile = {
  label: "본인",
  relationshipType: "self" as const,
  birthDate: "1990-01-02",
  birthTime: "09:30",
  gender: "남성" as const,
  calendarType: "양력" as const,
  isLeapMonth: false,
};

const validatedSelf = validateProfileInput(selfProfile);
assert(validatedSelf.valid, "valid self profile must pass validation");
console.log("1. valid profile input accepted ✓");

assert(toProfileDbGender("남성") === "male", "남성 must map to male");
assert(toProfileDbGender("여성") === "female", "여성 must map to female");
assert(fromProfileDbGender("male") === "남성", "male must map to 남성");
assert(fromProfileDbGender("female") === "여성", "female must map to 여성");
console.log("2. gender mappings are bidirectional ✓");

assert(toProfileDbCalendarType("양력") === "solar", "양력 must map to solar");
assert(toProfileDbCalendarType("음력") === "lunar", "음력 must map to lunar");
assert(fromProfileDbCalendarType("solar") === "양력", "solar must map to 양력");
assert(fromProfileDbCalendarType("lunar") === "음력", "lunar must map to 음력");
console.log("3. calendar mappings are bidirectional ✓");

for (const invalid of [
  { ...selfProfile, label: "   " },
  { ...selfProfile, relationshipType: "owner" },
  { ...selfProfile, birthDate: "1990-02-30" },
  { ...selfProfile, birthTime: "24:00" },
  { ...selfProfile, gender: "male" },
  { ...selfProfile, calendarType: "solar" },
  { ...selfProfile, isLeapMonth: "윤달" },
  { ...selfProfile, isLeapMonth: true },
]) {
  assert(!validateProfileInput(invalid).valid, `invalid input must be rejected: ${JSON.stringify(invalid)}`);
}
console.log("4. invalid profile input and solar leap month rejected ✓");

if (!validatedSelf.valid) {
  throw new Error("FAIL: validated profile required for patch test");
}

const patched = mergeProfileInput(validatedSelf.value, { label: "나", gender: "여성" });
assert(patched.valid && patched.value.label === "나" && patched.value.gender === "여성", "PATCH must merge and validate partial profile input");
assert(!mergeProfileInput(validatedSelf.value, { userId: "spoofed" }).valid, "PATCH must reject userId spoofing");
assert(!mergeProfileInput(validatedSelf.value, { id: "spoofed" }).valid, "PATCH must reject profile id spoofing");
console.log("5. partial PATCH validates and blocks identity fields ✓");

const unorderedProfiles: ProfileDto[] = [
  {
    id: "spouse",
    label: "배우자",
    relationshipType: "spouse",
    birthDate: "1991-01-02",
    birthTime: "09:30",
    gender: "여성",
    calendarType: "양력",
    isLeapMonth: false,
    createdAt: "2026-01-03T00:00:00.000Z",
    updatedAt: "2026-01-03T00:00:00.000Z",
  },
  {
    id: "self",
    label: "본인",
    relationshipType: "self",
    birthDate: "1990-01-02",
    birthTime: "09:30",
    gender: "남성",
    calendarType: "양력",
    isLeapMonth: false,
    createdAt: "2026-01-04T00:00:00.000Z",
    updatedAt: "2026-01-04T00:00:00.000Z",
  },
  {
    id: "child",
    label: "자녀",
    relationshipType: "child",
    birthDate: "2020-01-02",
    birthTime: "09:30",
    gender: "여성",
    calendarType: "양력",
    isLeapMonth: false,
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
];

const sortedProfiles = sortUserProfiles(unorderedProfiles);
assert(sortedProfiles[0]?.id === "self", "self profile must be listed first");
assert(
  sortedProfiles.slice(1).map((profile) => profile.id).join(",") === "child,spouse",
  "non-self profiles must remain ordered by createdAt",
);
assert(unorderedProfiles[0]?.id === "spouse", "profile sort must not mutate the source list");
console.log("6. self profile sorts first; non-self profiles are stable by createdAt ✓");

const listRoute = read("app/api/profiles/route.ts");
const itemRoute = read("app/api/profiles/[profileId]/route.ts");
const server = read("app/lib/profiles/server.ts");

for (const source of [listRoute, itemRoute]) {
  assert(source.includes("getCurrentUser"), "every profile route must use getCurrentUser");
  assert(source.includes("status: 401"), "every profile route must reject unauthenticated users");
}
assert(listRoute.includes("validateProfileInput") && !listRoute.includes("body.userId"), "POST must validate body without trusting userId");
assert(itemRoute.includes("getUserProfile(profileId, user.id)"), "PATCH must check profile ownership before update");
assert(itemRoute.includes("deleteUserProfile(profileId, user.id)"), "DELETE must scope deletion by owner");
assert(server.includes('.eq("id", profileId)') && server.includes('.eq("user_id", userId)'), "server ownership queries must scope id and user_id together");
assert(server.includes("프로필을 조회하지 못했습니다"), "profile query errors must not be collapsed into ownership misses");
assert(itemRoute.includes("ownership lookup failed") && itemRoute.includes("status: 500"), "PATCH must report ownership lookup errors as 500 instead of 404");
assert(!server.includes(".update(toProfileInsert"), "UPDATE must not include user_id in its payload");
assert(server.includes("createAdminClient"), "profile writes must use the server-only admin client");
assert(server.includes("profiles_one_self_per_user_idx"), "self-profile conflict must be detected from the DB constraint");
assert(MAX_PROFILES_PER_USER === 10, "profile cap must be centralized at 10");
assert(server.includes('select("id", { count: "exact", head: true })'), "server creation must count existing user profiles");
assert(server.includes("ProfileLimitError") && server.includes("MAX_PROFILES_PER_USER"), "server creation must reject requests at the profile cap");
assert(listRoute.includes("error instanceof ProfileLimitError") && listRoute.includes("status: 409"), "POST must return 409 when the profile cap is reached");
console.log("7. API auth, ownership, spoofing, admin-write, self-conflict, and profile-cap contracts present ✓");

const migration = read("supabase/migrations/002_profiles.sql");
assert(/for select\s+to authenticated\s+using \(auth\.uid\(\) = user_id\)/.test(migration), "profiles migration must grant only self-scoped SELECT");
assert(migration.includes("revoke insert, update, delete on public.profiles from anon, authenticated"), "profiles migration must revoke browser writes");
console.log("8. profiles RLS migration contract present ✓");

console.log("\nprofile-api-phase7b-regression passed ✓");
