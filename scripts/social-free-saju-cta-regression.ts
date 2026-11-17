import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(path, "utf8");
const zodiac = source("scripts/daily-zodiac/render.py");
const constellation = source("scripts/daily-constellation/render.py");
const tracker = source("app/components/AnalyticsVisitTracker.tsx");
const endpoint = "https://unboda.kr/guest-saju?";
for (const [name, code, campaign] of [
  ["zodiac", zodiac, "daily_zodiac"],
  ["constellation", constellation, "daily_constellation"],
] as const) {
  assert(code.includes(endpoint + "utm_medium=social&utm_campaign=" + campaign),
    name + ": free saju deep link must have bounded campaign metadata");
  assert(!code.includes("무료 사주 조회: https://unboda.kr\\n") &&
    !code.includes('무료 사주 조회: https://unboda.kr"'),
    name + ": old home page CTA must not be restored");
}
// The same caption is dispatched to multiple networks. It cannot truthfully
// claim a network source without separate provider-specific links.
assert(!zodiac.includes("utm_source=") && !constellation.includes("utm_source="),
  "shared-carousels must not fabricate a source");
assert(tracker.includes('return { channel: "social", source: isSocialSource(source) ? source : "other" };'),
  "social source must come from referrer when present");
assert(tracker.includes('return { channel: "social", source: "other" };'),
  "untagged/referrer-less social clicks must not be mislabeled direct");
assert(tracker.includes('if (params.get("fbclid")) return { channel: "social", source: "facebook" };'),
  "fbclid alone must not be paid");
console.log("social-free-saju-cta-regression: PASS");
