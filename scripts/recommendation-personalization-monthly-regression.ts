import assert from "node:assert/strict";
import { buildCurrentFreeRecommendations } from "../app/lib/currentFreeRecommendations";
import { buildMonthlyCycleFacts } from "../app/lib/paidAnalysisEvidenceFacts";
import { getSaju } from "../app/lib/manse";
import type { AnalyzeProfileMetadata } from "../app/lib/analyzeApiTypes";

// Synthetic, noncustomer profiles: verify that recommendations are evidence
// based, deterministic, and recalculated using actual solar-term month facts.
// Different birth data are not *forced* to different products when evidence ties.
const examples: Array<Pick<AnalyzeProfileMetadata, "birthDate" | "birthTime" | "calendarType" | "isLeapMonth" | "gender" | "birthTimeKnown">> = [
  { birthDate: "1988-03-22", birthTime: "06:20", calendarType: "양력", isLeapMonth: false, gender: "남성", birthTimeKnown: true },
  { birthDate: "1994-08-14", birthTime: "22:15", calendarType: "양력", isLeapMonth: false, gender: "여성", birthTimeKnown: true },
  { birthDate: "2000-01-19", birthTime: "11:30", calendarType: "양력", isLeapMonth: false, gender: "남성", birthTimeKnown: true },
  { birthDate: "1975-11-07", birthTime: "14:35", calendarType: "양력", isLeapMonth: false, gender: "여성", birthTimeKnown: true },
  { birthDate: "1999-06-11", birthTime: "12:00", calendarType: "양력", isLeapMonth: false, gender: "남성", birthTimeKnown: false },
];

const october = examples.map((profile) => buildCurrentFreeRecommendations(profile, "2026-10-16"));
const november = examples.map((profile) => buildCurrentFreeRecommendations(profile, "2026-11-16"));
const signature = (value: (typeof october)[number]) =>
  JSON.stringify(value.productRecommendations.recommendations.map((r) => ({
    id: r.productId, score: r.score, evidence: r.evidence?.map((e) => [e.signal, e.source, e.contribution]),
  })));

for (let i = 0; i < examples.length; i += 1) {
  const current = october[i];
  assert.equal(current.productRecommendations.recommendations.length, 3, "exactly three current recommendations");
  assert.equal(new Set(current.productRecommendations.recommendations.map((r) => r.productId)).size, 3, "unique products");
  assert.equal(current.productRecommendations.evaluationContext?.evaluationMonth, 10);
  assert.equal(november[i].productRecommendations.evaluationContext?.evaluationMonth, 11);
  assert.equal(signature(current), signature(buildCurrentFreeRecommendations(examples[i], "2026-10-16")), "no random ranking");
  for (const recommendation of current.productRecommendations.recommendations) {
    assert.ok((recommendation.evidence?.length ?? 0) > 0, "evidence is required");
    assert.ok(recommendation.reasons.some((r) => r.length > 18 && !r.includes("fortuneFlowAnalysis")), "concrete readable reasons");
  }
  const sajuOctober = getSaju(examples[i].birthDate, examples[i].birthTime,
    examples[i].calendarType, examples[i].isLeapMonth ? "윤달" : "평달",
    examples[i].gender, "2026-10-16", examples[i].birthTimeKnown);
  const sajuNovember = getSaju(examples[i].birthDate, examples[i].birthTime,
    examples[i].calendarType, examples[i].isLeapMonth ? "윤달" : "평달",
    examples[i].gender, "2026-11-16", examples[i].birthTimeKnown);
  assert.notEqual(buildMonthlyCycleFacts(sajuOctober)?.representativePillar,
    buildMonthlyCycleFacts(sajuNovember)?.representativePillar,
    "solar-term month evidence must change for adjacent months");
}

assert.ok(new Set(october.map(signature)).size >= 2, "different natal charts must produce meaningfully different evidence scores");
assert.ok(october.some((result, i) => signature(result) !== signature(november[i])),
  "monthly solar-term transition must affect actual recommendation evidence in cohort");

console.log("recommendation-personalization-monthly-regression passed", {
  profiles: examples.length,
  uniqueEvidenceProfiles: new Set(october.map(signature)).size,
  monthlyChanges: october.filter((r, i) => signature(r) !== signature(november[i])).length,
});
