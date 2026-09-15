import { readFileSync } from "fs";
import { join } from "path";
import { parseFreeAnalysisAIInterpretation } from "../app/lib/freeAnalysisAIInterpretation";
import { buildMainAnalysisPrompt } from "../app/lib/mainAnalysisPrompt";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

const structuredMarkdown = `
# 한눈에 보는 핵심
전체 흐름의 핵심입니다.

## 원국 결과와 신강·신약의 맥락
강약의 구조가 실제 성향과 선택에 연결됩니다.

## 오행 분석
오행의 균형이 용신 판단과 연결되는 흐름입니다.

## 용신 해석
필요한 기운을 현실에서 보완하는 방향입니다.

## 격국 해석
강점과 주의점을 함께 살펴볼 수 있습니다.

## 현재 대운 해석
현재 10년 흐름에서 역할 변화가 중요합니다.

## 현재 세운 해석
가까운 연도에는 속도 조절이 필요합니다.

## 재물 흐름
재정의 균형과 관리 기준을 점검할 시기입니다.

## 관계 흐름
관계의 거리와 소통 방식을 살펴볼 필요가 있습니다.

## 건강·생활 리듬
생활 리듬과 회복의 균형을 챙기는 흐름입니다.

## 종합/마무리
전체 구조를 묶어 우선순위를 정리합니다.
`;

const interpretation = parseFreeAnalysisAIInterpretation(structuredMarkdown);
assert(Boolean(interpretation.overview), "overview field must parse");
assert(Boolean(interpretation.fiveElements), "fiveElements field must parse");
assert(Boolean(interpretation.strength), "strength field must parse");
assert(Boolean(interpretation.yongshin), "yongshin field must parse");
assert(Boolean(interpretation.gyeokguk), "gyeokguk field must parse");
assert(Boolean(interpretation.daeun), "daeun field must parse");
assert(Boolean(interpretation.seun), "seun field must parse");
assert(Boolean(interpretation.wealth), "wealth field must parse");
assert(Boolean(interpretation.relationship), "relationship field must parse");
assert(Boolean(interpretation.health), "health field must parse");
assert(Boolean(interpretation.summary), "summary field must parse");
console.log("1. legacy eleven-field free-AI responses remain parseable ✓");

const conciseMarkdown = `
## 한눈에 보는 핵심
현재 상황과 문제를 계산 사실에 근거해 압축한 설명입니다.

## 사주의 특성
타고난 성향과 강점, 취약점을 쉬운 말로 설명합니다.
`;
const concise = parseFreeAnalysisAIInterpretation(conciseMarkdown);
assert(concise.overview === "현재 상황과 문제를 계산 사실에 근거해 압축한 설명입니다.", "concise overview must parse");
assert(concise.strength === "타고난 성향과 강점, 취약점을 쉬운 말로 설명합니다.", "사주의 특성 heading must map to the traits/strength field");
assert(!concise.daeun && !concise.seun && !concise.summary, "new concise output must not fabricate legacy sections");
console.log("2. new two-card free-AI response parses into overview and traits only ✓");

const numberedBoldMarkdown = `
**1) 한눈에 보는 핵심**
핵심 흐름입니다.

**2. 원국 결과와 신강·신약의 맥락**
강약의 의미입니다.

**3) 오행 분석**
오행의 의미입니다.

**4. 용신 해석**
용신의 의미입니다.

**5) 격국 해석**
격국의 의미입니다.

**6. 현재 대운 해석**
대운의 의미입니다.

**7) 현재 세운 해석**
세운의 의미입니다.

**8. 재물 흐름**
재물의 의미입니다.

**9) 관계 흐름**
관계의 의미입니다.

**10. 건강·생활 리듬**
건강의 의미입니다.

**11) 종합/마무리**
최종 결론입니다.
`;

const numberedBold = parseFreeAnalysisAIInterpretation(numberedBoldMarkdown);
for (const field of ["overview", "strength", "fiveElements", "yongshin", "gyeokguk", "daeun", "seun", "wealth", "relationship", "health", "summary"] as const) {
  assert(Boolean(numberedBold[field]), `numbered/bold ${field} field must parse`);
}
assert(numberedBold.summary === "최종 결론입니다.", "summary must not contain the complete numbered/bold response");
assert(!numberedBold.summary?.includes("오행의 의미"), "summary must not duplicate section content");
console.log("3. numbered and bold legacy headings remain compatible ✓");

const partial = parseFreeAnalysisAIInterpretation("## 오행 분석\n오행 구조 설명입니다.");
assert(Boolean(partial.fiveElements), "partial field must parse");
assert(!partial.strength && !partial.summary, "missing card fields must remain optional");
console.log("4. missing AI fields do not fabricate card content ✓");

const legacyCombinedFlow = parseFreeAnalysisAIInterpretation(
  "## 현재 대운과 세운 해석\n기존 응답의 대운과 세운을 함께 설명하는 흐름입니다.",
);
assert(Boolean(legacyCombinedFlow.daeun) && Boolean(legacyCombinedFlow.seun), "legacy combined daeun/seun heading must remain visible in both cards");
console.log("5. legacy combined daeun/seun heading remains visible ✓");

