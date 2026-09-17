import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/page.tsx", "utf8");
const home = readFileSync("app/components/HomeExperience.tsx", "utf8");

for (const required of [
  "getCurrentUser",
  "listUserProfiles",
  "getActiveProfile",
  "listUserFreeAnalysisResults",
  "resolveProfileFreeAnalysisStatus",
  "createEvaluationContext",
]) {
  assert(page.includes(required), `home renewal must preserve landing-state dependency: ${required}`);
}

for (const state of [
  'kind: "guest"',
  'kind: "no_profiles"',
  'kind: "needs_profile_selection"',
  'kind: "analysis_ready"',
  'kind: "analysis_in_progress"',
  'kind: "analysis_stale"',
  'kind: "analysis_complete"',
]) {
  assert(page.includes(state), `home renewal must preserve landing state ${state}`);
}

assert(page.includes('primaryHref: "/guest-saju"'), "guest primary entry must remain the free guest analysis");
assert(page.includes('primaryHref: "/saju"'), "member free-analysis entry must remain available");
assert(page.includes('primaryHref: `/result?profileId=${state.profileId}`'), "completed analysis must still continue to the exact profile result");
assert(page.includes('secondaryHref: `/recommendations?profileId=${state.profileId}`'), "completed analysis must still expose profile-scoped recommendations");

for (const route of [
  'href="/deep-analysis"',
  'href="/special-analysis/compatibility"',
  'href="/purchased-analyses"',
]) {
  assert(home.includes(route), `renewed home must expose direct route ${route}`);
}

for (const copy of [
  "원하는 분석 바로 찾기",
  "요즘, 어떤 게 가장 궁금하세요?",
  "혼자 보는 사주와",
  "분석을 읽고도",
  "쉽게 들어오고, 필요한 만큼 깊게.",
  "지금 마음에 걸리는 것",
  "두 사람의 흐름",
  "리포트 다음 질문",
  "운보다 이용 흐름",
  "지금 · 관계 · 선택을 한 흐름으로",
]) {
  assert(home.includes(copy), `renewed home must include customer-facing phase 1 section: ${copy}`);
}

for (const legacyEnglishEyebrow of [
  "FIND YOUR QUESTION",
  "TWO PEOPLE, ONE RELATIONSHIP",
  "AI CONSULTING",
  "HOW UNBODA WORKS",
]) {
  assert(!home.includes(legacyEnglishEyebrow), `home must avoid template-like English eyebrow: ${legacyEnglishEyebrow}`);
}

assert(home.includes("motion-safe:animate-[spin_28s_linear_infinite]"), "home brand flow graphic must include restrained motion with reduced-motion safety");
assert(home.includes("bg-[linear-gradient(180deg,#070d20_0%,#0b1330_45%,#0a1026_100%)]"), "Modern Mystic home must keep the deep navy brand canvas");
assert(home.includes("radial-gradient(circle_at_12%_18%"), "Modern Mystic home must keep the lightweight star field without heavy media assets");
assert(home.includes("bg-[linear-gradient(135deg,#795cff,#9d78ff)]"), "primary action must retain the Modern Mystic violet emphasis");
assert(home.includes("backdrop-blur-xl"), "Modern Mystic cards must retain the glass surface language");
assert(home.includes("무료 분석") && home.includes("심층 분석") && home.includes("두 사람 궁합"), "home must keep the free-first path while exposing direct exploration");
assert(home.includes("운보다 · 참고용 명리 분석 서비스"), "legal footer identity must remain on the renewed home");
assert(home.includes("사업자등록번호 201-28-96364"), "business registration footer must remain on the renewed home");
assert(home.includes("support@unboda.kr"), "support contact must remain on the renewed home");

for (const forbidden of ["requestPayment", "markOrderPaid", "grantEntitlement", "generatePaidReport"] ) {
  assert(!home.includes(forbidden), `home visual renewal must not embed commercial runtime logic: ${forbidden}`);
}

console.log("Home Modern Mystic renewal regression passed ✓");
