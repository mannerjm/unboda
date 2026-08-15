import { validateProfileInput } from "../app/lib/profiles/types";
import { GUEST_BIRTH_DATE_MIN, getGuestBirthDateMax, isGuestBirthDateInRange } from "../app/lib/guestFreeAnalyses/date";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const base = {
  label: "나",
  relationshipType: "self" as const,
  birthDate: "1990-01-15",
  birthTime: "12:00",
  gender: "남성" as const,
  calendarType: "양력" as const,
  isLeapMonth: false,
};

assert(validateProfileInput(base).valid && isGuestBirthDateInRange(base.birthDate), "normal 1990-01-15 guest birth input must be accepted");
assert(!validateProfileInput({ ...base, birthDate: "19900-01-15" }).valid, "five-digit year must be rejected");
assert(!isGuestBirthDateInRange("1899-12-31"), "birth date below the guest minimum must be rejected");
assert(!validateProfileInput({ ...base, birthDate: "2026-02-29" }).valid, "nonexistent calendar date must be rejected");
assert(!isGuestBirthDateInRange("2027-01-01"), "future birth date must be rejected");

const guestSaju = read("app/guest-saju/page.tsx");
const guestResult = read("app/guest-result/page.tsx");
const authenticatedResult = read("app/result/page.tsx");
const guestRoute = read("app/api/guest-free-analysis/route.ts");
const guestStartRoute = read("app/api/guest-free-analysis/start/route.ts");
const guestGenerateRoute = read("app/api/guest-free-analysis/generate/route.ts");
const guestLoading = read("app/guest-loading/page.tsx");

assert(guestSaju.includes("min={GUEST_BIRTH_DATE_MIN}") && guestSaju.includes("max={getGuestBirthDateMax()}"), "guest date input must enforce browser min/max bounds");
assert(guestRoute.includes("validateGuestProfileInput"), "guest server route must enforce the same guest date range policy");
assert(guestResult.includes("ResultPageContent") && guestResult.includes("ResultViewerContext.Provider"), "guest must mount the exact authenticated result renderer through its data context");
for (const fragment of ["FOUR PILLARS", "지장간", "pillar.stage", "pillar.spirit", "pillar.nobles", "DAEUN ANALYSIS", "selectedDaeunOrder", "ganjiToHanja", "오행 분석", "신강·신약 참고 지표", "용신 분석", "격국 분석", "오행 상생·상극", "AI ANALYSIS", "RECOMMENDED ANALYSIS", "심층 분석 확인하기"]) {
  assert(authenticatedResult.includes(fragment), `authenticated original renderer must retain ${fragment}`);
}
assert(guestResult.includes('fetch("/api/guest-free-analysis")') && !guestResult.includes("sessionStorage"), "guest result must remain server-backed without browser analysis storage");
assert(guestResult.includes("/api/guest-free-analysis/intent") && guestResult.includes("/auth/login?returnTo=/auth/complete-guest-analysis"), "guest paid intent and auth continuation must remain intact");
assert(guestStartRoute.includes("createGuestFreeAnalysis") && guestStartRoute.includes("GUEST_ANALYSIS_COOKIE_NAME"), "guest start route must create the server-backed analysis and credential before loading");
assert(guestGenerateRoute.includes("buildFreeAnalysisResponse") && guestGenerateRoute.includes("completeGuestFreeAnalysis"), "guest generation route must complete the existing server-backed row");
assert(guestLoading.includes('fetch("/api/guest-free-analysis/generate"') && guestLoading.includes("분석에는 약 1~2분 정도 소요될 수 있습니다.") && guestLoading.includes("w-16 h-16 border-4") && guestLoading.includes('router.replace("/guest-result")'), "guest loading must reuse the existing loading UI then route to the server-backed result");

console.log(`guest date browser bounds: ${GUEST_BIRTH_DATE_MIN} to ${getGuestBirthDateMax()} ✓`);
console.log("guest date range and calendar validation: true");
console.log("guest mounts the exact authenticated result DOM renderer: true");
console.log("guest server-backed restore and paid intent retained: true");
console.log("guest loading lifecycle and detailed DOM sections: true");