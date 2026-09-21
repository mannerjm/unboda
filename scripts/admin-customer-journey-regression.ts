import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root,file),"utf8");
const migration = read("supabase/migrations/052_admin_customer_journey_metrics.sql");
const tracker = read("app/components/AnalyticsVisitTracker.tsx");
const eventRoute = read("app/api/analytics/journey/route.ts");
const visitRoute = read("app/api/analytics/visit/route.ts");
const admin = read("app/admin/page.tsx");
const summary = read("app/admin/AdminCustomerJourneyOverview.tsx");
const growth = read("app/admin/AdminGrowthOverview.tsx");
const details = read("app/admin/customer-journey/page.tsx");
const operations = read("app/admin/AdminOperationsOverview.tsx");
const server = read("app/lib/analytics/customerJourney.ts");

for (const keyword of ["customer_journey_events","enable row level security",
  "revoke all on public.customer_journey_events from public,anon,authenticated",
  "security invoker","get_admin_customer_journey_dashboard",
  "grant execute on function public.get_admin_customer_journey_dashboard() to service_role",
  "first_browser","buyer_cohort","selection_conversion","report_perf","generation_perf"]) {
  assert(migration.includes(keyword), "missing private analytics migration contract: " + keyword);
}
assert(!migration.includes("analysis_input_snapshot"),"no profile birth snapshot may enter journey analytics");
assert(tracker.includes("usePathname") && tracker.includes("PRODUCT_SELECTED") && tracker.includes("CHECKOUT_VIEWED"),
  "client must track navigation and customer selection");
assert(tracker.includes("if (isOperatorNavigation()) return"),"operator visits must not be counted");
assert(tracker.includes("keepalive: true"),"navigation telemetry must not block customer");
assert(eventRoute.includes("getCurrentUser()") && !eventRoute.includes("body.userId"),
  "account identity must be derived on the server");
assert(visitRoute.includes('eventName: "PAGE_VISIT"') && visitRoute.includes("user.id"),
  "authenticated account visit must be recorded separately");
assert(server.includes('import "server-only"') && server.includes('rpc("get_admin_customer_journey_dashboard")'),
  "dashboard must be service role server-only read");
assert(admin.includes("journey={journey}") && admin.includes("reportPerformance={journey}") && growth.includes("<AdminCustomerJourneyOverview report={journey} />"),"dashboard should reuse existing admin sections with summary directly below growth cards");
assert(summary.includes('href="/admin/customer-journey"') && summary.includes('d > 0') &&
  summary.includes("관측 기간"),"summary requires a real denominator and a detail entry");
assert(details.includes("await requireOperator()") && details.includes("getAdminCustomerJourneyDashboard"),
  "detailed analytics route must be operator-only");
assert(operations.includes("유료 리포트 생성 현황") && operations.includes("reportPerformance"),
  "report performance must be integrated with the existing operations panel");
console.log("[admin-customer-journey] 15 privacy, routing, cohort and UI regression checks passed");
