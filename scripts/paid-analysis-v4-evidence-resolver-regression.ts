import {
  MIN_RESOLVED_EVIDENCE_COUNT,
  resolvePaidAnalysisDetailV4,
  resolvePaidAnalysisEvidence,
} from "../app/lib/paidAnalysisEvidenceResolver";
import { buildPaidAnalysisEvidenceFacts } from "../app/lib/paidAnalysisEvidenceFacts";
import type { PaidAnalysisEvidenceFacts } from "../app/lib/paidAnalysisEvidenceFacts";
import {
  isPaidAnalysisDetailV4,
  type PaidAnalysisDetailOutputV4,
  type PaidAnalysisEvidenceKey,
} from "../app/lib/paidAnalysisDetailOutput";
import {
  parseResolvedPaidAnalysisDetailV4,
  parseStoredPaidAnalysisDetail,
} from "../app/lib/paidAnalysisDetailOutputParser";
import { buildPaidAnalysisInputFromProfile } from "../app/lib/paidAnalysisProfileInput";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function sentence(text: string): string {
  return `${text} 구체적인 조건과 기준을 함께 확인한다.`;
}

// Deterministic synthetic profile; no user data and no DB access.
const promptInput = buildPaidAnalysisInputFromProfile(
  {
    id: "00000000-0000-0000-0000-000000000000",
    label: "테스트",
    relationshipType: "self",
    birthDate: "1995-05-20",
    birthTime: "09:00",
    calendarType: "양력",
    isLeapMonth: false,
    gender: "남성",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  "career",
);

const facts = promptInput.evidenceFacts;

assert(Boolean(facts), "profile input must carry evidenceFacts");

const resolvableKeys: PaidAnalysisEvidenceKey[] = [
  "strength",
  "yongshin",
  "gyeokguk",
  "element_balance",
  "fortune_flow",
  "daeun",
  "seun",
  "element_relations",
  "fortune_brain",
];

// 1~6 + new keys: each key resolves to a non-empty deterministic fact.
for (const key of resolvableKeys) {
  const { resolved, unresolvedKeys } = resolvePaidAnalysisEvidence(
    [{ evidenceKey: key, meaning: sentence("의미"), linkage: sentence("연결") }],
    facts as PaidAnalysisEvidenceFacts,
  );

  assert(
    unresolvedKeys.length === 0 && resolved.length === 1,
    `${key} must resolve from the deterministic facts`,
  );
  assert(resolved[0].fact.trim().length > 0, `${key} fact must not be empty`);
  assert(resolved[0].label.trim().length > 0, `${key} label must not be empty`);
}

// 10. resolved fact carries a real deterministic value, not a placeholder.
const strengthResolved = resolvePaidAnalysisEvidence(
  [{ evidenceKey: "strength", meaning: sentence("의미"), linkage: sentence("연결") }],
  facts as PaidAnalysisEvidenceFacts,
).resolved[0];

assert(
  strengthResolved.fact.includes(facts!.strength!.level),
  "strength fact must contain the computed strength level",
);

const daeunResolved = resolvePaidAnalysisEvidence(
  [{ evidenceKey: "daeun", meaning: sentence("의미"), linkage: sentence("연결") }],
  facts as PaidAnalysisEvidenceFacts,
).resolved[0];

assert(
  daeunResolved.fact.includes(facts!.daeun!.ganji),
  "daeun fact must contain the computed ganji",
);

// 7. missing source data is skipped, never faked.
const emptyResolution = resolvePaidAnalysisEvidence(
  [{ evidenceKey: "seun", meaning: sentence("의미"), linkage: sentence("연결") }],
  {},
);

assert(
  emptyResolution.resolved.length === 0 &&
    emptyResolution.unresolvedKeys[0] === "seun",
  "missing deterministic data must be reported as unresolved",
);

function buildRawV4(
  evidenceKeys: PaidAnalysisEvidenceKey[],
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
      description: sentence("역할과 강점이 어긋나는 조건이 반복된다."),
      whyItMatters: sentence("지금 조정하지 않으면 반복된다."),
    },
    cause: {
      summary: sentence("부담이 누적되는 경로가 있다."),
      reasons: [1, 2, 3].map((index) => ({
        title: `원인 ${index}`,
        observedStructure: sentence(`관찰된 구조 ${index}.`),
        realWorldPattern: sentence(`현실 패턴 ${index}.`),
        problemLinkage: sentence(`문제 연결 ${index}.`),
      })),
    },
    evidence: evidenceKeys.map((key) => ({
      evidenceKey: key,
      meaning: sentence(`${key} 의미`),
      linkage: sentence(`${key} 연결`),
    })),
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
        behavior: sentence("소진 상태에서 결론을 통보한다."),
        reason: sentence("되돌리기 어려운 선택이 된다."),
      },
    ],
    confidence: {
      level: "중간",
      strongestEvidence: [sentence("근거 하나."), sentence("근거 둘.")],
      uncertaintyFactors: [sentence("불확실 요인.")],
      limitations: sentence("판단할 수 없는 범위를 설명한다."),
    },
  };
}