const rawInternal = parseFreeAnalysisAIInterpretation("## 종합/마무리\nrelationship_conflict:fortuneFlowAnalysis을 확인합니다.");
assert(!rawInternal.summary?.includes("relationship_conflict"), "raw internal keys must not reach UI fields");
assert(!rawInternal.summary?.includes("fortuneFlowAnalysis"), "raw source keys must not reach UI fields");
console.log("6. raw internal tokens are sanitized ✓");

const legacy = parseFreeAnalysisAIInterpretation("기존 형식의 AI 분석 내용입니다.");
assert(legacy.summary === "기존 형식의 AI 분석 내용입니다.", "unstructured legacy response must use safe summary fallback");
console.log("7. legacy unstructured response uses summary fallback ✓");

const resultPage = read("app/result/page.tsx");
for (const [field, card] of [
  ["fiveElements", "오행 분석"],
  ["strength", "신강·신약 참고 지표"],
  ["yongshin", "용신 분석"],
  ["gyeokguk", "격국 분석"],
  ["daeun", "대운 분석"],
  ["seun", "세운 분석"],
] as const) {
  assert(!resultPage.includes(`text={aiInterpretation.${field}}`), `${field} AI section must not duplicate in the ${card} card`);
}
for (const field of ["overview", "strength", "fiveElements", "yongshin", "gyeokguk", "daeun", "seun", "wealth", "relationship", "health"] as const) {
  assert(resultPage.includes(`text: aiInterpretation.${field}`), `${field} must remain supported in the bottom summary section cards for stored legacy results`);
}
assert(resultPage.includes("운보다 AI 종합 해석"), "bottom panel must use summary title");
assert(resultPage.includes("formatUnbodaMessage(aiSummary)"), "bottom panel must remain compatible with legacy summary output");
assert(resultPage.includes("AISummarySectionCard"), "bottom panel must render independent section subcards");
assert(!resultPage.includes("AIInterpretationSection"), "deterministic cards must not render duplicate AI sections");
console.log("8. result UI remains backward-compatible with stored free analyses ✓");

const prompt = buildMainAnalysisPrompt({
  compactFacts: {
    yearPillar: "갑자",
    monthPillar: "을축",
    dayPillar: "병인",
    hourPillar: "정묘",
    strengthLevel: "신강",
    strengthSummary: "근거",
    strengthDetail: "핵심 사실",
    elementSummary: "오행 요약",
    elementPercentages: ["목 20%"],
    elementBalance: "균형",
    yongshinPrimary: "금",
    yongshinSecondary: [],
    yongshinReason: "근거",
    yongshinDetail: "해석",
    gyeokgukPrimary: "격국",
    gyeokgukCandidates: [],
    gyeokgukReason: "근거",
    gyeokgukDetail: "해석",
    currentDaeun: "대운팩트",
    currentSeun: "세운팩트",
    currentFlowContext: "흐름",
    activeRelations: ["활성관계"],
    relations: ["관계근거"],
    fortuneFlowSummary: "요약",
    opportunities: ["기회근거"],
    cautions: ["주의근거"],
    topicGuides: { career: "직업", wealth: "재물", relationship: "관계", health: "건강" },
  },
});

assert(prompt.includes("1) 한눈에 보는 핵심 2) 사주의 특성"), "prompt must request exactly the two concise free-analysis headings");
for (const forbiddenOutputHeading of ["현재 대운 해석 3)", "현재 세운 해석 4)", "종합/마무리 5)", "재물 흐름 3)", "관계 흐름 3)", "건강·생활 리듬 3)"]) {
  assert(!prompt.includes(forbiddenOutputHeading), `prompt must not request legacy long-form heading ${forbiddenOutputHeading}`);
}
assert(prompt.includes("대운: 대운팩트") && prompt.includes("세운: 세운팩트"), "daeun and seun facts must remain in the prompt even though they no longer get separate output cards");
assert(prompt.includes("활성관계") && prompt.includes("기회근거") && prompt.includes("주의근거"), "current-flow evidence must remain available to the concise overview");
assert(prompt.includes("서로 다른 근거를 최소 3가지 이상 연결"), "traits section must preserve multiple independent engine facts instead of becoming generic copy");
assert(prompt.includes("해결책을 절대 제시하지 마세요"), "free prompt must explicitly prohibit solutions");
assert(prompt.includes("약 700~1000자 내외"), "free prompt must cap the two-card diagnosis to a concise character target");
assert(prompt.includes("영어 단어를 사용자에게 절대 노출하지 마세요"), "free prompt must prohibit accidental English leakage");
assert(prompt.includes("화면 위쪽에 이미 표시된") && prompt.includes("그대로 반복"), "free prompt must prohibit repeating deterministic engine output");
console.log("9. prompt keeps engine facts while requesting only two concise diagnosis sections ✓");

console.log("\nfree-analysis-ai-card-regression passed ✓");
