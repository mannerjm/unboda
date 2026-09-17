import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluateAiConsultingScope } from "../app/lib/aiConsultingScope";
import {
  COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID,
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID,
  COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID,
  COMPATIBILITY_ROMANTIC_PRODUCT_ID,
} from "../app/lib/specialAnalysisProducts";

const representativeCases: Array<[string, string]> = [
  [COMPATIBILITY_ROMANTIC_PRODUCT_ID, "상대와 대화할 때 자꾸 오해가 생기는데 우리 관계에서는 어떻게 풀어가는 게 좋아?"],
  [COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID, "부모와 자녀 사이 기대와 독립의 경계를 어떻게 잡는 게 좋아?"],
  [COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID, "형제 사이 비교와 경쟁이 심해질 때 갈등을 어떻게 회복하면 좋아?"],
  [COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID, "사촌과 연락 빈도나 도움의 경계를 어떻게 정하는 게 좋아?"],
];

for (const [productId, question] of representativeCases) {
  const scope = evaluateAiConsultingScope({ productId, question });
  assert.equal(scope.decision, "ALLOW", `${productId} must allow its own relationship follow-up question`);
  assert.equal(scope.reason, "within_compatibility_scope", `${productId} must use compatibility scope reason`);
  assert.equal(scope.kind, "compatibility", `${productId} must resolve as compatibility kind`);
  assert.equal(scope.chargeable, true, `${productId} ALLOW question must be chargeable`);
  assert(scope.answerGuardrails.some((item) => item.includes("감정·의도·생각")), `${productId} must block mind-reading claims`);
  assert(scope.answerGuardrails.some((item) => item.includes("구매 에디션")), `${productId} must keep yearly edition boundary`);
}

const crossRelationshipCases: Array<[string, string]> = [
  [COMPATIBILITY_ROMANTIC_PRODUCT_ID, "부모와 자녀 관계도 같이 봐줘"],
  [COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID, "내 연인과의 애정 관계는 어때?"],
  [COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID, "사촌과의 관계도 같이 봐줘"],
  [COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID, "내 동생과 형제 경쟁도 봐줘"],
];

for (const [productId, question] of crossRelationshipCases) {
  const scope = evaluateAiConsultingScope({ productId, question });
  assert.equal(scope.decision, "DENY", `${productId} must deny a different compatibility relationship type`);
  assert.equal(scope.reason, "compatibility_outside_purchased_scope");
  assert.equal(scope.chargeable, false);
}

const futureYear = evaluateAiConsultingScope({
  productId: COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  question: "내년에는 우리 관계가 어떻게 될까?",
});
assert.equal(futureYear.decision, "DENY", "compatibility consulting must not invent a different yearly edition");
assert.equal(futureYear.chargeable, false);

const unrelated = evaluateAiConsultingScope({
  productId: COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID,
  question: "내 이직과 승진 가능성을 알려줘",
});
assert.equal(unrelated.decision, "DENY", "compatibility consulting must not replace unrelated paid topic analysis");
assert.equal(unrelated.chargeable, false);

const relationshipLens = evaluateAiConsultingScope({
  productId: COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  question: "돈 문제로 자꾸 싸우는데 대화와 경계를 어떻게 잡아야 해?",
});
assert.equal(relationshipLens.decision, "ALLOW", "real-world topics are allowed when the question stays on relationship dynamics");

const unclear = evaluateAiConsultingScope({
  productId: COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  question: "이건 왜 그래?",
});
assert.equal(unclear.decision, "CLARIFY", "unclear compatibility follow-up must clarify without charging");
assert.equal(unclear.chargeable, false);

const safety = evaluateAiConsultingScope({
  productId: COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  question: "상대 우울증을 사주로 진단하고 치료 방법을 정해줘",
});
assert.equal(safety.decision, "SAFETY_REDIRECT", "compatibility consulting must retain high-risk safety redirect");
assert.equal(safety.chargeable, false);

const sessionRoute = readFileSync("app/api/ai-consulting/session/route.ts", "utf8");
assert(sessionRoute.includes("isAiConsultingCompatibilityProductId"), "AI consulting session boundary must explicitly allow supported compatibility products");
assert(!sessionRoute.includes("getSpecialAnalysisProduct"), "unsupported future special products must not gain consulting access implicitly");

const reportRoutes = [
  ["app/special-analysis/compatibility/report/page.tsx", "COMPATIBILITY_ROMANTIC_PRODUCT_ID"],
  ["app/special-analysis/compatibility/family/parent-child/report/page.tsx", "COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID"],
  ["app/special-analysis/compatibility/family/siblings/report/page.tsx", "COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID"],
  ["app/special-analysis/compatibility/family/other/report/page.tsx", "COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID"],
] as const;

for (const [path, productIdConstant] of reportRoutes) {
  const source = readFileSync(path, "utf8");
  assert(source.includes("AiConsultingEntryCard"), `${path} must expose AI consulting after a completed paid report`);
  assert(source.includes(`productId={${productIdConstant}}`), `${path} must bind consulting to the exact purchased compatibility product`);
  assert(source.includes("edition={entitlement.analysisEditionKey}"), `${path} must pin consulting to the purchased yearly edition`);
}

const genericReportRoute = readFileSync("app/paid-analysis/[productId]/report/page.tsx", "utf8");
for (const helper of [
  "isCompatibilityRomanticProductId",
  "isCompatibilityFamilyParentChildProductId",
  "isCompatibilityFamilySiblingProductId",
  "isCompatibilityFamilyOtherProductId",
]) {
  assert(genericReportRoute.includes(helper), `AI consulting back navigation must route ${helper} to its dedicated report`);
}

const entryCard = readFileSync("app/paid-analysis/[productId]/report/AiConsultingEntryCard.tsx", "utf8");
assert(entryCard.includes("이 리포트를 바탕으로 AI에게 질문하기"), "entry copy must work for deep and compatibility reports");
assert(!entryCard.includes("구매한 심층 분석들에서 공통"), "entry copy must not describe compatibility reports as deep-analysis products");

console.log("AI consulting compatibility regression passed ✓");
