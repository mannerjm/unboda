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
  "listUserPaidAnalysisSummaries",
  "createAdminClient",
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
assert(page.includes('primaryHref: `/recommendations?profileId=${state.profileId}`'), "free-only completed analysis must lead with profile-scoped recommendations");
assert(page.includes('secondaryHref: `/result?profileId=${state.profileId}`'), "completed analysis must preserve the exact profile result as a secondary action");
for (const stage of ["free_only", "paid_preparing", "paid_failed", "paid_ready", "consulting_active"]) {
  assert(page.includes(`"${stage}"`), `home must distinguish customer stage: ${stage}`);
}
assert(page.includes('"AI 상담 시작하기"') && page.includes('"상담 이어가기"'), "paid customers must get stage-aware AI hero actions");
assert(page.includes('"준비 상태 확인하기"') && page.includes('"구매한 분석 확인하기"'), "preparing/failed paid reports must not be pushed into AI chat");
assert(page.includes('.eq("role", "assistant")'), "consulting-active hero must require persisted assistant history, not guess from browser state");

for (const route of [
  "/deep-analysis",
  "/special-analysis/compatibility",
  "/purchased-analyses",
]) {
  assert(home.includes(route), `renewed home must expose direct route ${route}`);
}
assert(home.includes('"/ai-consulting"') && home.includes("AI 상담 바로 이어가기"), "member home must expose a direct unified AI consulting entry instead of routing through the purchased library");
assert(!home.includes('aria-label="주요 메뉴"'), "home header must not duplicate discovery categories already available in the main content");
assert(home.includes("AI 상담") && home.includes("마이페이지") && home.includes("로그인"), "simplified home header must preserve AI consulting and account actions");
assert(home.includes("이전 상담 기록") && home.includes("직접 저장한 기억"), "home must explain continuity through prior consultation and explicit saved memory");
assert(home.includes("function HomeJourney("), "compact layout uses the existing consulting differentiation");

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

// The new design must be a bright, compact home presentation, not a new state machine.
const renderedHome = home.slice(home.indexOf("function HomeShell("), home.indexOf("function NewHome("));
assert(renderedHome.includes('min-h-[100dvh]'), "home must use a viewport-height desktop-first shell");
assert(renderedHome.includes('bg-[linear-gradient(135deg,#fffdfd_0%,#f9f7ff_48%,#f0ecff_100%)]'), "home canvas must be light white-lavender");
for (const cue of [
  "<Header state={state}/>",
  "<HeroActions state={state} copy={copy}/>",
  "<FlowVisual/>",
  "<QuickRoutes state={state}/>",
  "<HomeJourney/>",
  "<Footer/>",
  "{copy.title}",
  "{copy.description}",
  "{returning.profileLabel}",
  "{statusLabel}",
  'href={copy.secondaryHref}',
]) assert(renderedHome.includes(cue), `unchanged state and route must remain in compact layout: ${cue}`);
for (const removedFromHomepage of [
  "<DailyVisitEntry",
  "<AiConsultingSection",
  "<CuriositySection",
  "<CompatibilitySection",
  "<TrustSection",
]) assert(!renderedHome.includes(removedFromHomepage), `long old section must not appear on compact homepage: ${removedFromHomepage}`);
assert(home.includes("function DailyVisitEntry("), "daily display component is left untouched; /today detail is still independent");
assert(home.includes("function HomeJourney("), "three-step service explanation remains visible");
assert(home.includes("리포트가 끝이 아니라, 상담이 이어집니다."), "core continuity explanation remains");
assert(home.includes("무료로 확인") && home.includes("필요한 분석만 깊게") && home.includes("AI 상담으로 계속"), "free to analysis to ongoing counseling must remain clear");
assert(home.includes("motion-safe:animate-[spin_28s_linear_infinite]"), "existing brand visual keeps reduced-motion-safe animation");
assert(home.includes("bg-[linear-gradient(135deg,#795cff,#9d78ff)]"), "primary action retains violet emphasis");
assert(home.includes("backdrop-blur-xl"), "compact cards keep a soft branded surface");
assert(home.includes("function CardScene"), "existing lower discovery presentation remains untouched internally, even when not rendered on compact home");
assert(home.includes("function CompatibilityVisual"), "existing compatibility visual remains untouched internally");
assert(home.includes('href="/special-analysis/compatibility"'), "compatibility destination remains usable");
assert(home.includes('href="/deep-analysis"'), "deep analysis destination remains usable");
assert(home.includes("<Link href={aiHref}") && home.includes("<Link href={accountHref}"), "AI chat and account routes unchanged");
assert(home.includes("운보다 · 참고용 명리 분석 서비스"), "existing legal footer kept");
assert(home.includes("사업자등록번호 201-28-96364"), "business footer retained");
assert(home.includes("support@unboda.kr"), "support contact retained");
assert(home.includes("support@unboda.kr"), "support contact must remain on the renewed home");

