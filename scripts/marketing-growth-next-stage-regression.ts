import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");
const video = read("scripts/social/prepare-next-day-videos.mjs");
const coverHooks = JSON.parse(read("scripts/social/video-cover-hooks.json")) as {
 version: number;
 hooks: Record<string, string[]>;
};
const client = read("app/lib/analytics/marketingClient.ts");
const form = read("app/guest-saju/page.tsx");
const loading = read("app/guest-loading/page.tsx");
const magazine = read("app/lib/magazine.ts");
const scorecard = read("docs/marketing-30day-scorecard.sql");

assert.equal(coverHooks.version, 1);
assert.equal(Object.keys(coverHooks.hooks).length, 16, "all 16 visual motifs need mobile-first hooks");
const distinctCoverLines = new Set<string>();
for (const [motif, lines] of Object.entries(coverHooks.hooks)) {
 assert.equal(lines.length, 7, motif + " needs seven situation-matched first frames");
 for (const line of lines) {
  assert(line.endsWith("?"), "thumbnail must invite a question: " + line);
  assert(line.replace(/\s/g,"").length <= 11, "thumbnail must fit mobile safe width: " + line);
  assert(!distinctCoverLines.has(line), "duplicate first-frame hook within 112 scripts: " + line);
  distinctCoverLines.add(line);
 }
}
assert.equal(distinctCoverLines.size, 112);
assert(video.includes("const coverLine=COVER_HOOKS[motif]?.[caseIndex]"));
assert(video.includes("headline:[visible.label+' 사주',strategy.cover]"));
assert(video.includes("headline:STRATEGY.titles[editorialFormat]") &&
  video.includes("headline:PRACTICE_FRAMES[editorialFormat]") &&
  video.includes("headline:['무료 사주','바로 조회하기']"));
assert(video.includes("const title=visible.label+' 사주 | '+strategy.cover"), "social title must lead with saju");
assert(!video.includes("situation.split(' ').slice(-2)"), "never truncate a Korean sentence mid-thought");

const strategy = JSON.parse(read("scripts/social/saju-first-editorial-strategy.json")) as {
 version: number;
 modes: string[];
 groups: Record<string,Record<string,{hook:string;explanation:string;cover:string}>>;
 practices: Record<string,string>;
};
assert.equal(strategy.version,1);
assert.deepEqual(strategy.modes,["curiosity","empathy","service_demo","difference"]);
assert.equal(Object.keys(strategy.groups).length,4);
for(const [g,byMode]of Object.entries(strategy.groups)){
 assert.equal(Object.keys(byMode).length,4);
 for(const mode of strategy.modes){
  const s=byMode[mode];
  assert(/[?？]$/.test(s.hook)&&/사주|궁합|재물운/.test(s.hook),g+" "+mode+" must open with saju");
  assert(s.explanation.replace(/\s/g,"").length>=26 && s.explanation.replace(/\s/g,"").length<=32);
  assert(s.cover.replace(/\s/g,"").length<=11);
 }
}
assert(video.includes("destination:'https://unboda.kr/guest-saju'"));
assert(video.includes("DAILY_CURIOSITY_EMPATHY_SERVICE_DEMO_AI_CONTINUATION_REQUIRED"));
const ctas = [...video.matchAll(/cta:'([^']+)'/g)]
  .map(x => x[1]).filter(x => x.startsWith("운보다 무료 사주"));
const explain = [...video.matchAll(/explanation:'([^']+)'/g)].map(x => x[1]);
assert.equal(ctas.length, 4, "daily shorts must have one branded CTA per category");
assert.equal(new Set(ctas).size, 4, "four shorts need distinct CTAs");
assert.equal(explain.length, 4, "four shorts need individual saju explanations");
for (const line of [...ctas, ...explain]) {
  const n = line.replace(/\s/g, "").length;
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
