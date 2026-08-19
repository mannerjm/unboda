import {
  parsePaidAnalysisDetailOutputV4,
  parsePaidAnalysisDetailOutputV3,
  parseStoredPaidAnalysisDetail,
} from "../app/lib/paidAnalysisDetailOutputParser";
import {
  isPaidAnalysisDetailV4,
  type PaidAnalysisDetailOutputV4,
} from "../app/lib/paidAnalysisDetailOutput";
import { validatePaidAnalysisConsistencyV4 } from "../app/lib/paidAnalysisConsistencyValidator";
import { buildPaidAnalysisDetailPromptV4 } from "../app/lib/paidAnalysisDetailPrompt";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function assertParseFails(value: unknown, message: string): void {
  let failed = false;
  try {
    parsePaidAnalysisDetailOutputV4(value);
  } catch {
    failed = true;
  }
  assert(failed, message);
}

function sentence(text: string): string {
  return `${text} 구체적인 조건과 기준을 함께 확인한다.`;
}

function buildValidV4(): Record<string, unknown> {
  return {
    schemaVersion: "v4",
    conclusion: {
      headline: "지금은 역할 범위를 조정할 시점",
      direction: "조정",
      focus: "현재 담당 업무 중 반복 소진 영역",
      rationale: sentence("현재 흐름에서 부담이 누적되는 구조가 확인된다."),
      immediateAction: sentence("이번 주 업무를 유형별로 분류해 기록한다."),
    },
    coreProblem: {
      title: "반복되는 역할 불일치",
      description: sentence("맡은 역할과 강점이 어긋나는 조건이 반복된다."),
      whyItMatters: sentence("지금 조정하지 않으면 같은 부담이 되풀이된다."),
    },
    cause: {
      summary: sentence("현재 구조에서 부담이 누적되는 경로가 있다."),
      reasons: [
        {
          title: "책임 확대 구조",
          observedStructure: sentence("책임을 맡는 힘이 강하게 나타난다."),
          realWorldPattern: sentence("요청을 우선 수용하는 패턴이 반복된다."),
          problemLinkage: sentence("그 결과 역할 범위가 넓어진다."),
        },
        {
          title: "회복 자원 부족",
          observedStructure: sentence("보완하는 기운이 약하게 나타난다."),
          realWorldPattern: sentence("휴식 시점을 뒤로 미루는 선택이 잦다."),
          problemLinkage: sentence("소진이 누적되어 판단이 느려진다."),
        },
        {
          title: "결정 지연 조건",
          observedStructure: sentence("현재 흐름에 변동 요소가 섞여 있다."),
          realWorldPattern: sentence("결론을 미루고 상황을 관망한다."),
          problemLinkage: sentence("문제 해결 시점이 계속 밀린다."),
        },
      ],
    },
    evidence: [
      {
        evidenceKey: "strength",
        meaning: sentence("책임을 감당하는 힘이 어느 정도인지 보여준다."),
        linkage: sentence("조정 방향을 선택한 직접 근거가 된다."),
      },
      {
        evidenceKey: "yongshin",
        meaning: sentence("지금 보완이 필요한 방향을 알려준다."),
        linkage: sentence("회복 자원 확보가 우선인 이유를 뒷받침한다."),
      },
      {
        evidenceKey: "fortune_flow",
        meaning: sentence("현재 기회와 주의의 균형을 보여준다."),
        linkage: sentence("확대가 아니라 조정을 택한 근거가 된다."),
      },
    ],
    current: {
      summary: sentence("지금은 기회와 부담이 함께 커지는 구간이다."),
      opportunities: [
        {
          situation: sentence("새로운 업무 요청이 늘어난다."),
          implication: sentence("선택권을 넓힐 기회가 된다."),
          observableSignal: sentence("요청 유형이 다양해지는지 확인한다."),
        },
        {
          situation: sentence("협업 범위가 확장된다."),
          implication: sentence("역할을 재정의할 여지가 생긴다."),
          observableSignal: sentence("회의 참여 범위 변화를 확인한다."),
        },
        {
          situation: sentence("평가 기준이 재정비된다."),
          implication: sentence("기여를 드러낼 통로가 생긴다."),
          observableSignal: sentence("평가 항목 변경 공지를 확인한다."),
        },
      ],
      cautions: [
        {
          situation: sentence("동시 진행 업무가 겹친다."),
          implication: sentence("우선순위가 무너질 위험이 있다."),
          observableSignal: sentence("마감 재조정 횟수를 확인한다."),
        },
        {
          situation: sentence("회복 시간이 줄어든다."),
          implication: sentence("판단 속도가 느려질 수 있다."),
          observableSignal: sentence("주중 휴식 시간을 확인한다."),
        },
        {
          situation: sentence("요청 경로가 분산된다."),
          implication: sentence("책임 경계가 흐려질 수 있다."),
          observableSignal: sentence("요청 채널 수를 확인한다."),
        },
      ],
    },
    timeline: [
      {
        label: "지금 이후 단기",
        changeSignal: sentence("업무 요청 유형이 달라진다."),
        preparation: sentence("현재 역할 기준을 문서로 정리한다."),
      },
      {
        label: "다음 전환 구간",
        changeSignal: sentence("역할 조정 논의가 열린다."),
        preparation: sentence("협상 기준 세 가지를 준비한다."),
      },
      {
        label: "중기",
        changeSignal: sentence("책임 범위가 다시 넓어질 수 있다."),
        preparation: sentence("수용 한도를 미리 정해 둔다."),
      },
      {
        label: "장기 준비",
        changeSignal: sentence("강점 영역의 비중이 달라진다."),
        preparation: sentence("반복 축적할 역량 하나를 정한다."),
      },
    ],
    action: [
      {
        action: "반복 소진 업무 유형을 기록한다",
        target: "최근 4주 업무 목록",
        condition: sentence("같은 유형이 3회 이상 반복되면 조정을 요청한다."),
        completionCriteria: sentence("유형별 분류표가 완성되면 종료한다."),
      },
      {
        action: "역할 기준을 문서로 정리한다",
        target: "현재 담당 업무 경계",
        condition: sentence("경계가 겹치는 항목이 있으면 우선 조정한다."),
        completionCriteria: sentence("합의된 기준 문서가 공유되면 종료한다."),
      },
    ],
    avoid: [
      {
        type: "misjudgment",
        behavior: sentence("문제의 원인을 조직 탓으로만 돌린다."),
        reason: sentence("조정 가능한 부분을 놓치게 된다."),
      },
      {
        type: "bad_condition",
        behavior: sentence("소진이 심한 상태에서 결론을 통보한다."),
        reason: sentence("되돌리기 어려운 선택으로 이어진다."),
      },
    ],
    confidence: {
      level: "중간",
      strongestEvidence: [
        sentence("책임 수용 구조는 계산 근거가 분명하다."),
        sentence("보완이 필요한 방향도 계산으로 확인된다."),
      ],
      uncertaintyFactors: [sentence("조직 상황은 입력에 포함되지 않는다.")],
      limitations: sentence("구체적인 시점은 이 입력만으로 확정할 수 없다."),
    },
  };
}

