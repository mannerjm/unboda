import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const resolver = read("app/lib/phase9NextAnalysis.ts");
const cards = read("app/components/Phase9NextAnalysisCards.tsx");
const section = read("app/components/Phase9NextAnalysisSection.tsx");
const libraryPage = read("app/purchased-analyses/page.tsx");
const libraryList = read("app/components/PurchasedAnalysesListMultiEdition.tsx");
const standardReport = read("app/paid-analysis/[productId]/report/page.tsx");
const romanticReport = read("app/special-analysis/compatibility/report/page.tsx");
const parentReport = read("app/special-analysis/compatibility/family/parent-child/report/page.tsx");
const siblingReport = read("app/special-analysis/compatibility/family/siblings/report/page.tsx");
const otherReport = read("app/special-analysis/compatibility/family/other/report/page.tsx");

assert(resolver.includes("Math.min(input.limit ?? 2, 2)"), "Phase 9 must cap recommendations at two");
assert(resolver.includes("resolveAnalysisEditionForOrder") && resolver.includes("analysisEditionKey === editionKey"), "Phase 9 must compare server-resolved exact editions against ownership");
assert(resolver.includes("source.analysisEditionKey === editionKey") && resolver.includes("continue;"), "the exact edition currently being read must never recommend itself");
assert(resolver.includes("source.analysisEditionKey !== candidateEditionKey"), "the same product may return only when its current exact edition has genuinely changed");
assert(resolver.includes("SPECIAL pair exception") && resolver.includes("genericCompatibilityRecommendation"), "relationship flows must preserve the pair-specific specialist exception");
assert(resolver.includes('"TOPIC"') && resolver.includes('"PERIOD"') && resolver.includes("isSpecialAnalysisProductId"), "Phase 9 must support topic, period, and specialist sources");
assert(!resolver.includes("OpenAI") && !resolver.includes("analysisRecommendationBuilder") && !resolver.includes("recommendationSignals"), "Phase 9 must remain deterministic and independent from the Phase 3 recommender/LLM");

assert(cards.includes("이 분석 살펴보기") && cards.includes("analysisEditionKey"), "recommendation cards must surface a concrete next-analysis CTA and exact-edition context");
assert(section.includes("이미 보유한 동일 exact edition은 제외") && section.includes("getPhase9NextAnalysisRecommendations"), "paid report section must explain and use the exact-edition-aware resolver");

assert(libraryPage.includes("getPhase9NextAnalysisRecommendations") && libraryPage.includes("recentSource"), "purchased library must resolve Phase 9 from a deterministic recent source");
assert(libraryList.includes('data-next-question-slot="phase9"') && libraryList.includes("Phase9NextAnalysisCards"), "reserved Phase 9 library slot must now render recommendations");

for (const report of [standardReport, romanticReport, parentReport, siblingReport, otherReport]) {
  assert(report.includes("Phase9NextAnalysisSection"), "every paid report family must expose the Phase 9 continuation surface");
}

console.log("phase9 next-analysis regression passed");
