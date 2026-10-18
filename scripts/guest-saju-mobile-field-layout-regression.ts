import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync("app/guest-saju/page.tsx", "utf8");

// At narrow iPhone widths the native date/time controls have a min-content
// width. Prevent their intrinsic width from sizing a grid track beyond the
// white birth-input card.
assert(src.includes('className="mt-6 min-w-0 space-y-5'), "form must allow shrinking to viewport");
assert.equal((src.match(/className="grid grid-cols-1 gap-5 sm:grid-cols-2"/g) ?? []).length, 2,
  "birth/time and gender/calendar groups must both use minmax(0,1fr) mobile tracks");
assert(src.includes('<label className="block min-w-0 text-sm font-bold">생년월일'),
  "date grid child must not impose its intrinsic minimum width");
assert(src.includes('<div className="min-w-0 space-y-2">'),
  "time grid child must shrink with its column");

const date = src.match(/<input type="date"[^\n]*/)?.[0] ?? "";
const time = src.match(/<input id="guest-birth-time" type="time"[^\n]*/)?.[0] ?? "";
// The visible border belongs to the clipped wrapper, not the native input.
// Safari can enforce minimum intrinsic widths even with w-full/min-w-0.
assert(src.includes("h-14 w-full min-w-0 max-w-full overflow-hidden rounded-xl border"),
  "date picker must render inside a fixed-width, clipped visible field");
assert(src.includes("relative h-14 w-full min-w-0 max-w-full overflow-hidden rounded-xl border"),
  "time picker must render inside a fixed-width, clipped visible field");
for (const [name, field] of [["date", date], ["time", time]] as const) {
  for (const utility of ["absolute", "inset-0", "z-10", "h-full", "w-full", "min-w-0", "max-w-full", "opacity-0"]) {
    assert(field.includes(utility),
      `${name} native picker must be a fully tappable but visually clipped overlay (${utility})`);
  }
  assert(field.includes("onClick=") && field.includes("showPicker?.()"),
    `${name} picker must open from a direct user tap when supported`);
}
assert(src.includes("input.birthDate.replaceAll") &&
  src.includes('input.birthTime || "태어난 시간 선택"'),
  "displayed values must track actual native birth form controls");

assert(date.includes("min={GUEST_BIRTH_DATE_MIN}") && date.includes("max={getGuestBirthDateMax()}"),
  "responsive fix must not change birthdate boundaries");
assert(date.includes("required />"), "date input remains required");
assert(time.includes('disabled={input.birthTimeKnown === false}')
  && time.includes('required={input.birthTimeKnown !== false}'),
  "time-required rule and unknown birth-time support must be unchanged");
assert(src.includes('birthTime: event.target.checked ? "12:00" : ""'),
  "unknown birth-time calculation contract must remain unchanged");
assert(src.includes('method: "POST"') && src.includes('"/api/guest-free-analysis/start"'),
  "free-saju submission must remain unchanged");
console.log("guest-saju-mobile-field-layout-regression: PASS");