// 1. valid fixture parses
const valid = buildValidV4();
const parsed: PaidAnalysisDetailOutputV4 =
  parsePaidAnalysisDetailOutputV4(valid);
assert(parsed.schemaVersion === "v4", "valid V4 fixture must parse");
assert(parsed.conclusion.direction === "조정", "direction must round-trip");

// 2. invalid direction fails
assertParseFails(
  { ...buildValidV4(), conclusion: { ...valid.conclusion as object, direction: "expand" } },
  "invalid conclusion.direction must be rejected",
);

// 3. action with 1 item fails
assertParseFails(
  { ...buildValidV4(), action: (buildValidV4().action as unknown[]).slice(0, 1) },
  "action with fewer than 2 items must be rejected",
);

// 4. action with 4 items fails
const fourActions = buildValidV4().action as unknown[];
assertParseFails(
  { ...buildValidV4(), action: [...fourActions, ...fourActions] },
  "action with more than 3 items must be rejected",
);

// 5. avoid with 1 item fails
assertParseFails(
  { ...buildValidV4(), avoid: (buildValidV4().avoid as unknown[]).slice(0, 1) },
  "avoid with fewer than 2 items must be rejected",
);

// 6. evidence with 2 items fails
assertParseFails(
  { ...buildValidV4(), evidence: (buildValidV4().evidence as unknown[]).slice(0, 2) },
  "evidence with fewer than 3 items must be rejected",
);

// 7. evidence with 5 items fails
const evidenceItems = buildValidV4().evidence as unknown[];
assertParseFails(
  {
    ...buildValidV4(),
    evidence: [...evidenceItems, ...evidenceItems.slice(0, 2)],
  },
  "evidence with more than 4 items must be rejected",
);

