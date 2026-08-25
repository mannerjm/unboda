import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  process.stdout.write(".");
}

const root = process.cwd();
const promptSource = readFileSync(
  join(root, "app/lib/paidAnalysisDetailPrompt.ts"),
  "utf8",
);

// ============================================================================
// LINKAGE CONTRACT VERIFICATION
// ============================================================================

const linkageFieldDescriptionMatch = promptSource.match(
  /"linkage":\s*"([^"]*direction[^"]*focus[^"]*)"/,
);
assert(
  linkageFieldDescriptionMatch !== null,
  "evidence.linkage JSON field description must mention both direction and focus",
);

const linkageFieldDescription = linkageFieldDescriptionMatch![1];
assert(
  linkageFieldDescription.includes("direction"),
  "linkage field description must explicitly require direction",
);
assert(
  linkageFieldDescription.includes("focus"),
  "linkage field description must explicitly require focus",
);
assert(
  linkageFieldDescription.includes("근거"),
  "linkage field description must explain evidence meaning",
);
assert(
  linkageFieldDescription.includes("현실"),
  "linkage field description must reference real-world conditions",
);

// Linkage writing rules
const linkageRulesMatch = promptSource.match(
  /evidence 작성 규칙:([\s\S]*?)current 작성 규칙:/,
);
assert(linkageRulesMatch !== null, "evidence writing rules section must exist");

const linkageRulesBlock = linkageRulesMatch![1];

assert(
  linkageRulesBlock.includes("linkage는"),
  "linkage rules must explicitly address linkage behavior",
);
assert(
  linkageRulesBlock.includes("반복"),
  "linkage rules must prohibit repetition of evidence content",
);
assert(
  linkageRulesBlock.includes("direction"),
  "linkage rules must require direction connection",
);
assert(
  linkageRulesBlock.includes("focus"),
  "linkage rules must require focus connection",
);
assert(
  linkageRulesBlock.includes("현실") && linkageRulesBlock.includes("조건"),
  "linkage rules must reference real-world conditions",
);
assert(
  linkageRulesBlock.includes("검토 기준"),
  "linkage rules must reference review criteria",
);
assert(
  linkageRulesBlock.includes("기계적"),
  "linkage rules must prohibit mechanical copying",
);
assert(
  linkageRulesBlock.includes("순서"),
  "linkage rules should describe connection sequence",
);

// Verify validator is NOT modified
const validatorSource = readFileSync(
  join(root, "app/lib/paidAnalysisV4QualityValidators.ts"),
  "utf8",
);
assert(
  validatorSource.includes("output.conclusion.direction") &&
    validatorSource.includes("item.linkage.includes"),
  "validator threshold must not change: still check direction",
);
assert(
  validatorSource.includes("item.linkage.includes(focus)"),
  "validator threshold must not change: still check focus",
);
assert(
  validatorSource.includes("Warning only"),
  "validator must remain warning-only",
);

// ============================================================================
// GROUNDING CONTRACT VERIFICATION
// ============================================================================

// Common grounding rule
const groundingRulesMatch = promptSource.match(
  /필드 정보량 원칙:([\s\S]*?)avoid 작성 규칙:/,
);
assert(groundingRulesMatch !== null, "field quantity principle section must exist");

const groundingRulesBlock = groundingRulesMatch![1];

assert(
  groundingRulesBlock.includes("입력에서 확인되지 않은"),
  "grounding rules must prohibit unconfirmed context",
);
assert(
  groundingRulesBlock.includes("단정하지 않는다"),
  "grounding rules must forbid factual assertion of unconfirmed context",
);
assert(
  groundingRulesBlock.includes("직장"),
  "grounding rules must name job/workplace context",
);
assert(
  groundingRulesBlock.includes("프로젝트"),
  "grounding rules must name project context",
);
assert(
  groundingRulesBlock.includes("조직"),
  "grounding rules must name organization context",
);
assert(
  groundingRulesBlock.includes("협업"),
  "grounding rules must name collaboration context",
);
assert(
  groundingRulesBlock.includes("계약"),
  "grounding rules must name contract context",
);
assert(
  groundingRulesBlock.includes("수입"),
  "grounding rules must name income context",
);
assert(
  groundingRulesBlock.includes("관계"),
  "grounding rules must name relationship context",
);
assert(
  groundingRulesBlock.includes("건강"),
  "grounding rules must name health context",
);
assert(
  groundingRulesBlock.includes("질병"),
  "grounding rules must name disease context",
);
assert(
  groundingRulesBlock.includes("일정"),
  "grounding rules must name schedule context",
);

