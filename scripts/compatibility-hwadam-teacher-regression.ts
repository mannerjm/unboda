import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const card = read("app/components/HwadamCompatibilityTeacherCard.tsx");
const portrait = readFileSync("public/teachers/hwadam.webp");
const imageSha = createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${portrait.length}\0`), portrait])).digest("hex");

assert.equal(imageSha, "ace9988d7c89991e4ea0dd43c38a9bcd65db4171", "approved Hwadam portrait must not change unexpectedly");
assert.equal(portrait.toString("ascii", 0, 4), "RIFF");
assert.equal(portrait.toString("ascii", 8, 12), "WEBP");
assert(portrait.length > 6000, "teacher portrait must be a real, nonempty image");
assert(card.includes('src="/teachers/hwadam.webp"')
  && card.includes('data-teacher-portrait="full"')
  && card.includes('data-portrait-fit="balanced"')
  && card.includes('aspect-[1/2]')
  && card.includes('className="object-cover object-center"')
  && card.includes('"w-[88px] sm:w-[112px]"')
  && card.includes('"w-[80px] sm:w-[100px]"'),
  "Hwadam must use the same portrait frame proportions and widths as the other seven teachers");
assert(card.includes('data-compatibility-teacher-profile="visible"')
  && !card.includes("<details") && !card.includes("<summary"),
  "specialist profile must be visible without extra clicks");
for (const disallowed of ["가상", "인공지능", "AI", "전문 자격", "경력 20년"]) {
  assert(!card.includes(disallowed), "do not use unverified claims or restricted teacher-profile wording");
}
for (const path of [
  "app/components/PaidCompatibilityAnalysisClient.tsx",
  "app/components/PaidFamilyParentChildAnalysisClient.tsx",
  "app/components/PaidFamilyExtendedAnalysisClient.tsx",
]) {
  const detail = read(path);
  assert(!detail.includes("정보는 결제 연결을 위해 현재 브라우저에만 잠시 보관됩니다."),
    "selected browser information note must be absent from paid compatibility details: " + path);
  assert(!detail.includes("본인·성인 인증이 아직 완료되지 않았다면 결제 화면에서 NICE 본인확인을 먼저 진행합니다."),
    "selected identification note must be absent from paid compatibility details: " + path);
  assert(detail.includes("구매 전 확인") && detail.includes('type="submit"')
    && detail.includes("<CompatibilityReportValuePreview"),
    "buyer form, actual checkout and report preview must remain unchanged: " + path);
}

const catalog = read("app/special-analysis/compatibility/page.tsx");
const pair = read("app/special-analysis/compatibility/PairCompatibilityPage.tsx");
const family = read("app/special-analysis/compatibility/family/parent-child/page.tsx");
assert.equal(catalog.split('<HwadamCompatibilityTeacherCard placement="catalog" />').length - 1, 1,
  "one visible catalog specialist for all five compatibility products");
assert.equal(pair.split('<HwadamCompatibilityTeacherCard placement="detail"').length - 1, 1,
  "one detail specialist for romantic, friend, work and partnership");
assert.equal(family.split('<HwadamCompatibilityTeacherCard placement="detail"').length - 1, 1,
  "one detail specialist for all family subtypes");
assert(catalog.indexOf('<HwadamCompatibilityTeacherCard placement="catalog" />') > catalog.indexOf("</header>")
  && catalog.indexOf('<HwadamCompatibilityTeacherCard placement="catalog" />') < catalog.indexOf("compatibilityCards.map("),
  "catalog specialist must appear before product cards");
assert(pair.indexOf('<HwadamCompatibilityTeacherCard placement="detail"') > pair.indexOf("<CompatibilityDetailHero")
  && pair.indexOf('<HwadamCompatibilityTeacherCard placement="detail"') < pair.indexOf("<PaidCompatibilityAnalysisClient"),
  "pair specialist must appear between existing hero and input form");
assert(family.indexOf('<HwadamCompatibilityTeacherCard placement="detail"') > family.indexOf("<CompatibilityDetailHero")
  && family.indexOf('<HwadamCompatibilityTeacherCard placement="detail"') < family.indexOf("<FamilyCompatibilityAnalysisClient"),
  "family specialist must appear before the existing selector and input form");
for (const path of [
  "app/special-analysis/compatibility/PairCompatibilityReportPage.tsx",
  "app/special-analysis/compatibility/family/parent-child/report/page.tsx",
  "app/special-analysis/compatibility/family/siblings/report/page.tsx",
  "app/special-analysis/compatibility/family/other/report/page.tsx",
]) {
  const s = read(path);
  assert.equal(s.split('<HwadamCompatibilityTeacherCard placement="report" />').length - 1, 1, "report intro must appear once: " + path);
  assert.equal(s.split('<HwadamCompatibilityTeacherCard placement="closing"').length - 1, 1, "report closing must appear once: " + path);
  assert(s.includes("hwadamResult.report.relationshipCore.headline")
    && s.includes("hwadamResult.report.actionGuide.doNext[0]?.action"),
    "closing must reuse stored personal results and actions rather than inventing content: " + path);
  assert(s.includes('data-hwadam-report="completed"'),
    "only completed reports receive the compatibility teacher theme: " + path);
  assert(s.indexOf('<HwadamCompatibilityTeacherCard placement="report"') < s.indexOf('<HwadamCompatibilityTeacherCard placement="closing"'),
    "report teacher order must be correct: " + path);
}
for (const [path, count] of [
  ["app/components/CompatibilityPaidReportView.tsx", 1],
  ["app/components/FamilyParentChildPaidReportView.tsx", 1],
  ["app/components/FamilyExtendedPaidReportView.tsx", 2],
] as const) {
  const s = read(path);
  assert.equal(s.split('data-hwadam-report-theme="hero"').length - 1, count,
    "all type-specific report headers must use the same Hwadam palette: " + path);
  assert(s.includes('data-hwadam-report-theme="action"'),
    "action section must have Hwadam palette: " + path);
}
assert(!catalog.includes("priceOverride") && !card.includes("getPaidReport("),
  "teacher display code must not control pricing or report generation");
console.log("Hwadam specialist regression passed: teacher scale aligned, two selected notices removed across compatibility details, existing reports preserved");