// 7b. unknown evidenceKey fails
assertParseFails(
  {
    ...buildValidV4(),
    evidence: [
      ...evidenceItems.slice(0, 2),
      { evidenceKey: "ten_god", meaning: sentence("x"), linkage: sentence("y") },
    ],
  },
  "evidenceKey outside the allowed list must be rejected",
);

// 8. timeline with 3 items fails
assertParseFails(
  { ...buildValidV4(), timeline: (buildValidV4().timeline as unknown[]).slice(0, 3) },
  "timeline with fewer than 4 items must be rejected",
);

// 9. decisionCheck omitted parses
assert(
  parsePaidAnalysisDetailOutputV4(buildValidV4()).decisionCheck === undefined,
  "decisionCheck must be optional",
);

// 9b. decisionCheck with 3 items parses
assert(
  parsePaidAnalysisDetailOutputV4({
    ...buildValidV4(),
    decisionCheck: [
      sentence("이 결정을 되돌릴 수 있는가?"),
      sentence("판단 기준이 두 개 이상 충족되었는가?"),
      sentence("실행 시점을 나눌 여지가 있는가?"),
    ],
  }).decisionCheck?.length === 3,
  "decisionCheck with 3 items must parse",
);

// 10. decisionCheck with 2 items fails
assertParseFails(
  {
    ...buildValidV4(),
    decisionCheck: [sentence("질문 하나"), sentence("질문 둘")],
  },
  "decisionCheck with fewer than 3 items must be rejected",
);

// 11. legacy V3 fixture still parses and routes through the stored reader
const legacyV3 = {
  heroSummary: { headline: "h", subheadline: "s", keyMessage: "k" },
  decisionAnchor: {
    direction: "조정",
    focus: "현재 흐름",
    rationale: sentence("조정이 필요한 이유."),
  },
  causeAnalysis: { summary: "s", reasons: ["r1", "r2", "r3"] },
  fortuneStructure: {
    summary: "s",
    items: [
      { label: "l", value: "v", interpretation: "i" },
      { label: "l", value: "v", interpretation: "i" },
      { label: "l", value: "v", interpretation: "i" },
    ],
  },
  currentSituation: {
    summary: "s",
    opportunities: ["o1", "o2", "o3"],
    cautions: ["c1", "c2", "c3"],
  },
  futureTimeline: [
    { period: "p1", title: "t", description: "d" },
    { period: "p2", title: "t", description: "d" },
    { period: "p3", title: "t", description: "d" },
    { period: "p4", title: "t", description: "d" },
  ],
  actionGuide: [sentence("행동 하나."), sentence("행동 둘.")],
  avoidGuide: [
    sentence("피할 것 하나."),
    sentence("피할 것 둘."),
    sentence("피할 것 셋."),
    sentence("피할 것 넷."),
  ],
  coachMessage: { title: "t", message: "m" },
  checklist: ["c1", "c2", "c3", "c4", "c5"],
  recommendations: [],
  aiInsight: {
    headline: sentence("핵심 통찰."),
    explanation: sentence("핵심 통찰을 뒷받침하는 근거와 현실 의미를 연결한다."),
  },
  pastPattern: {
    summary: sentence("반복 패턴 구조 요약."),
    periods: [
      {
        period: "과거 구간",
        pattern: sentence("그 시기에 반복되었을 가능성이 있는 패턴."),
        verificationQuestion: sentence("당시 상황을 확인할 질문."),
      },
    ],
  },
  currentCoreProblem: {
    title: "핵심 문제",
    description: sentence("현재 문제의 조건과 신호."),
    whyItMatters: sentence("지금 다뤄야 하는 이유."),
  },
  confidence: {
    level: "중간",
    strongestEvidence: [sentence("근거 하나."), sentence("근거 둘.")],
    uncertaintyFactors: [sentence("불확실 요인.")],
    limitations: sentence("판단할 수 없는 범위를 설명한다."),
  },
};

parsePaidAnalysisDetailOutputV3(legacyV3);
const storedLegacy = parseStoredPaidAnalysisDetail(legacyV3);
assert(!isPaidAnalysisDetailV4(storedLegacy), "legacy V3 must not be read as V4");

const storedV4 = parseStoredPaidAnalysisDetail({
  ...buildValidV4(),
  // Stored reports always carry the server-resolved fact.
  evidence: (buildValidV4().evidence as Record<string, unknown>[]).map(
    (item) => ({ ...item, label: "근거", fact: "결정론 계산 값" }),
  ),
});
assert(isPaidAnalysisDetailV4(storedV4), "V4 payload must be read as V4");