for (const forbidden of ["requestPayment", "markOrderPaid", "grantEntitlement", "generatePaidReport"] ) {
  assert(!home.includes(forbidden), `home visual renewal must not embed commercial runtime logic: ${forbidden}`);
}


const heroActions = home.slice(home.indexOf("function HeroActions("), home.indexOf("function DailyVisitEntry("));
const flowVisual = home.slice(home.indexOf("function FlowVisual("), home.indexOf("function HeroActions("));
const quickRoutes = home.slice(home.indexOf("function QuickRoutes("), home.indexOf("function CardScene("));
assert(heroActions.includes('href={copy.primaryHref}'), "primary action route must remain state-driven");
assert(heroActions.includes('{copy.primary}'), "primary action label must remain exactly state-driven");
assert(heroActions.includes('min-h-14 w-full min-w-[13rem]'), "existing main action should be larger and more visible");
assert(heroActions.includes('text-base font-black'), "existing main action typography must have improved hierarchy");
assert(heroActions.includes('href={copy.secondaryHref}'), "customer secondary action route must remain unchanged");
assert(flowVisual.includes('lg:max-w-[38rem]') && flowVisual.includes("home-premium-orbit.svg"), "homepage must use the approved premium luminous orbit illustration");
assert(renderedHome.includes('max-w-[35rem] md:block'), "right hero artwork must have the approved enlarged presentation");
assert(quickRoutes.includes('getPrimaryQuickRoute(state)'), "state-aware route selection preserved");
for (const text of ['"추천 분석"', '"심층 분석"', '"두 사람 궁합"']) {
  assert(quickRoutes.includes(text), `all original discovery routes must be present: ${text}`);
}
assert(quickRoutes.includes('home-route-art-') && quickRoutes.includes('bg-contain bg-center'), "four routes must use new original 3D-style illustrations");
assert(quickRoutes.includes('text-[16px] font-black'), "navigation title hierarchy must support premium artwork");
assert(quickRoutes.includes('leading-5 text-[#5f5175]'), "navigation details must remain legible on pale surfaces");
assert(!renderedHome.includes('<DailyVisitEntry'), "Today card must remain hidden from main, /today detail retained");

// Visible home artwork must be actual versioned assets, not a static mockup.
for (const filename of [
  "home-premium-orbit.svg",
  "home-lavender-waves.svg",
  "home-route-art-1.svg",
  "home-route-art-2.svg",
  "home-route-art-3.svg",
  "home-route-art-4.svg",
]) {
  const svg = readFileSync(`public/${filename}`, "utf8");
  assert(svg.startsWith("<svg") && svg.includes("</svg>"), `invalid versioned SVG asset: ${filename}`);
  assert(!svg.includes("<script") && !svg.includes("http://www.w3.org/1999/xhtml"), `unsafe SVG markup: ${filename}`);
}
assert(renderedHome.includes("home-lavender-waves.svg"), "lavender horizon must appear in hero scene");
assert(renderedHome.includes("copy.primary") === false || heroActions.includes("{copy.primary}"), "state-controlled primary label remains unchanged");
assert(renderedHome.includes("getLandingState") === false, "do not move customer-state logic into styling layer");

console.log("Home Modern Mystic final balance regression passed ✓");
