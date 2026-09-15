import { readFileSync } from "node:fs";
import {
  buildPartnerCompatibilitySnapshot,
  buildProfileCompatibilitySnapshot,
  validateCompatibilityPartnerInput,
} from "../app/lib/compatibilityCustomerInput";
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

const mine = buildProfileCompatibilitySnapshot(profile, evaluationDate);
assert(Boolean(mine.person.pillars.hour), "stored profile with known time must retain hour pillar");
assert(Boolean(mine.timing.seunGanji), "stored profile must expose current seun for the explicit evaluation date");

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
const api = readFileSync("app/api/special-analysis/compatibility/route.ts", "utf8");
const service = readFileSync("app/lib/compatibilityReportService.ts", "utf8");
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
assert(!compatibilityPage.includes("단순 점수 대신"), "compatibility page must not explain the product through an internal scoring contrast");
assert(api.includes("getCurrentUser") && api.includes("getActiveProfile"), "compatibility API must be member and active-profile scoped");
assert(api.includes("buildCompatibilityTiming") && api.includes("generateCompatibilityReport"), "compatibility API must use the deterministic engine before explanation generation");
assert(api.includes('timeZone: "Asia/Seoul"'), "customer timing evaluation date must be explicit in the Korean service timezone");
assert(!api.includes(".from("), "temporary partner data must not be persisted by the compatibility endpoint");
assert(!api.includes("checkout") && !api.includes("premiumProductRegistry"), "Phase 6 must not silently add compatibility to the current Toss-reviewed catalog");
assert(client.includes("별도 프로필이나 궁합 기록으로 저장하지 않습니다"), "customer UI must explain temporary partner-data handling");
assert(client.includes("출생시간을 몰라요"), "customer UI must support unknown partner birth time");
assert(client.includes('birthTime: ""'), "known-time form must require deliberate time entry rather than defaulting to noon");
assert(!client.includes('birthTime: "12:00"'), "customer form must not suggest a fake noon value");
assert(!client.includes("<label>\n          <span className=\"text-sm font-semibold text-stone-800\">출생시간</span>"), "birth-time checkbox must not be nested inside another label");
assert(client.includes('label: ""'), "partner label must start empty so the user deliberately names the other person");
assert(client.includes('gender: ""'), "partner gender must start unselected rather than defaulting to a value");
assert(client.includes("상대방 이름 또는 별칭") && client.includes('placeholder="예: 지민, 배우자"'), "partner naming field must use natural customer language without requiring a real name");
assert(client.includes('<option value="" disabled>선택해 주세요</option>'), "gender select must expose a neutral selection prompt");
assert(client.includes("현재 궁합 분석은 연인·배우자 관계를 기준으로 살펴봅니다."), "input form must state the current romantic/partner scope");
assert(client.includes("disabled={loading || !canSubmit}"), "analysis CTA must remain disabled until the required deliberate inputs are complete");
assert(!client.includes("상대방 구분 이름"), "customer form must not expose system-like partner label wording");
assert(!client.includes("evidenceRefs}"), "internal evidence references must never be rendered to customers");
assert(service.includes('callType: "recommendation-analysis"'), "compatibility explanation must use the bounded customer-facing generation lane");
assert(service.includes("validateCompatibilityReportOutput"), "model output must pass the Phase 5 closed report contract");
assert(adapter.includes("Array.from({ length: 24 }") && adapter.includes("signatures.size !== 1"), "unknown-time handling must verify stable date pillars rather than inject noon");
assert(!adapter.includes('birthTime: "12:00"'), "server adapter must never synthesize noon for unknown birth time");

console.log("compatibility-customer-flow-regression: OK");
