import assert from "node:assert/strict";
import {
  AI_CONSULTING_CONTEXT_LIMITS,
  AI_CONSULTING_MAX_QUESTION_CHARS,
  AI_CONSULTING_TARGET_ANSWER_CHARS,
  assertSameConsultingBoundary,
  canConsumeAiConsultingQuestion,
  isAiConsultingMemoryUsableAsUserFact,
  shouldChargeAiConsultingQuestion,
} from "../app/lib/aiConsultingDataModel";

const now = new Date("2026-09-08T06:00:00.000Z");
const activeGrant = {
  status: "active" as const,
  questionLimit: 5,
  questionsUsed: 0,
  expiresAt: null,
};

assert.equal(AI_CONSULTING_MAX_QUESTION_CHARS, 300);
assert.deepEqual(AI_CONSULTING_TARGET_ANSWER_CHARS, { min: 500, max: 800 });
assert.deepEqual(AI_CONSULTING_CONTEXT_LIMITS, {
  recentMessages: 6,
  longTermMemories: 8,
});

assert.equal(canConsumeAiConsultingQuestion(activeGrant, now), true);
assert.equal(
  canConsumeAiConsultingQuestion({ ...activeGrant, questionsUsed: 5 }, now),
  false,
  "exhausted grants must not consume another question",
);
assert.equal(
  canConsumeAiConsultingQuestion({ ...activeGrant, status: "revoked" }, now),
  false,
  "revoked grants must be blocked",
);
assert.equal(
  canConsumeAiConsultingQuestion(
    { ...activeGrant, expiresAt: "2026-09-08T05:59:59.000Z" },
    now,
  ),
  false,
  "expired grants must be blocked",
);

for (const scopeDecision of ["CLARIFY", "DENY", "SAFETY_REDIRECT"] as const) {
  assert.equal(
    shouldChargeAiConsultingQuestion({
      scopeDecision,
      answerCompleted: true,
      grant: activeGrant,
      now,
    }),
    false,
    `${scopeDecision} must never consume a paid question`,
  );
}

assert.equal(
  shouldChargeAiConsultingQuestion({
    scopeDecision: "ALLOW",
    answerCompleted: false,
    grant: activeGrant,
    now,
  }),
  false,
  "failed or incomplete AI responses must not consume a paid question",
);
assert.equal(
  shouldChargeAiConsultingQuestion({
    scopeDecision: "ALLOW",
    answerCompleted: true,
    grant: activeGrant,
    now,
  }),
  true,
  "only completed ALLOW responses may consume a paid question",
);

assert.equal(
  isAiConsultingMemoryUsableAsUserFact({
    kind: "life_event",
    provenance: "USER_STATED",
    status: "active",
  }),
  true,
);
assert.equal(
  isAiConsultingMemoryUsableAsUserFact({
    kind: "analysis_interpretation",
    provenance: "ANALYSIS_DERIVED",
    status: "active",
  }),
  false,
  "analysis interpretation must never be silently promoted to user fact",
);
assert.equal(
  isAiConsultingMemoryUsableAsUserFact({
    kind: "consultation_summary",
    provenance: "SYSTEM_SUMMARY",
    status: "active",
  }),
  false,
  "system summaries must not become objective user facts",
);

const grantBoundary = {
  userId: "user-1",
  profileId: "profile-1",
  baseProductId: "career-job-fit",
  analysisEditionKey: "LIFETIME",
};
assert.doesNotThrow(() =>
  assertSameConsultingBoundary({
    grant: grantBoundary,
    thread: { ...grantBoundary },
  }),
);

for (const mismatch of [
  { ...grantBoundary, userId: "user-2" },
  { ...grantBoundary, profileId: "profile-2" },
  { ...grantBoundary, baseProductId: "wealth-cashflow" },
  { ...grantBoundary, analysisEditionKey: "TARGET_YEAR:2027" },
]) {
  assert.throws(
    () =>
      assertSameConsultingBoundary({
        grant: grantBoundary,
        thread: mismatch,
      }),
    /AI_CONSULTING_BOUNDARY_MISMATCH/,
  );
}

console.log("AI consulting data model regression passed");
