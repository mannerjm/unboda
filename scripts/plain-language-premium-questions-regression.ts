import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getLaunchProductIds, getPaidAnalysisTopicConfig } from "../app/lib/paidAnalysisTopicConfig";
import { getPeriodAnalysisStrategy } from "../app/lib/analysisPeriodStrategy";
import { getReadablePaidQuestion, READABLE_PAID_QUESTIONS } from "../app/lib/premiumQuestionDisplay";

const launchIds = getLaunchProductIds();
const displayIds = Object.keys(READABLE_PAID_QUESTIONS);
assert.equal(launchIds.length, 57, "expected 50 topic + 7 period launch questions");
assert.deepEqual([...displayIds].sort(), [...launchIds].sort(), "each launched STEP 2 product needs exactly one plain-language question");

for (const productId of launchIds) {
  const text = getReadablePaidQuestion(productId, "").trim();
  assert(text.endsWith("?"), `${productId}: display title must be a question`);
  assert(text.length <= 39, `${productId}: keep the title concise and readable`);
  assert(!/[\r\n]/.test(text), `${productId}: show a single plain-language question`);
  const technical = getPaidAnalysisTopicConfig(productId)?.userQuestion ?? getPeriodAnalysisStrategy(productId)?.coreQuestion;
  assert(technical, `${productId}: existing report specification must remain available`);
}
assert.equal(getReadablePaidQuestion("unknown-product", "기존 설명"), "기존 설명", "unknown and historical products must keep the existing fallback");

const catalog = readFileSync("app/components/PremiumCatalogSection.tsx", "utf8");
const recommendation = readFileSync("app/components/RecommendationTop3.tsx", "utf8");
const freeResult = readFileSync("app/result/page.tsx", "utf8");
const topicConfig = readFileSync("app/lib/paidAnalysisTopicConfig.ts", "utf8");
const periodStrategy = readFileSync("app/lib/analysisPeriodStrategy.ts", "utf8");

for (const source of [catalog, recommendation, freeResult]) {
  assert(source.includes("getReadablePaidQuestion"), "all question selection and recommendation surfaces must show readable customer-facing copy");
}
assert(
  catalog.includes("getReadablePaidQuestion(product.id, decision.decisionQuestion)")
    && catalog.includes("getReadablePaidQuestion(product.id, decision.primaryQuestion)"),
  "both topic and period STEP 2 question cards must show plain-language labels",
);
assert(!topicConfig.includes("getReadablePaidQuestion") && !periodStrategy.includes("getReadablePaidQuestion"), "customer display copy must not change AI prompts or time-window contracts");
assert.equal(getReadablePaidQuestion("study-learning-strategy", ""), "나에게 맞는 공부 방법은 무엇일까요?");
assert.equal(getReadablePaidQuestion("study-exam-preparation", ""), "시험을 어떻게 준비하면 좋을까요?");
assert.equal(getReadablePaidQuestion("study-focus-routine", ""), "어떻게 하면 공부에 더 잘 집중할 수 있을까요?");
assert.equal(getReadablePaidQuestion("study-credential-decision", ""), "지금 이 자격증에 도전해도 괜찮을까요?");
console.log("plain-language-premium-questions-regression: PASS (57/57)");
