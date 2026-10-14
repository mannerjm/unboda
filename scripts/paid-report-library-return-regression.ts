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
assert(paid.indexOf("<ReportAccessGate") < paid.indexOf("<PaidReportBody"), "deep report stays behind purchase gate");
assert(paid.indexOf("<ReportCompletionGate") < paid.indexOf('<ReportLibraryReturnLink placement="bottom"'),
  "deep report exit only appears after completed report");
for (const path of reportFiles.slice(1)) {
  const src = read(path);
  assert(src.indexOf("if (!completed)") < src.indexOf('<ReportLibraryReturnLink placement="top"'),
    `${path}: completed-only specialized navigation`);
}
console.log("paid report library return contract: PASS ("+reportFiles.length+" report entry surfaces)");
