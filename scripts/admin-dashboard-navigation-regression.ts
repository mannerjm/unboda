import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p: string) => readFileSync(p, "utf8");
const page = read("app/admin/dashboard/page.tsx");
const shell = read("app/admin/dashboard/DashboardShell.tsx");
const legacy = read("app/admin/page.tsx");
assert(page.includes("await requireOperator()") && page.indexOf("await requireOperator()") < page.indexOf("await Promise.allSettled"), "authorize before private reads");
assert(page.includes('dynamic = "force-dynamic"') && page.includes("index: false, follow: false"), "private dynamic dashboard");
for(const id of ["overview","reports","ai","support","refunds","reviews","revenue","journey","system"]) {
  assert(shell.includes('id: "'+id+'"') && page.includes('view === "'+id+'"'), "missing section "+id);
}
for(const component of ["AdminOperationsOverview","AdminGrowthOverview","AdminLookupConsole","AdminReviewOverview","AdminRefundClosureOverview","AdminCustomerJourneyOverview"]) assert(page.includes("<"+component), "reuse "+component);
assert(shell.includes('aria-current={view === item.id ? "page"') && shell.includes('href="/admin"') && shell.includes('lg:h-screen'), "accessible navigation and legacy fallback");
assert(legacy.includes('href="/admin/dashboard"') && legacy.includes('await requireOperator()'), "legacy remains usable");
assert(read("app/admin/AdminOperationsOverview.tsx").includes('view = "all"') && read("app/admin/AdminGrowthOverview.tsx").includes('showJourney = true'), "legacy defaults unchanged");
assert(page.includes('view=support#failure-summary-heading'), "exception links remain actionable");
assert(read("next.config.ts").includes('"/admin/:path*"'), "existing private admin namespace");
console.log("[admin-dashboard] protected layout, menu routing, reused sections, and legacy fallback passed");
