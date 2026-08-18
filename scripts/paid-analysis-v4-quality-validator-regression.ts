import {
  reviewEvidenceLinkage,
  validateActionStructure,
  validateMoneySafety,
  validateTopicTimelineDates,
} from "../app/lib/paidAnalysisV4QualityValidators";
import type {
  PaidAnalysisDetailOutputV4,
  ResolvedPaidAnalysisDetailV4,
} from "../app/lib/paidAnalysisDetailOutput";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function sentence(text: string): string {
  return `${text} 구체적인 조건과 기준을 함께 확인한다.`;
}

function buildV4(
  overrides: Partial<PaidAnalysisDetailOutputV4> = {},
): PaidAnalysisDetailOutputV4 {
  return {
    schemaVersion: "v4",
    conclusion: {
      headline: "지금은 역할 범위를 조정할 시점",
      direction: "조정",
      focus: "현재 담당 업무",
      rationale: sentence("부담이 누적되는 구조가 확인된다."),
      immediateAction: sentence("업무를 유형별로 기록한다."),
    },
    coreProblem: {
      title: "반복되는 역할 불일치",
      description: sentence("역할과 강점이 어긋난다."),
      whyItMatters: sentence("지금 조정하지 않으면 반복된다."),
    },
    cause: {
      summary: sentence("부담이 누적되는 경로가 있다."),
      reasons: [1, 2, 3].map((index) => ({
        title: `원인 ${index}`,
        observedStructure: sentence(`구조 ${index}.`),
        realWorldPattern: sentence(`패턴 ${index}.`),
        problemLinkage: sentence(`연결 ${index}.`),
      })),
    },
    evidence: [
      {
        evidenceKey: "strength",
        meaning: sentence("책임 수용력을 보여준다."),
        linkage: sentence("현재 담당 업무 판단의 근거가 된다."),
      },
      {
        evidenceKey: "yongshin",
        meaning: sentence("보완 방향을 알려준다."),
        linkage: sentence("조정 방향을 뒷받침한다."),
      },
      {
        evidenceKey: "fortune_flow",
        meaning: sentence("기회와 주의의 균형을 보여준다."),
        linkage: sentence("조정 판단으로 이어진다."),
      },
    ],
    current: {
      summary: sentence("기회와 부담이 함께 커진다."),
      opportunities: [1, 2, 3].map((index) => ({
        situation: sentence(`기회 상황 ${index}.`),
        implication: sentence(`기회 의미 ${index}.`),
        observableSignal: sentence(`기회 신호 ${index}.`),
      })),
      cautions: [1, 2, 3].map((index) => ({
        situation: sentence(`주의 상황 ${index}.`),
        implication: sentence(`주의 의미 ${index}.`),
        observableSignal: sentence(`주의 신호 ${index}.`),
      })),
    },
    timeline: ["지금 이후 단기", "다음 전환 구간", "중기", "장기 준비"].map(
      (label) => ({
        label,
        changeSignal: sentence(`${label} 변화 신호.`),
        preparation: sentence(`${label} 준비.`),
      }),
    ),
    action: [1, 2].map((index) => ({
      action: `업무 유형을 기록한다 ${index}`,
      target: `대상 ${index}`,
      condition: sentence(`조건 ${index}.`),
      completionCriteria: sentence(`완료 기준 ${index}.`),
    })),
    avoid: [
      {
        type: "misjudgment",
        behavior: sentence("원인을 조직 탓으로만 돌린다."),
        reason: sentence("조정 가능한 부분을 놓친다."),
      },
      {
        type: "bad_condition",
        behavior: sentence("소진 상태에서 통보한다."),
        reason: sentence("되돌리기 어려운 선택이 된다."),
      },
    ],
    confidence: {
      level: "중간",
      strongestEvidence: [sentence("근거 하나."), sentence("근거 둘.")],
      uncertaintyFactors: [sentence("불확실 요인.")],
      limitations: sentence("판단할 수 없는 범위를 설명한다."),
    },
    ...overrides,
  };
}

// --- TOPIC timeline date validator ---

assert(
  validateTopicTimelineDates(buildV4(), "career").ok,
  "relative timeline labels must pass for TOPIC products",
);

const withYear = buildV4({
  timeline: [
    {
      label: "2026년 10월",
      changeSignal: sentence("변화 신호."),
      preparation: sentence("준비."),
    },
    ...buildV4().timeline.slice(1),
  ],
});

assert(
  !validateTopicTimelineDates(withYear, "career").ok,
  "2026년 10월 must fail for TOPIC products",
);

const withMonth = buildV4({
  timeline: [
    {
      label: "10월",
      changeSignal: sentence("변화 신호."),
      preparation: sentence("준비."),
    },
    ...buildV4().timeline.slice(1),
  ],
});

assert(
  !validateTopicTimelineDates(withMonth, "career").ok,
  "10월 must fail for TOPIC products",
);

const withDateInBody = buildV4({
  timeline: [
    {
      label: "다음 전환 구간",
      changeSignal: "2027년 상반기에 변화가 나타난다는 신호를 확인한다.",
      preparation: sentence("준비."),
    },
    ...buildV4().timeline.slice(1),
  ],
});

assert(
  !validateTopicTimelineDates(withDateInBody, "career").ok,
  "concrete years inside changeSignal must fail for TOPIC products",
);