let unresolvedStoredRejected = false;
try {
  parseStoredPaidAnalysisDetail(buildValidV4());
} catch {
  unresolvedStoredRejected = true;
}
assert(
  unresolvedStoredRejected,
  "unresolved V4 evidence must not be accepted as a stored report",
);

// 12. fields dropped from V4 are not required
const v4Keys = Object.keys(buildValidV4());
for (const removedField of [
  "coachMessage",
  "recommendations",
  "aiInsight",
  "pastPattern",
]) {
  assert(
    !v4Keys.includes(removedField),
    `${removedField} must not be part of the V4 contract`,
  );
}

// 13. consistency validator reads the new conclusion path
assert(
  validatePaidAnalysisConsistencyV4(parsed).ok,
  "valid V4 fixture must pass consistency validation",
);

const contradictory = parsePaidAnalysisDetailOutputV4({
  ...buildValidV4(),
  conclusion: {
    ...(buildValidV4().conclusion as Record<string, unknown>),
    direction: "보류",
    immediateAction: sentence("지금 즉시 실행하여 사업을 확대한다."),
  },
});

const contradictoryResult = validatePaidAnalysisConsistencyV4(contradictory);
assert(!contradictoryResult.ok, "보류 + 확대 표현은 일관성 검증에서 실패해야 한다");
assert(
  contradictoryResult.issues.some(
    (issue) => issue.field === "conclusion.direction",
  ),
  "consistency issue must point at conclusion.direction",
);

// 14. V4 prompt requests the new contract and restricts evidence keys
const prompt = buildPaidAnalysisDetailPromptV4({
  analysisType: "직업운 심층 분석",
  productId: "career",
  birthData: "birth",
  originalChart: "chart",
  coreInterpretation: "core",
  fortuneTiming: "timing",
  sajuSummary: "summary",
  currentFortuneFlow: "flow",
});

assert(prompt.includes('"schemaVersion": "v4"'), "prompt must request schemaVersion v4");
for (const field of [
  '"conclusion"',
  '"coreProblem"',
  '"cause"',
  '"evidence"',
  '"current"',
  '"timeline"',
  '"action"',
  '"avoid"',
  '"confidence"',
]) {
  assert(prompt.includes(field), `prompt must request ${field}`);
}
assert(!prompt.includes('"coachMessage"'), "prompt must not request coachMessage");
assert(!prompt.includes('"recommendations"'), "prompt must not request recommendations");
assert(!prompt.includes('"aiInsight"'), "prompt must not request aiInsight");
assert(!prompt.includes('"pastPattern"'), "prompt must not request pastPattern");
assert(
  !prompt.includes("elementRelations") && !prompt.includes("fortuneBrain"),
  "prompt must not reference facts that are not passed in yet",
);
assert(
  prompt.includes("immediateAction") &&
    prompt.includes("completionCriteria") &&
    prompt.includes("observableSignal"),
  "prompt must require the structured contract fields",
);
assert(
  prompt.includes("label에 연도, 월, 날짜를 절대 쓰지 않는다"),
  "TOPIC prompt must forbid concrete dates in the timeline",
);

const periodPrompt = buildPaidAnalysisDetailPromptV4({
  analysisType: "대운 · 10년 흐름",
  productId: "daeun-current",
  birthData: "birth",
  originalChart: "chart",
  coreInterpretation: "core",
  fortuneTiming: "timing",
  sajuSummary: "summary",
  currentFortuneFlow: "flow",
});

assert(
  periodPrompt.includes("현재 대운의 진입 국면"),
  "PERIOD prompt must keep the strategy timeline labels",
);

// action.action minimum length stays at 5; the fix belongs in the prompt, not the parser.
assertParseFails(
  {
    ...buildValidV4(),
    action: [
      {
        action: "분류",
        target: "대상",
        condition: sentence("조건."),
        completionCriteria: sentence("완료 기준."),
      },
      ...(buildValidV4().action as unknown[]).slice(1),
    ],
  },
  "action.action shorter than 5 characters must be rejected",
);

assert(
  readFileSync(
    join(process.cwd(), "app/lib/paidAnalysisDetailOutputParser.ts"),
    "utf8",
  ).includes("action: z.string().trim().min(5)"),
  "action.action must keep the min(5) rule",
);

console.log("paid-analysis-v4-contract-regression passed ✓");
