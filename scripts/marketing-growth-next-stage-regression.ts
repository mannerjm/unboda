import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");
const video = read("scripts/social/prepare-next-day-videos.mjs");
const client = read("app/lib/analytics/marketingClient.ts");
const form = read("app/guest-saju/page.tsx");
const loading = read("app/guest-loading/page.tsx");
const magazine = read("app/lib/magazine.ts");
const scorecard = read("docs/marketing-30day-scorecard.sql");

const ctas = [...video.matchAll(/cta:'([^']+)'/g)]
  .map(x => x[1]).filter(x => x.startsWith("운보다 무료 사주"));
const explain = [...video.matchAll(/explanation:'([^']+)'/g)].map(x => x[1]);
assert.equal(ctas.length, 4, "daily shorts must have one branded CTA per category");
assert.equal(new Set(ctas).size, 4, "four shorts need distinct CTAs");
assert.equal(explain.length, 4, "four shorts need individual saju explanations");
for (const line of [...ctas, ...explain]) {
  const n = line.replace(/\\s/g, "").length;
  assert(n >= 26 && n <= 32, "Korean voice scene must be 26-32 nonspace chars: " + line);
}
assert(video.includes("g.cta]"), "generated narration must use the category CTA");
assert(!video.includes("운보다 무료 사주 조회 후 내 선택과 생활 흐름도 차분하게 살펴보세요."),
  "generic CTA cannot return");
assert(video.includes("automatedPublicationAllowed:false") && video.includes("voiceHumanReviewRequired:true"),
  "private review and independent QA gates must remain");
assert(client.includes('query.get("utm_medium") || query.get("utm_campaign")'),
  "medium/campaign-only social URLs must start a tagged session when attribution changes");
assert(client.includes("existing.current.channel !== current.channel"), "distinct current channel must not be inherited");
assert(!client.includes("birthDate") && !client.includes("birthTime"), "marketing client must not store birth inputs");
assert(loading.includes('/guest-saju?analysisError=1') &&
  form.includes('get("analysisError") === "1"') &&
  form.includes('role="alert"'), "failed generation needs a discoverable user retry explanation");
assert(magazine.includes('slug: "saju-four-pillars-basics"') &&
  magazine.includes('approvedForPublication: true') &&
  magazine.includes('2026-11-19T09:00:00+09:00'),
  "scheduled evergreen guide must be properly date gated");
assert(scorecard.includes("WHERE is_internal = false") &&
  scorecard.includes("FREE_ANALYSIS_COMPLETED") &&
  scorecard.includes("FREE_RESULT_VIEWED") &&
  scorecard.includes("nullif("), "scorecard must exclude tests and handle zero denominators");
console.log("marketing-growth-next-stage-regression: PASS");
