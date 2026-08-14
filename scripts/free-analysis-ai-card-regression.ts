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
console.log("1. all eleven structured free-AI fields parse ✓");

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
console.log("2. numbered and bold markdown headings split into eleven independent fields ✓");

const partial = parseFreeAnalysisAIInterpretation("## 오행 분석\n오행 구조 설명입니다.");
assert(Boolean(partial.fiveElements), "partial field must parse");
assert(!partial.strength && !partial.summary, "missing card fields must remain optional");
console.log("2. missing AI fields do not fabricate card content ✓");

const legacyCombinedFlow = parseFreeAnalysisAIInterpretation(
  "## 현재 대운과 세운 해석\n기존 응답의 대운과 세운을 함께 설명하는 흐름입니다.",
);
assert(Boolean(legacyCombinedFlow.daeun) && Boolean(legacyCombinedFlow.seun), "legacy combined daeun/seun heading must remain visible in both cards");
console.log("3. legacy combined daeun/seun heading remains visible ✓");

const rawInternal = parseFreeAnalysisAIInterpretation("## 종합/마무리\nrelationship_conflict:fortuneFlowAnalysis을 확인합니다.");
assert(!rawInternal.summary?.includes("relationship_conflict"), "raw internal keys must not reach UI fields");
assert(!rawInternal.summary?.includes("fortuneFlowAnalysis"), "raw source keys must not reach UI fields");
console.log("4. raw internal tokens are sanitized ✓");

const legacy = parseFreeAnalysisAIInterpretation("기존 형식의 AI 분석 내용입니다.");
assert(legacy.summary === "기존 형식의 AI 분석 내용입니다.", "unstructured legacy response must use safe summary fallback");
console.log("5. legacy unstructured response uses summary fallback ✓");

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
  assert(resultPage.includes(`text: aiInterpretation.${field}`), `${field} must be included in the bottom summary section cards`);
}
assert(resultPage.includes("운보다 AI 종합 해석"), "bottom panel must use summary title");
assert(resultPage.includes("formatUnbodaMessage(aiSummary)"), "bottom panel must render summary only");
assert(resultPage.includes("AISummarySectionCard"), "bottom panel must render independent section subcards");
assert(!resultPage.includes("AIInterpretationSection"), "deterministic cards must not render duplicate AI sections");
assert(resultPage.includes("rounded-2xl border border-stone-200 bg-[#f7f3ea] p-5"), "bottom AI section cards must use a distinct subcard surface");
assert(resultPage.includes("h1: ({ children }) => <p"), "card AI markdown headings must be rendered as prose, not raw headings");
console.log("7. deterministic cards stay AI-free; eleven summary subcards render once at bottom ✓");

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
    currentDaeun: "대운",
    currentSeun: "세운",
    currentFlowContext: "흐름",
    activeRelations: [],
    relations: [],
    fortuneFlowSummary: "요약",
    opportunities: [],
    cautions: [],
    topicGuides: { career: "직업", wealth: "재물", relationship: "관계", health: "건강" },
  },
});
for (const heading of ["한눈에 보는 핵심", "원국 결과와 신강·신약의 맥락", "오행 분석", "용신 해석", "격국 해석", "현재 대운 해석", "현재 세운 해석", "재물 흐름", "관계 흐름", "건강·생활 리듬", "종합/마무리"]) {
  assert(prompt.includes(heading), `prompt must request ${heading} heading`);
}
console.log("7. prompt keeps deterministic facts and requests eleven card headings ✓");

console.log("\nfree-analysis-ai-card-regression passed ✓");
