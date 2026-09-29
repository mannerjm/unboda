import {
  generatePaidAnalysisDetailV4WithConsistencyRetry,
  isRetryablePaidAnalysisV4ConsistencyError,
  PAID_ANALYSIS_V4_CONSISTENCY_RETRY_LIMIT,
} from "../app/lib/paidAnalysisV4ConsistencyRetry";
import { getPaidAnalysisEngineRules } from "../app/lib/paidAnalysisEngine";
import { validatePaidAnalysisConsistencyV4 } from "../app/lib/paidAnalysisConsistencyValidator";
import type { ResolvedPaidAnalysisDetailV4 } from "../app/lib/paidAnalysisDetailOutput";
import type { PaidAnalysisDetailPromptInput } from "../app/lib/paidAnalysisDetailPrompt";
import type { PaidAnalysisResponseTelemetry } from "../app/lib/ai/generateAnalysisText";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

const input: PaidAnalysisDetailPromptInput = {
  productId: "money-income-stability",
  analysisType: "수입 안정성 분석",
  birthData: "synthetic",
  originalChart: "synthetic",
  coreInterpretation: "synthetic",
  fortuneTiming: "synthetic",
  sajuSummary: "synthetic",
  currentFortuneFlow: "synthetic",
};

const firstTelemetry: PaidAnalysisResponseTelemetry = {
  status: "completed",
  incompleteReason: null,
  inputTokens: 100,
  outputTokens: 40,
  reasoningTokens: 5,
  responseIdPresent: true,
  durationMs: 1000,
};

const secondTelemetry: PaidAnalysisResponseTelemetry = {
  status: "completed",
  incompleteReason: null,
  inputTokens: 110,
  outputTokens: 50,
  reasoningTokens: 6,
  responseIdPresent: true,
  durationMs: 1200,
};

const consistencyError = () =>
  new Error(
    "심층 분석 결과의 섹션 간 일관성 검증에 실패했습니다. conclusion.direction: synthetic conflict",
  );

