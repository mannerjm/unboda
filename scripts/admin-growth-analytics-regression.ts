import { readFileSync } from "node:fs";

function read(path: string): string { return readFileSync(path, "utf8"); }
function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }

const migration = read("supabase/migrations/050_admin_growth_analytics.sql");
const analyticsServer = read("app/lib/analytics/server.ts");
const visitRoute = read("app/api/analytics/visit/route.ts");
const tracker = read("app/components/AnalyticsVisitTracker.tsx");
const layout = read("app/layout.tsx");
const adminPage = read("app/admin/page.tsx");
const dashboard = read("app/admin/AdminGrowthOverview.tsx");
const signup = read("app/api/auth/signup/route.ts");
const memberAnalyze = read("app/api/analyze/route.ts");
const guestStart = read("app/api/guest-free-analysis/start/route.ts");
const guestGenerate = read("app/api/guest-free-analysis/generate/route.ts");
const monthlyRefresh = read("app/api/free-analysis/[profileId]/refresh/route.ts");

const tableDefinition = migration.slice(
  migration.indexOf("create table if not exists public.service_analytics_events"),
  migration.indexOf("create unique index if not exists service_analytics_event_visitor_day_unique"),
);

assert(tableDefinition.length > 0, "analytics event table must exist");
for (const forbidden of ["user_id", "email", "birth", "ip_address", "user_agent", "analysis_content"]) {
  assert(!tableDefinition.includes(forbidden), `analytics event table must not store ${forbidden}`);
}
assert(migration.includes("alter table public.service_analytics_events enable row level security"), "analytics table must enable RLS");
assert(migration.includes("revoke all on public.service_analytics_events from public, anon, authenticated"), "browser roles must have no analytics table privileges");
assert(migration.includes("grant select, insert on public.service_analytics_events to service_role"), "server service role must have minimal analytics privileges");
assert(migration.includes("security invoker"), "admin reporting function must not be security definer");
assert(migration.includes("revoke all on function public.get_admin_growth_dashboard(integer) from public, anon, authenticated"), "admin report RPC must not be callable by browser roles");

assert(visitRoute.includes("UUID_PATTERN") && visitRoute.includes("recordDailyVisitor(visitorId)"), "public visit endpoint must only accept a validated random visitor id");
assert(!visitRoute.includes("eventName") && !visitRoute.includes("actorKind"), "public visit endpoint must not accept arbitrary analytics events");
assert(tracker.includes("localStorage") && tracker.includes("crypto.randomUUID()"), "visitor identity must be first-party random browser state");
assert(tracker.includes('startsWith("/admin")'), "operator visits must not inflate customer visitor counts");
assert(layout.includes("<AnalyticsVisitTracker />"), "visitor tracker must be mounted globally");

assert(migration.includes("from public.orders") && migration.includes("status = 'paid'") && migration.includes("paid_at is not null"), "revenue must come from actually paid orders");
assert(migration.includes("from public.refund_workflows") && migration.includes("status = 'REFUND_COMPLETED'"), "refund deductions must come from completed refunds");
assert(migration.includes("paid_eligible_at is not null"), "adult verification conversions must come from authoritative eligibility timestamps");
assert(migration.includes("date_trunc('week', timezone('Asia/Seoul', now()))") && migration.includes("date_trunc('month', timezone('Asia/Seoul', now()))"), "week and month boundaries must use KST");
assert(migration.includes("gross_revenue_krw") && migration.includes("refund_amount_krw") && migration.includes("net_revenue_krw"), "gross, refund, and net revenue must stay distinct");

assert(adminPage.indexOf("await requireOperator()") < adminPage.indexOf("getAdminGrowthDashboard(30)"), "growth metrics must remain behind operator authorization");
assert(dashboard.includes("오늘 방문자") && dashboard.includes("오늘 무료분석 완료") && dashboard.includes("오늘 신규 회원가입") && dashboard.includes("오늘 성인인증 완료") && dashboard.includes("오늘 구매 고객"), "admin must expose the core daily funnel");
assert(dashboard.includes("이번 달 순매출") && dashboard.includes("누적 순매출") && dashboard.includes("최근 7일") && dashboard.includes("최근 30일"), "admin must expose requested revenue and trend horizons");
assert(dashboard.includes("코호트 전환율이 아니라 당일 퍼널"), "same-day ratios must not be mislabeled as cohort conversion");

assert(signup.includes('eventName: "SIGNUP_COMPLETED"') && signup.includes("createdNewSignup && policyComplete"), "signup metric must record only completed new signups");
assert(memberAnalyze.includes('eventName: "FREE_ANALYSIS_STARTED"') && memberAnalyze.includes('eventName: "FREE_ANALYSIS_COMPLETED"'), "member free analysis must record actual generation starts/completions");
assert(guestStart.includes('eventName: "FREE_ANALYSIS_STARTED"') && guestGenerate.includes('eventName: "FREE_ANALYSIS_COMPLETED"'), "guest free analysis must record actual generation starts/completions");
assert(monthlyRefresh.includes('eventName: "FREE_ANALYSIS_REFRESH_COMPLETED"'), "monthly refresh must be tracked separately from initial free analysis");
assert(analyticsServer.includes("Analytics must never block the customer path") && analyticsServer.includes("console.warn"), "analytics failures must remain non-blocking");

console.log("admin-growth-analytics-regression passed ✓");
