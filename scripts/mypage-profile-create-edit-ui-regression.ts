import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const source = read("app/mypage/page.tsx");

assert(source.includes("인원 추가"), "mypage must expose an add-person entry point");
assert(source.includes("수정"), "mypage must expose an edit button on each profile card");
assert(source.includes("/api/profiles/${editingProfileId}") && source.includes('"/api/profiles"'), "form submit must call POST /api/profiles for create and PATCH /api/profiles/{id} for edit");
assert(source.includes('method: editingProfileId ? "PATCH" : "POST"'), "form submit must switch HTTP method based on edit mode");
assert(source.includes('fetch("/api/mypage/summary")'), "creating or editing a profile must re-fetch the free analysis summary");
assert(source.includes("reloadMypageData"), "create/edit success must trigger a shared profiles+active+summary reload");

assert(source.includes('onClick={() => void activate(profile.id)}'), "existing profile activation must remain unchanged");
assert(source.includes('fetch("/api/profiles/active"') && source.includes('method: "PUT"'), "existing active-profile PUT contract must remain unchanged");
assert(!source.includes("router.push(`/result?profileId=${profile.id}`)"), "the per-card free analysis result button must stay removed");
assert(source.includes("router.push(`/result?profileId=${activeProfileId}`)"), "the bottom CTA must remain the sole navigation to the completed free analysis result");
assert(source.includes('router.push("/saju")'), "existing saju navigation fallback must remain unchanged");
assert(source.includes("로그아웃") && source.includes("signOut()"), "existing sign-out must remain unchanged");

assert(!source.includes("{profile.relationshipType}"), "mypage must not render the raw English relationshipType value");
assert(source.includes("relationshipLabels") && source.includes("relationshipOptions"), "mypage must map relationshipType to Korean labels for both display and the form");

console.log("mypage-profile-create-edit-ui-regression passed ✓");
