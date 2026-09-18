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
assert(home.includes('"/ai-consulting"') && home.includes("AI 상담 바로 이어가기"), "member home must expose a direct unified AI consulting entry instead of routing through the purchased library");
assert(home.includes("이전 상담 기록") && home.includes("직접 저장한 기억"), "home must explain continuity through prior consultation and explicit saved memory");
assert(home.indexOf("<AiConsultingSection state={state}/>") < home.indexOf("<CuriositySection/>"), "AI consulting differentiation must appear before lower discovery sections");

for (const copy of [
  "원하는 분석 바로 찾기",
  "요즘, 어떤 게 가장 궁금하세요?",
  "혼자 보는 사주와",
  "리포트가 끝이 아니라",
  "쉽게 들어오고, 필요한 만큼 깊게.",
  "지금 마음에 걸리는 것",
  "두 사람의 흐름",
  "리포트 다음 질문",
  "운보다 이용 흐름",
  "흐름 · 관계 · 선택을 한 장면으로",
  "서로 다른 두 흐름이 만나는 지점",
  "지금 내 흐름에서 시작해볼까요?",
]) {
  assert(home.includes(copy), `renewed home must include customer-facing Modern Mystic section: ${copy}`);
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
assert(home.includes("lg:max-w-[28.5rem] lg:opacity-[0.86]"), "hero artwork must stay visually subordinate to the primary copy on large screens");
assert(!home.includes("['선택','bottom-[14%]"), "hero must avoid three competing floating labels after visual simplification");
assert(home.includes("bg-[linear-gradient(180deg,#070d20_0%,#0b1330_40%,#090f24_100%)]"), "Modern Mystic home must keep the deep navy brand canvas");
assert(home.includes("radial-gradient(circle_at_12%_18%"), "Modern Mystic home must keep the lightweight star field without heavy media assets");
assert(home.includes("opacity-[0.68]"), "star field must remain restrained enough for long-page readability");
assert(home.includes("bg-[linear-gradient(135deg,#795cff,#9d78ff)]"), "primary action must retain the Modern Mystic violet emphasis");
assert(home.includes("backdrop-blur-xl"), "Modern Mystic cards must retain the glass surface language");
assert(home.includes("function CardScene"), "curiosity cards must include category-specific atmospheric scenes");
for (const sceneCue of ["peopleFlow", "F3C779", "7FE0C7", "9bb4ff66"]) {
  assert(home.includes(sceneCue), `curiosity scenes must keep distinct semantic visual cue: ${sceneCue}`);
}
assert(home.includes("function CompatibilityVisual"), "compatibility section must use the dedicated two-flow visual rather than generic rings");
assert(home.includes("bg-[linear-gradient(135deg,#1b1d3b_0%,#25172f_45%,#171d3b_100%)]"), "compatibility section must introduce a warmer violet-rose temperature shift");
assert(home.includes("bg-[linear-gradient(135deg,#10182f_0%,#171631_48%,#10203a_100%)]"), "AI consulting section must retain a distinct cooler blue-violet temperature");
assert(home.includes("bg-[linear-gradient(90deg,transparent,#8f7cff55,#ff9db555,#8f7cff55,transparent)]"), "journey section must render as a connected flow rather than a plain table");
assert(home.includes("<TrustSection copy={copy}/>"), "closing journey CTA must preserve the current landing-state primary destination");
assert(home.includes("무료 분석") && home.includes("심층 분석") && home.includes("두 사람 궁합"), "home must keep the free-first path while exposing direct exploration");
assert(home.includes("운보다 · 참고용 명리 분석 서비스"), "legal footer identity must remain on the renewed home");
assert(home.includes("사업자등록번호 201-28-96364"), "business registration footer must remain on the renewed home");
assert(home.includes("support@unboda.kr"), "support contact must remain on the renewed home");

for (const forbidden of ["requestPayment", "markOrderPaid", "grantEntitlement", "generatePaidReport"] ) {
  assert(!home.includes(forbidden), `home visual renewal must not embed commercial runtime logic: ${forbidden}`);
}

console.log("Home Modern Mystic final balance regression passed ✓");