// PERIOD products may name real periods.
assert(
  validateTopicTimelineDates(withYear, "daeun-current").ok,
  "PERIOD products must be exempt from the date rule",
);
assert(
  validateTopicTimelineDates(withMonth, "annual-current").ok,
  "PERIOD products must be exempt from the date rule",
);

// No false positives on ordinary Korean copy.
const ordinaryCopy = buildV4({
  timeline: [
    {
      label: "다음 전환 구간",
      changeSignal: sentence("요청 유형이 달라지는 신호를 확인한다."),
      preparation: sentence("판단 기준 세 가지를 준비한다."),
    },
    ...buildV4().timeline.slice(1),
  ],
});

assert(
  validateTopicTimelineDates(ordinaryCopy, "career").ok,
  "ordinary copy must not trigger the date validator",
);

// --- action structure validator ---

assert(
  validateActionStructure(buildV4()).ok,
  "structured actions must pass",
);

for (const phrase of [
  "노력하세요",
  "소통하세요",
  "건강을 챙기세요",
  "무리하지 마세요",
  "꾸준히 하세요",
]) {
  const weak = buildV4({
    action: [
      {
        action: phrase,
        target: "대상",
        condition: sentence("조건."),
        completionCriteria: sentence("완료 기준."),
      },
      ...buildV4().action.slice(1),
    ],
  });

  assert(
    !validateActionStructure(weak).ok,
    `generic advice (${phrase}) must fail the action validator`,
  );
}

// --- MONEY safety validator ---

assert(validateMoneySafety(buildV4()).ok, "neutral money copy must pass");

const budgetingCopy = buildV4({
  action: [
    {
      action: "지출을 항목별로 기록한다",
      target: "최근 3개월 지출",
      condition: sentence("회수 불가 지출이 늘면 한도를 낮춘다."),
      completionCriteria: sentence("분류표가 완성되면 종료한다."),
    },
    ...buildV4().action.slice(1),
  ],
});

assert(
  validateMoneySafety(budgetingCopy).ok,
  "budgeting guidance must remain allowed",
);

const unsafeSamples: [string, PaidAnalysisDetailOutputV4][] = [
  [
    "매수 지시",
    buildV4({
      action: [
        {
          action: "지금 매수한다",
          target: "보유 자산",
          condition: sentence("조건."),
          completionCriteria: sentence("완료 기준."),
        },
        ...buildV4().action.slice(1),
      ],
    }),
  ],
  [
    "수익률",
    buildV4({
      conclusion: {
        ...buildV4().conclusion,
        rationale: "예상 수익률이 높아지는 구간이므로 확대가 필요하다고 본다.",
      },
    }),
  ],
  [
    "종목 지목",
    buildV4({
      coreProblem: {
        ...buildV4().coreProblem,
        description: "주식 비중이 커지면서 손실이 반복되는 조건이 만들어진다.",
      },
    }),
  ],
  [
    "구체 금액",
    buildV4({
      action: [
        {
          action: "매달 500만원을 넣는다",
          target: "적립 계좌",
          condition: sentence("조건."),
          completionCriteria: sentence("완료 기준."),
        },
        ...buildV4().action.slice(1),
      ],
    }),
  ],
];

for (const [label, sample] of unsafeSamples) {
  assert(
    !validateMoneySafety(sample).ok,
    `${label} must fail the money safety validator`,
  );
}

// --- evidence linkage review (warning only) ---

const resolved = {
  ...buildV4(),
  evidence: buildV4().evidence.map((item) => ({
    ...item,
    label: "근거",
    fact: "결정론 계산 값",
  })),
} as ResolvedPaidAnalysisDetailV4;

assert(
  reviewEvidenceLinkage(resolved).length === 0,
  "linkage mentioning the focus must produce no warning",
);

const weakLinkage = {
  ...resolved,
  evidence: resolved.evidence.map((item) => ({
    ...item,
    linkage: "전반적인 흐름을 보여준다.",
  })),
} as ResolvedPaidAnalysisDetailV4;

assert(
  reviewEvidenceLinkage(weakLinkage).length === 3,
  "linkage without direction or focus must produce warnings",
);

// Linkage warnings must never carry report text into the logs.
const serviceSource = readFileSync(
  join(process.cwd(), "app/lib/paidAnalysisDetailService.ts"),
  "utf8",
);

const warnCallMatch = serviceSource.match(
  /console\.warn\("\[paid-analysis-detail-v4\] evidence-linkage-warning",\s*\{[\s\S]*?\}\s*\);/,
);

assert(Boolean(warnCallMatch), "linkage warning log call must exist");

const warnCall = warnCallMatch![0];
// Only the logged payload matters; the log label itself may mention linkage.
const warnPayload = warnCall.slice(warnCall.indexOf("{"));

for (const forbidden of [
  "warning.message",
  ".linkage",
  ".fact",
  ".meaning",
  "detail.",
  "responseText",
  "prompt",
  "birthData",
  "saju",
  "evidenceFacts",
]) {
  assert(
    !warnPayload.includes(forbidden),
    `linkage warning log must not include ${forbidden}`,
  );
}

for (const allowed of ["productId", "warningCount", "warning.field"]) {
  assert(
    warnPayload.includes(allowed),
    `linkage warning log should report ${allowed}`,
  );
}

console.log("paid-analysis-v4-quality-validator-regression passed ✓");
