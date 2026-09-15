import { readFileSync } from "node:fs";
import {
  buildPartnerCompatibilitySnapshot,
  buildProfileCompatibilitySnapshot,
  validateCompatibilityPartnerInput,
} from "../app/lib/compatibilityCustomerInput";
import { buildCompatibilityPairPerspectives } from "../app/lib/compatibilityPairPerspective";
import { buildCompatibilityTiming } from "../app/lib/compatibilityTiming";
import type { ProfileDto } from "../app/lib/profiles/types";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const evaluationDate = "2026-09-15";
const profile: ProfileDto = {
  id: "00000000-0000-4000-8000-000000000001",
  label: "나",
  relationshipType: "self",
  birthDate: "1990-05-15",
  birthTime: "10:30",
  gender: "남성",
  calendarType: "양력",
  isLeapMonth: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const knownPartner = validateCompatibilityPartnerInput({
  label: "상대방",
  birthDate: "1992-07-20",
  birthTimeKnown: true,
  birthTime: "14:20",
  gender: "여성",
  calendarType: "양력",
  isLeapMonth: false,
});
assert(knownPartner.valid, "known-time partner input must validate");

const unknownPartner = validateCompatibilityPartnerInput({
  label: "상대방",
  birthDate: "1992-07-20",
  birthTimeKnown: false,
  birthTime: null,
  gender: "여성",
  calendarType: "양력",
  isLeapMonth: false,
});
assert(unknownPartner.valid, "unknown-time partner input must validate without a fake time");

const sixDigitYearPartner = validateCompatibilityPartnerInput({
  ...knownPartner.value,
  birthDate: "199548-06-02",
});
assert(!sixDigitYearPartner.valid, "compatibility input must reject six-digit birth years");

const futurePartner = validateCompatibilityPartnerInput({
  ...knownPartner.value,
  birthDate: "2999-01-01",
});
assert(!futurePartner.valid, "compatibility input must reject unsupported future birth dates");

const mine = buildProfileCompatibilitySnapshot(profile, evaluationDate);
assert(Boolean(mine.person.pillars.hour), "stored profile with known time must retain hour pillar");
assert(Boolean(mine.timing.seunGanji), "stored profile must expose current seun for the explicit evaluation date");

const knownSnapshot = buildPartnerCompatibilitySnapshot(knownPartner.value, evaluationDate);
const timing = buildCompatibilityTiming(mine.person, knownSnapshot.person, {
  evaluationYear: 2026,
  A: mine.timing,
  B: knownSnapshot.timing,
});
const perspectives = buildCompatibilityPairPerspectives(timing);
assert(perspectives.meToPartner.direction === "me_to_partner", "pair perspective must preserve user-to-partner direction");
assert(perspectives.partnerToMe.direction === "partner_to_me", "pair perspective must preserve partner-to-user direction");
assert(perspectives.meToPartner.headline.length > 0 && perspectives.partnerToMe.headline.length > 0, "pair perspective must expose customer-facing directional headlines");
assert(!/\d{1,3}\s*(?:점|%)/u.test(`${perspectives.meToPartner.summary}${perspectives.partnerToMe.summary}`), "pair perspective must not expose numeric compatibility scoring");

const unknownSnapshot = buildPartnerCompatibilitySnapshot(unknownPartner.value, evaluationDate);
assert(unknownSnapshot.person.pillars.hour === null, "unknown partner time must keep hour pillar absent");
assert(unknownSnapshot.timing.daeunGanji === null, "unknown partner time must not synthesize current daeun");
assert(Boolean(unknownSnapshot.timing.seunGanji), "unknown partner time may retain the calculable current seun");

const invalidSolarLeap = validateCompatibilityPartnerInput({
  ...knownPartner.value,
  calendarType: "양력",
  isLeapMonth: true,
});
assert(!invalidSolarLeap.valid, "solar partner input must reject leap-month state");

const shell = readFileSync("app/components/AppShell.tsx", "utf8");
const hub = readFileSync("app/special-analysis/page.tsx", "utf8");
const compatibilityPage = readFileSync("app/special-analysis/compatibility/page.tsx", "utf8");
const client = readFileSync("app/components/CompatibilityAnalysisClient.tsx", "utf8");
const birthDateField = readFileSync("app/components/CompatibilityBirthDateField.tsx", "utf8");
const api = readFileSync("app/api/special-analysis/compatibility/route.ts", "utf8");
const service = readFileSync("app/lib/compatibilityReportService.ts", "utf8");
const perspectiveSource = readFileSync("app/lib/compatibilityPairPerspective.ts", "utf8");
const adapter = readFileSync("app/lib/compatibilityCustomerInput.ts", "utf8");

assert(shell.includes('href: "/special-analysis"') && shell.includes('label: "전문 분석"'), "AppShell must expose professional analysis");
assert(shell.includes("grid-cols-7"), "mobile navigation must include professional analysis without hiding it");
assert(hub.includes("궁합 분석") && hub.includes('href="/special-analysis/compatibility"'), "professional hub must expose compatibility");
assert(hub.includes("궁합 분석 시작하기"), "professional hub must expose a clear customer CTA");
assert(hub.includes("출생시간을 몰라도 분석 가능"), "professional hub must explain unknown-time support in customer language");
assert(hub.includes("소통·갈등·회복까지 확인"), "professional hub must explain compatibility scope in customer language");
assert(hub.includes("현재 관계 흐름 함께 확인"), "professional hub must explain timing value in customer language");
assert(hub.includes("연인·배우자 관계에서"), "professional hub must clearly scope the first compatibility product to romantic/partner relationships");
for (const internalCopy of ["전문 엔진", "단일 총점 없음", "현재 시기 별도 분석", "원국 관계", "대운·세운"]) {
  assert(!hub.includes(internalCopy), `professional hub must not expose internal copy: ${internalCopy}`);
}
assert(compatibilityPage.includes("CompatibilityAnalysisClient"), "compatibility page must mount the customer flow");
assert(compatibilityPage.includes("연인·배우자 관계에서") && compatibilityPage.includes("회복 방식") && compatibilityPage.includes("현재 관계 흐름"), "compatibility page intro must state the customer scope and value directly");
assert(compatibilityPage.includes("전문 분석 · 궁합") && !compatibilityPage.includes(">COMPATIBILITY<"), "compatibility page eyebrow must use Korean customer language");
assert(!compatibilityPage.includes("단순 점수 대신"), "compatibility page must not explain the product through an internal scoring contrast");
assert(compatibilityPage.includes("max-w-5xl") && compatibilityPage.includes("max-w-3xl"), "compatibility page must reserve a wider canvas for the premium result while keeping intro/input readable");
assert(api.includes("getCurrentUser") && api.includes("getActiveProfile"), "compatibility API must be member and active-profile scoped");
assert(api.includes("buildCompatibilityTiming") && api.includes("generateCompatibilityReport"), "compatibility API must use the deterministic engine before explanation generation");
assert(api.includes("buildCompatibilityPairPerspectives") && api.includes("perspectives,"), "compatibility API must expose deterministic directional perspectives alongside the report");
assert(api.includes('timeZone: "Asia/Seoul"'), "customer timing evaluation date must be explicit in the Korean service timezone");
assert(!api.includes(".from("), "temporary partner data must not be persisted by the compatibility endpoint");
assert(!api.includes("checkout") && !api.includes("premiumProductRegistry"), "Phase 6 must not silently add compatibility to the current Toss-reviewed catalog");
assert(client.includes("별도 프로필이나 궁합 기록으로 저장하지 않습니다"), "customer UI must explain temporary partner-data handling");
assert(client.includes("출생시간을 몰라요"), "customer UI must support unknown partner birth time");
assert(client.includes('birthTime: ""'), "known-time form must require deliberate time entry rather than defaulting to noon");
assert(!client.includes('birthTime: "12:00"'), "customer form must not suggest a fake noon value");
assert(client.includes('label: ""'), "partner label must start empty so the user deliberately names the other person");
assert(client.includes('gender: ""'), "partner gender must start unselected rather than defaulting to a value");
assert(client.includes("상대방 이름 또는 별칭") && client.includes('placeholder="예: 지민, 배우자"'), "partner naming field must use natural customer language without requiring a real name");
assert(client.includes('<option value="" disabled>선택해 주세요</option>'), "gender select must expose a neutral selection prompt");
assert(client.includes("연인·배우자 관계") && client.includes("궁합 분석 준비") && client.includes("상대방 정보를 입력해 주세요"), "input form must present a premium customer-facing analysis preparation surface");
assert(client.includes("CompatibilityBirthDateField") && !client.includes('type="date"'), "compatibility form must use the bounded custom birth-date control instead of the browser-native date picker");
assert(birthDateField.includes("MIN_YEAR = 1900") && birthDateField.includes('aria-label="출생 연도"') && birthDateField.includes('aria-label="출생 월"') && birthDateField.includes('aria-label="출생 일"'), "custom birth-date control must constrain and separate year/month/day selection");
assert(birthDateField.includes("currentYear - index") && birthDateField.includes("daysInMonth"), "custom birth-date control must prevent arbitrary year length and invalid calendar days");
assert(client.includes("disabled={loading || !canSubmit}"), "analysis CTA must remain disabled until the required deliberate inputs are complete");
assert(client.includes("서로에게 미치는 방식") && client.includes("perspectives.meToPartner") && client.includes("perspectives.partnerToMe"), "result UI must make the engine's asymmetric pair influence visible to customers");
assert(client.includes('data-section="pair-perspective"'), "directional compatibility section must have a stable result marker and remain a first-class report section");
assert(client.includes("strengthGridClass = report.strengths.length <= 2") && client.includes("${strengthGridClass}"), "strength cards must avoid an empty third desktop column when only one or two strengths are generated");
assert(client.includes("궁합 리포트") && client.includes("관계 핵심 요약") && client.includes("관계 핵심"), "result hero must read like a premium report instead of a raw developer output");
for (const templateLabel of ["RELATIONSHIP CORE", "AT A GLANCE", "STRENGTHS", "DIRECTION", "FRICTION", "RECOVERY", "LONG TERM", "ACTION "]) {
  assert(!client.includes(templateLabel), `premium report must not expose template-style English label: ${templateLabel}`);
}
assert(client.includes("두 사람의 관계 패턴") && client.includes("년 흐름 함께 보기"), "hero badges must describe customer value rather than implementation details");
assert(client.includes("오래 가려면 맞춰야 할 기준") && client.includes("갈등 뒤 회복 방식"), "premium result hierarchy must translate technical sections into customer-readable editorial sections");
assert(client.includes("shadow-xl") && client.includes("rounded-[32px]") && client.includes("bg-[linear-gradient"), "premium result and input surfaces must retain the designed report hierarchy and premium treatment");
assert(client.includes("lg:grid-cols-3") && client.includes("lg:grid-cols-2"), "premium result must use responsive summary and detail card layouts rather than a document-only column");
assert(client.includes('className="mx-auto mt-8 max-w-3xl'), "input form must remain constrained even though the result canvas is wider");
assert(!client.includes("function SectionCard"), "premium result must not fall back to the old generic developer-style section renderer");
assert(!client.includes("상대방 구분 이름"), "customer form must not expose system-like partner label wording");
assert(!client.includes("evidenceRefs}"), "internal evidence references must never be rendered to customers");
assert(service.includes('callType: "recommendation-analysis"'), "compatibility explanation must use the bounded customer-facing generation lane");
assert(service.includes("validateCompatibilityReportOutput"), "model output must pass the Phase 5 closed report contract");
assert(service.includes("COMPATIBILITY_REPORT_GENERATION_MAX_ATTEMPTS = 2"), "compatibility report generation must use one bounded schema-repair retry");
assert(service.includes('issue.code === "too_big"'), "compatibility retry must be limited to schema cardinality overflow rather than arbitrary validation failures");
assert(service.includes("[STRICT_CARDINALITY_LIMITS]"), "compatibility generation prompt must state strict array limits before the first model call");
assert(service.includes("[CUSTOMER_COPY_GUIDE]") && service.includes("같은 조언") && service.includes("55자"), "compatibility generation must guard concise, non-repetitive customer copy");
assert(service.includes("'운영', '관리'") && service.includes("'조율', '균형', '속도', '흐름'"), "current timing copy must avoid system-like relationship language");
assert(service.includes("직전 응답은 배열 개수 제한을 초과했습니다"), "compatibility repair retry must explicitly correct only array cardinality overflow");
assert(perspectiveSource.includes("BReceivesFromA") && perspectiveSource.includes("AReceivesFromB"), "directional presentation must preserve the two engine directions rather than flatten them");
assert(perspectiveSource.includes("ELEMENT_COPY") && perspectiveSource.includes('leadingSupport[0]?.element') && perspectiveSource.includes('leadingBurden[0]?.element'), "directional customer copy must use each receiver's leading support and burden elements instead of generic duplicate signals");
assert(perspectiveSource.includes("성장과 확장") && perspectiveSource.includes("유연함과 교류") && perspectiveSource.includes("명리 근거"), "directional copy must translate technical element signals into customer language while keeping the evidence visible");
assert(!perspectiveSource.includes("Math.random") && !perspectiveSource.includes("generateAnalysisText"), "directional perspective layer must remain deterministic and evidence-derived");
assert(adapter.includes("isGuestBirthDateInRange") && adapter.includes("GUEST_BIRTH_DATE_MIN"), "server adapter must enforce the same bounded birth-date policy as the premium selector");
assert(adapter.includes("Array.from({ length: 24 }") && adapter.includes("signatures.size !== 1"), "unknown-time handling must verify stable date pillars rather than inject noon");
assert(!adapter.includes('birthTime: "12:00"'), "server adapter must never synthesize noon for unknown birth time");

console.log("compatibility-customer-flow-regression: OK");
