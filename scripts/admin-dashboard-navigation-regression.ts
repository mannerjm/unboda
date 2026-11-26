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
assert(shell.includes('aria-current={view === item.id ? "page"') && shell.includes('href="/admin?legacy=1"') && shell.includes('lg:h-screen'), "accessible navigation and legacy fallback");
assert(legacy.includes('href="/admin/dashboard"') && legacy.includes('await requireOperator()'), "legacy remains usable");
assert(read("app/admin/AdminOperationsOverview.tsx").includes('view = "all"') && read("app/admin/AdminGrowthOverview.tsx").includes('showJourney = true'), "legacy defaults unchanged");
assert(page.includes('view=support#failure-summary-heading'), "exception links remain actionable");
assert(read("next.config.ts").includes('"/admin/:path*"'), "existing private admin namespace");
assert(page.includes('view === "refunds" ? getAdminRefundClosureDashboard(20) : Promise.resolve(null)'), "only load selected category reads");
assert(legacy.includes('if ((await searchParams).legacy !== "1") redirect("/admin/dashboard")') && legacy.indexOf("await requireOperator()") < legacy.indexOf('redirect("/admin/dashboard")'), "dashboard is the authenticated default with explicit legacy fallback");
assert(shell.includes('bg-[#f5f6f8] text-slate-900') && shell.includes('border-[#d1d5db] bg-white') && shell.includes('border-l-slate-900 bg-[#e8edf4]'), "soft neutral canvas, white sidebar and distinct active menu");
const readability = read("app/admin/dashboard/DashboardShell.module.css");
assert(shell.includes('styles.content') && readability.includes('.content :global(.text-xs)') && readability.includes('font-size: 0.875rem') && readability.includes('font-size: 1.75rem') && readability.includes('color: #475569') && readability.includes('border-color: #d1d5db'), "scoped legible typography and card contrast");
for (const component of ["AdminGrowthOverview", "AdminCustomerJourneyOverview"]) assert(read("app/admin/"+component+".tsx").includes("data-dashboard-redundant-heading"), "hide repeated headings only in new dashboard");
assert(!/bg-\[#(?:f7f5fc|f0eaf9|e4d7f8|7650bb)\]/i.test(shell), "no lavender background in dashboard");
assert(page.includes('link("/admin?legacy=1", "기존 전체 관리자 화면")'), "legacy fallback link remains explicit");
console.log("[admin-dashboard] protected layout, menu routing, reused sections, and legacy fallback passed");