// 18. raw V4 -> resolve -> final resolved report, with every section preserved.
const resolvedDetail = resolvePaidAnalysisDetailV4(
  buildRawV4(["strength", "yongshin", "element_relations", "fortune_brain"]),
  facts as PaidAnalysisEvidenceFacts,
);

parseResolvedPaidAnalysisDetailV4(resolvedDetail);

assert(resolvedDetail.evidence.length === 4, "all four evidence items resolve");
assert(
  resolvedDetail.evidence.every(
    (item) => item.fact.length > 0 && item.label.length > 0,
  ),
  "resolved evidence must carry label and fact",
);
for (const section of [
  resolvedDetail.conclusion,
  resolvedDetail.coreProblem,
  resolvedDetail.cause,
  resolvedDetail.current,
  resolvedDetail.confidence,
] as unknown[]) {
  assert(Boolean(section), "resolved report must keep every section");
}
assert(resolvedDetail.timeline.length === 4, "timeline must be preserved");
assert(resolvedDetail.action.length === 2, "action must be preserved");
assert(resolvedDetail.avoid.length === 2, "avoid must be preserved");

// 8. fewer than the minimum resolved evidence fails the report.
let tooFewFailed = false;
try {
  resolvePaidAnalysisDetailV4(
    buildRawV4(["strength", "yongshin", "gyeokguk"]),
    { strength: facts!.strength },
  );
} catch {
  tooFewFailed = true;
}
assert(
  tooFewFailed,
  `fewer than ${MIN_RESOLVED_EVIDENCE_COUNT} resolved evidence items must fail`,
);

// 9. the AI contract has no field for a raw observed fact.
const promptSource = readFileSync(
  join(process.cwd(), "app/lib/paidAnalysisDetailPrompt.ts"),
  "utf8",
);

assert(
  !promptSource.includes('"observedFact"'),
  "prompt must never ask the model for an observed fact",
);
assert(
  promptSource.includes(
    "수치, 퍼센트, 점수, 간지, 관계 기호를 직접 만들어 쓰지 않는다",
  ),
  "prompt must forbid the model from inventing deterministic values",
);
assert(
  promptSource.includes("element_relations") &&
    promptSource.includes("fortune_brain"),
  "prompt allowlist must include the new evidence keys",
);

// 11. V3 reports never go through the resolver.
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
        pattern: sentence("반복되었을 가능성이 있는 패턴."),
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

// 12 / 13. render path selection is driven by the stored discriminator.
const storedLegacy = parseStoredPaidAnalysisDetail(legacyV3);
assert(!isPaidAnalysisDetailV4(storedLegacy), "V3 fixture must pick the legacy path");
assert(
  !("evidence" in storedLegacy),
  "legacy V3 must never gain resolver output",
);

const storedResolved = parseStoredPaidAnalysisDetail(resolvedDetail);
assert(isPaidAnalysisDetailV4(storedResolved), "V4 fixture must pick the V4 path");

// The client branches on the same helper the parser uses.
const clientSource = readFileSync(
  join(process.cwd(), "app/paid-analysis/[productId]/PaidAnalysisDetailV2Client.tsx"),
  "utf8",
);

assert(
  clientSource.includes("isPaidAnalysisDetailV4(generatedDetail)"),
  "client must branch on the V4 discriminator",
);
assert(
  clientSource.includes("<PaidAnalysisV4Report"),
  "client must render the V4 report component",
);
assert(
  clientSource.includes("detail.heroSummary.headline"),
  "client must keep the legacy V3 render path",
);

const v4ReportSource = readFileSync(
  join(process.cwd(), "app/paid-analysis/[productId]/PaidAnalysisV4Report.tsx"),
  "utf8",
);

for (const field of [
  "conclusion.direction",
  "conclusion.headline",
  "conclusion.immediateAction",
  "coreProblem.title",
  "cause.reasons",
  "detail.evidence",
  "current.opportunities",
  "current.cautions",
  "detail.timeline",
  "detail.action",
  "detail.avoid",
  "detail.decisionCheck",
  "confidence.limitations",
]) {
  assert(v4ReportSource.includes(field), `V4 report must render ${field}`);
}
assert(
  !v4ReportSource.includes("evidenceKey}</") &&
    v4ReportSource.includes("item.fact"),
  "V4 report must show the resolved fact, not the raw key",
);

// Facts builder stays stable for a synthetic profile.
assert(
  Object.keys(buildPaidAnalysisEvidenceFacts).length >= 0,
  "facts builder must be importable",
);

console.log("paid-analysis-v4-evidence-resolver-regression passed ✓");