async function main(): Promise<void> {
  assert(
    PAID_ANALYSIS_V4_CONSISTENCY_RETRY_LIMIT === 1,
    "V4 consistency regeneration must remain capped at one retry",
  );
  assert(
    isRetryablePaidAnalysisV4ConsistencyError(consistencyError()),
    "the exact V4 consistency failure must be retryable",
  );
  assert(
    !isRetryablePaidAnalysisV4ConsistencyError(
      new Error("심층 분석 결과의 Self Review에 실패했습니다."),
    ),
    "self-review failures must never trigger consistency regeneration",
  );
  assert(
    !isRetryablePaidAnalysisV4ConsistencyError(
      new Error("건강운 V4 심층 분석 결과의 안전 검증에 실패했습니다."),
    ),
    "health-safety failures must never trigger consistency regeneration",
  );

  const truncatedCopyResult = validatePaidAnalysisConsistencyV4({
    conclusion: {
      headline: "완결된 결론입니다.",
      direction: "유지",
      focus: "현재 기준",
      rationale: "현재 기준을 유지해야 하는 이유를 설명합니다.",
      immediateAction: "기준을 먼저 확인합니다.",
    },
    coreProblem: {
      title: "핵심 문제",
      description: "현재 확인할 문제를 설명합니다.",
      whyItMatters: "판단 기준에 영향을 주기 때문입니다.",
    },
    cause: { summary: "원인을 설명합니다.", reasons: [] },
    evidence: [],
    current: { summary: "현재 흐름을 설명합니다.", opportunities: [], cautions: [] },
    timeline: [
      {
        label: "다음 단계",
        changeSignal: "생활 흐름이 달라지는 신호를 확인하다가…",
        preparation: "기준을 정리합니다.",
      },
    ],
    action: [],
    avoid: [],
    confidence: {
      level: "중간",
      strongestEvidence: [],
      uncertaintyFactors: [],
      limitations: "해석의 한계를 설명합니다.",
    },
    schemaVersion: "v4",
  });
  assert(
    !truncatedCopyResult.ok
      && truncatedCopyResult.issues.some((issue) => issue.field === "timeline[0].changeSignal"),
    "V4 ellipsis-ended customer copy must fail consistency validation and enter the bounded retry path",
  );

  for (const engine of [
    "CAREER",
    "MONEY",
    "RELATIONSHIP",
    "HEALTH",
    "STUDY",
    "BUSINESS",
    "PERIOD",
  ] as const) {
    const rules = getPaidAnalysisEngineRules(engine);
    assert(
      rules.includes("[결론-행동 일관성 규칙]"),
      `${engine} V4 prompt rules must include direction-action consistency guidance`,
    );
    assert(
      rules.includes('direction이 "보류"'),
      `${engine} V4 prompt rules must explicitly protect hold-direction actions`,
    );
    assert(
      rules.includes('direction이 "확대"'),
      `${engine} V4 prompt rules must explicitly protect expand-direction actions`,
    );
  }

  let retryCalls = 0;
  const mergedTelemetryEvents: PaidAnalysisResponseTelemetry[] = [];
  const sentinel = {} as ResolvedPaidAnalysisDetailV4;

  const result = await generatePaidAnalysisDetailV4WithConsistencyRetry(input, {
    generator: async (_input, options) => {
      retryCalls += 1;
      if (retryCalls === 1) {
        options?.onResponseTelemetry?.(firstTelemetry);
        throw consistencyError();
      }

      options?.onResponseTelemetry?.(secondTelemetry);
      return sentinel;
    },
    onResponseTelemetry: (telemetry) => {
      mergedTelemetryEvents.push(telemetry);
    },
  });

  assert(result === sentinel, "the successful regenerated V4 result must be returned");
  assert(retryCalls === 2, "one consistency failure must cause exactly one regeneration");
  const successfulTelemetry = mergedTelemetryEvents.at(-1);
  if (!successfulTelemetry) {
    throw new Error("FAIL: telemetry must be emitted after regeneration");
  }
  assert(successfulTelemetry.inputTokens === 210, "input token usage must include both model calls");
  assert(successfulTelemetry.outputTokens === 90, "output token usage must include both model calls");
  assert(successfulTelemetry.reasoningTokens === 11, "reasoning token usage must include both model calls");
  assert(successfulTelemetry.durationMs === 2200, "duration telemetry must include both model calls");

  let nonConsistencyCalls = 0;
  let nonConsistencyThrown = false;
  try {
    await generatePaidAnalysisDetailV4WithConsistencyRetry(input, {
      generator: async (_input, options) => {
        nonConsistencyCalls += 1;
        options?.onResponseTelemetry?.(firstTelemetry);
        throw new Error("심층 분석 결과의 Self Review에 실패했습니다.");
      },
    });
  } catch {
    nonConsistencyThrown = true;
  }
  assert(nonConsistencyThrown, "non-consistency failures must still be surfaced");
  assert(nonConsistencyCalls === 1, "non-consistency failures must not be regenerated");

  let repeatedConsistencyCalls = 0;
  let repeatedConsistencyThrown = false;
  try {
    await generatePaidAnalysisDetailV4WithConsistencyRetry(input, {
      generator: async (_input, options) => {
        repeatedConsistencyCalls += 1;
        options?.onResponseTelemetry?.(
          repeatedConsistencyCalls === 1 ? firstTelemetry : secondTelemetry,
        );
        throw consistencyError();
      },
    });
  } catch {
    repeatedConsistencyThrown = true;
  }
  assert(repeatedConsistencyThrown, "a second consistency failure must be surfaced");
  assert(repeatedConsistencyCalls === 2, "consistency regeneration must stop after one retry");

  console.log("PASS: V4 consistency regeneration is bounded, selective, and telemetry-safe");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
