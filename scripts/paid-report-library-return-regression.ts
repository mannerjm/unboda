import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string): string => readFileSync(path, "utf8");
const nav = read("app/components/ReportLibraryReturnLink.tsx");
assert(nav.includes('href="/purchased-analyses"'), "return navigation must target purchase library");
assert(!nav.includes('href="/mypage"') && !nav.includes('href="/"'), "return must not accidentally send customers to profile or home");
assert(nav.includes('placement === "top"') && nav.includes("구매 보관함으로 돌아가기"), "two reusable, human-readable return placements");
assert(nav.includes('min-h-12') && nav.includes('focus-visible'), "footer must be keyboard accessible and touch friendly");

const reportFiles = [
  "app/paid-analysis/[productId]/report/page.tsx",
  "app/special-analysis/compatibility/PairCompatibilityReportPage.tsx",
  "app/special-analysis/compatibility/family/parent-child/report/page.tsx",
  "app/special-analysis/compatibility/family/siblings/report/page.tsx",
  "app/special-analysis/compatibility/family/other/report/page.tsx",
];
for (const path of reportFiles) {
  const src = read(path);
  assert(src.includes('import ReportLibraryReturnLink from "@/app/components/ReportLibraryReturnLink"'), `${path}: shared component`);
  assert.equal((src.match(/<ReportLibraryReturnLink placement="top"/g) ?? []).length, 1, `${path}: exactly one top return`);
  assert.equal((src.match(/<ReportLibraryReturnLink placement="bottom"/g) ?? []).length, 1, `${path}: exactly one footer return`);
  const ai = src.indexOf("<AiConsultingEntryCard");
  const review = src.indexOf("<VerifiedReviewPanel");
  const recommend = src.indexOf("<Phase9NextAnalysisSection");
  const bottom = src.indexOf('<ReportLibraryReturnLink placement="bottom"');
  assert(ai > -1 && review > ai && recommend > review && bottom > recommend,
    `${path}: AI counseling, reviews and recommendations must remain above exit`);
}
const paid = read(reportFiles[0]);
const paidClient = read("app/paid-analysis/[productId]/PaidAnalysisDetailV2Client.tsx");
assert(!paidClient.includes("상품 설명으로 돌아가기"), "paid report must not show a competing product-description return link");
assert(paid.indexOf("<ReportAccessGate") < paid.indexOf("<PaidReportBody"), "deep report stays behind purchase gate");
assert(paid.indexOf("<ReportCompletionGate") < paid.indexOf('<ReportLibraryReturnLink placement="bottom"'),
  "deep report exit only appears after completed report");

// A first-time paid report can show the preparing screen before its snapshot exists.
// Its top library link must not appear until the same completion event that unlocks
// post-report actions; completed reports must keep their top + footer exits.
const topLink = paid.indexOf('<ReportLibraryReturnLink placement="top"');
const reportBody = paid.indexOf('<PaidAnalysisDetailV2Client');
const topGate = paid.lastIndexOf('<ReportCompletionGate', topLink);
const topGateCode = paid.slice(topGate, topLink);
assert(topGate > -1 && topGate < topLink && topLink < reportBody,
  "deep report: top return must be completion-gated before the report body");
assert(topGateCode.includes('initialCompleted={Boolean(initialDetail)}')
  && topGateCode.includes('edition={exactEdition}')
  && topGateCode.includes('profileId={profileId}')
  && topGateCode.includes('productId={productId}'),
  "deep report: top link must use the exact purchased report completion state");
const completionGate = read("app/paid-analysis/[productId]/report/ReportCompletionGate.tsx");
assert(completionGate.includes('if (!completed) return null')
  && completionGate.includes('unboda:paid-report-ready'),
  "deep report: wait-state top link must remain hidden until persisted ready event");
assert(paid.includes('key={`post-report:${profileId}:${productId}:${exactEdition}`}'),
  "deep report: completed-only AI consultation and footer sections must remain intact");

for (const path of reportFiles.slice(1)) {
  const src = read(path);
  assert(src.includes('import { getActiveProfile } from "@/app/lib/profiles/activeServer"'),
    `${path}: compatibility report must verify current active profile`);
  assert(src.includes("const activeProfile = await getActiveProfile(user.id);") &&
    src.includes("if (activeProfile?.id !== profile.id) notFound();"),
    `${path}: block reports for a non-active profile even within same account`);
  assert(src.indexOf("activeProfile?.id !== profile.id") < src.indexOf("listUserEntitlements(user.id)"),
    `${path}: active profile guard must run before entitlement/report loading`);
  assert(src.indexOf("if (!completed)") < src.indexOf('<ReportLibraryReturnLink placement="top"'),
    `${path}: completed-only specialized navigation`);
}
console.log("paid report library return contract: PASS ("+reportFiles.length+" report entry surfaces)");
