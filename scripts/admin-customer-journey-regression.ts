import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root,file),"utf8");
const migration = read("supabase/migrations/052_admin_customer_journey_metrics.sql");
const growthCohortMigration = read("supabase/migrations/20260928210000_admin_growth_attribution_cohorts.sql");
const dailyRetentionMigration = read("supabase/migrations/20261002095000_daily_unboda_retention.sql");
const memoryAssetMigration = read("supabase/migrations/20261002113000_memory_asset_metrics.sql");
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
for (const keyword of ["acquisition_channel","acquisition_source","first_acquisition","free_to_first_purchase","second_paid_30","report_funnel","revenue_windows","ai_segment","acquisitionSources","averageNetRevenue90Krw"]) {
  assert(growthCohortMigration.includes(keyword), "missing growth decision metric contract: " + keyword);
}
for (const forbidden of ["referrer_url","query_string","ip_address","user_agent","analysis_input_snapshot","consultation_text"]) {
  assert(!growthCohortMigration.includes(forbidden), "growth attribution must not store sensitive/raw traffic data: " + forbidden);
  assert(!dailyRetentionMigration.includes(forbidden), "daily retention must not store sensitive/raw customer data: " + forbidden);
}
for (const keyword of ["TODAY_VIEWED","profile_id","customer_journey_today_profile_unique","daily_unboda_retention","todayViewedToday","todayD1Returned","todayD7Returned"]) {
  assert(dailyRetentionMigration.includes(keyword), "missing daily retention contract: " + keyword);
}
assert(tracker.includes("usePathname") && tracker.includes("PRODUCT_SELECTED") && tracker.includes("CHECKOUT_VIEWED"),
  "client must track navigation and customer selection");
assert(tracker.includes("if (isOperatorNavigation()) return"),"operator visits must not be counted");
assert(tracker.includes("keepalive: true"),"navigation telemetry must not block customer");
assert(eventRoute.includes("getCurrentUser()") && !eventRoute.includes("body.userId"),
  "account identity must be derived on the server");
assert(visitRoute.includes('eventName: "PAGE_VISIT"') && visitRoute.includes("visitorId, accountId: user.id"),
  "authenticated account visit must securely link server session account to the random browser id");
assert(server.includes('import "server-only"') && server.includes('rpc("get_admin_customer_journey_dashboard")')
  && server.includes('rpc("get_admin_daily_unboda_retention")')
  && server.includes('rpc("get_admin_memory_asset_metrics")')
  && server.includes('"TODAY_VIEWED"') && server.includes("hasTodayUnbodaViewed"),
  "dashboard must be service role server-only read");
assert(admin.includes("journey={journey}") && admin.includes("reportPerformance={journey}") && growth.includes("<AdminCustomerJourneyOverview report={journey} />"),"dashboard should reuse existing admin sections with summary directly below growth cards");
assert(summary.includes('href="/admin/customer-journey"') && summary.includes('d > 0') &&
  summary.includes("관측 기간"),"summary requires a real denominator and a detail entry");
assert(details.includes("await requireOperator()") && details.includes("getAdminCustomerJourneyDashboard"),
  "detailed analytics route must be operator-only");
assert(summary.includes("오늘의 운보다 · 오늘 이용자") && summary.includes("오늘의 운보다 · D1 재방문") && summary.includes("기억 보유 고객") && summary.includes("기억 저장 후 D7 재상담") && summary.includes("무료 분석 → 첫 구매") && summary.includes("첫 구매 → 30일 내 두 번째 결제") && summary.includes("30일 고객당 순매출"), "admin summary must surface retention, memory adoption, conversion, repeat-payment and customer-value KPIs");
assert(details.includes("오늘의 운보다 재방문") && details.includes("최근 7일 2일 이상 이용") && details.includes("기억 자산화") && details.includes("최근 30일 상황 변화") && details.includes("신규 유입 출처 → 구매 → 순매출") && details.includes("AI 상담 사용 고객 vs 미사용 고객") && details.includes("상관관계를 보는 운영 지표"), "admin detail must expose retention, memory assetization, attribution and descriptive AI cohort comparison without causal overclaim");
for (const forbidden of ["content","consultation_text","birth_date","birth_time"]) {
  assert(!memoryAssetMigration.includes("select " + forbidden), "memory asset metrics must not expose customer memory or birth content: " + forbidden);
}
assert(operations.includes("유료 리포트 생성 현황") && operations.includes("reportPerformance"),
  "report performance must be integrated with the existing operations panel");
console.log("[admin-customer-journey] privacy, routing, attribution, cohort and UI regression checks passed");