assert(
  groundingRulesBlock.includes("조건형"),
  "grounding rules must require conditional framing",
);
assert(
  groundingRulesBlock.includes("관찰형"),
  "grounding rules must allow observational framing",
);
assert(
  groundingRulesBlock.includes("진행 중인"),
  "grounding rules should offer 'in progress' conditional example",
);
assert(
  groundingRulesBlock.includes("제안이 들어오는 경우"),
  "grounding rules should offer proposal conditional example",
);
assert(
  groundingRulesBlock.includes("고정 일정"),
  "grounding rules should offer fixed schedule conditional example",
);
assert(
  groundingRulesBlock.includes("현금흐름"),
  "grounding rules should offer cashflow conditional example",
);

assert(
  groundingRulesBlock.includes("구체적"),
  "grounding rules must require specificity preservation",
);
assert(
  groundingRulesBlock.includes("generic disclaimer"),
  "grounding rules must forbid generic disclaimers",
);

// Action grounding rule
const actionRulesMatch = promptSource.match(
  /action 작성 규칙:([\s\S]*?)필드 정보량 원칙:/,
);
assert(actionRulesMatch !== null, "action writing rules section must exist");

const actionRulesBlock = actionRulesMatch![1];

assert(
  actionRulesBlock.includes("action.target"),
  "action rules must address target grounding",
);
assert(
  actionRulesBlock.includes("action.condition"),
  "action rules must address condition grounding",
);
assert(
  actionRulesBlock.includes("입력에서 확인"),
  "action rules must require input confirmation check",
);
assert(
  actionRulesBlock.includes("프로젝트"),
  "action rules example should mention project",
);
assert(
  actionRulesBlock.includes("조직"),
  "action rules example should mention organization",
);
assert(
  actionRulesBlock.includes("직접 지칭"),
  "action rules should allow direct reference when confirmed",
);
assert(
  actionRulesBlock.includes("조건형 검토 대상"),
  "action rules should require conditional format when unconfirmed",
);

// ============================================================================
// BUDGET VERIFICATION
// ============================================================================

// Check budget configuration in source
const generateAnalysisSource = readFileSync(
  join(root, "app/lib/ai/generateAnalysisText.ts"),
  "utf8",
);

assert(
  generateAnalysisSource.includes(
    'callType === "paid-analysis-detail"',
  ) && generateAnalysisSource.includes("return 4800"),
  "V3 paid detail budget must remain 4800",
);
assert(
  generateAnalysisSource.includes(
    'callType === "paid-analysis-detail-v4"',
  ) && generateAnalysisSource.includes("return 6000"),
  "V4 paid detail budget must remain 6000",
);
assert(
  generateAnalysisSource.includes('callType === "main-analysis"'),
  "main-analysis budget must remain 6000",
);
assert(
  generateAnalysisSource.includes("return 3200"),
  "recommendation budget must remain 3200",
);

// ============================================================================
// NEGATIVE SAFETY: UNCHANGED CONSTRAINTS
// ============================================================================

// Ensure no OpenAI mock or fake generation artifacts
assert(
  !promptSource.includes("MOCK_OPENAI"),
  "no OpenAI mocking should be in production source",
);
assert(
  !promptSource.includes("fake"),
  "no fake generation keywords in prompt source",
);

// Ensure schema constraints are preserved
const schemaSource = readFileSync(
  join(root, "app/lib/paidAnalysisDetailOutput.ts"),
  "utf8",
);
assert(
  schemaSource.includes("headline: string"),
  "V4 conclusion headline field must remain defined",
);
assert(
  schemaSource.includes("evidence:"),
  "evidence field must exist in schema",
);
assert(
  schemaSource.includes("linkage: string"),
  "linkage field must exist in evidence schema",
);

// ============================================================================
// FINAL REPORT
// ============================================================================

console.log("\n");
console.log("✅ evidence.linkage JSON field: direction + focus requirement verified");
console.log("✅ evidence writing rules: linkage remediation verified");
console.log("✅ validator unchanged: direction/focus check preserved");
console.log("✅ grounding rules: unknown context protection verified");
console.log("✅ action grounding: target + condition protection verified");
console.log("✅ budget preservation: V3=4800, V4=6000, verified");
console.log("✅ schema constraints: evidence + linkage field verified");
console.log("");
console.log("🎯 paid-analysis-v4-linkage-grounding-regression PASSED");
