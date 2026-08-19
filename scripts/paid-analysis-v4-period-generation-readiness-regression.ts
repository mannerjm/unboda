import { buildPaidAnalysisInputFromProfile } from "../app/lib/paidAnalysisProfileInput";
import { buildPaidAnalysisDetailPromptV4 } from "../app/lib/paidAnalysisDetailPrompt";
import { getPaidAnalysisEngine } from "../app/lib/paidAnalysisEngine";
import { getPeriodAnalysisStrategy } from "../app/lib/analysisPeriodStrategy";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";
import { resolvePaidAnalysisLaunchSpecialization } from "../app/lib/paidAnalysisTopicConfig";
import type { ProfileDto } from "../app/lib/profiles/types";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const profile: ProfileDto = {
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
};

const periodIds = [
  "monthly-current",
  "monthly-next",
  "yearly-current",
  "annual-next",
  "annual-3years",
  "daeun-current",
  "lifetime-overview",
] as const;

const prompts = new Map<string, string>();
const inputs = new Map<string, ReturnType<typeof buildPaidAnalysisInputFromProfile>>();

for (const productId of periodIds) {
  const product = getPremiumProduct(productId);
  const strategy = getPeriodAnalysisStrategy(productId);
  const input = buildPaidAnalysisInputFromProfile(profile, productId, "2026-08-17");
  const prompt = buildPaidAnalysisDetailPromptV4(input);

  assert(product?.kind === "PERIOD", `${productId} must resolve to a PERIOD registry product`);
  assert(getPaidAnalysisEngine(productId) === "PERIOD", `${productId} must resolve to PERIOD engine`);
  assert(resolvePaidAnalysisLaunchSpecialization(productId).kind === "period", `${productId} must resolve as launched period specialization`);
  assert(Boolean(strategy), `${productId} must have a canonical strategy`);
  assert(Boolean(input.referencePeriod), `${productId} must build a fixed reference period`);
  assert(Boolean(input.v4Context?.periodTiming), `${productId} must include PERIOD timing context`);
  assert(prompt.includes("[기간 기준 고정]") && prompt.includes("[기간별 분석 전략]"), `${productId} must reach period prompt blocks`);
  assert(prompt.includes(strategy!.coreQuestion), `${productId} must include its period customer question`);
  assert(prompt.includes(strategy!.timelineSpec.rule), `${productId} must include its review-window rule`);
  for (const focus of strategy!.focus) {
    assert(prompt.includes(focus), `${productId} must include product-specific responsibility: ${focus}`);
  }
  for (const forbidden of strategy!.prohibitedPatterns) {
    assert(prompt.includes(forbidden), `${productId} must retain temporal safety: ${forbidden}`);
  }
  for (const section of ["\"conclusion\"", "\"coreProblem\"", "\"cause\"", "\"evidence\"", "\"current\"", "\"timeline\"", "\"action\"", "\"avoid\"", "\"confidence\"", "\"periodAnalysis\""]) {
    assert(prompt.includes(section), `${productId} must reach structured section ${section}`);
  }

  inputs.set(productId, input);
  prompts.set(productId, prompt);
}

assert(inputs.get("yearly-current")?.referencePeriod?.referenceYear === 2026, "yearly-current must build the current-year reference snapshot");
assert(inputs.get("monthly-next")?.referencePeriod?.referenceMonth === 9, "monthly-next must build the next-month reference snapshot");
assert(inputs.get("annual-3years")?.referencePeriod?.coverage?.to === "2028-12-31", "annual-3years must build three-year coverage");
assert(inputs.get("daeun-current")?.referencePeriod?.scale === "daeun", "daeun-current must keep long-cycle snapshot scale");
assert(inputs.get("lifetime-overview")?.referencePeriod?.coverage === undefined, "lifetime-overview must not invent finite coverage");

const siblingPairs = [
  ["monthly-current", "monthly-next"],
  ["yearly-current", "annual-next"],
  ["yearly-current", "annual-3years"],
  ["annual-3years", "daeun-current"],
  ["daeun-current", "lifetime-overview"],
] as const;

for (const [leftId, rightId] of siblingPairs) {
  const left = getPeriodAnalysisStrategy(leftId)!;
  const right = getPeriodAnalysisStrategy(rightId)!;
  const leftPrompt = prompts.get(leftId)!;
  const rightPrompt = prompts.get(rightId)!;

  assert(leftPrompt !== rightPrompt, `${leftId}/${rightId} must not be renamed prompts`);
  assert(left.coreQuestion !== right.coreQuestion, `${leftId}/${rightId} must have distinct questions`);
  assert(JSON.stringify(left.focus) !== JSON.stringify(right.focus), `${leftId}/${rightId} must have distinct mechanisms`);
  assert(JSON.stringify(left.timelineSpec.labels) !== JSON.stringify(right.timelineSpec.labels), `${leftId}/${rightId} must have distinct timeline semantics`);
  assert(left.timelineSpec.rule !== right.timelineSpec.rule, `${leftId}/${rightId} must have distinct review responsibility`);
}

assert(getPremiumProduct("annual-current")?.id === "yearly-current", "annual-current must only resolve as yearly-current compatibility alias");

console.log("paid-analysis-v4-period-generation-readiness-regression passed ✓");
