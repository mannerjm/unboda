import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const read = (path: string) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/20261117183500_marketing_funnel_stage1.sql");
const tracker = read("app/components/AnalyticsVisitTracker.tsx");
const client = read("app/lib/analytics/marketingClient.ts");
const server = read("app/lib/analytics/marketingServer.ts");
const eventRoute = read("app/api/analytics/funnel/route.ts");
const visitRoute = read("app/api/analytics/visit/route.ts");
const guestForm = read("app/guest-saju/page.tsx");
const guestStart = read("app/api/guest-free-analysis/start/route.ts");
const guestGenerate = read("app/api/guest-free-analysis/generate/route.ts");
const guestResult = read("app/guest-result/page.tsx");
const guestLoading = read("app/guest-loading/page.tsx");
const growth = read("app/lib/analytics/server.ts");

assert(migration.includes("create table if not exists public.marketing_funnel_events"));
assert(migration.includes("enable row level security"));
assert(migration.includes("revoke all on public.marketing_funnel_events from public,anon,authenticated"));
assert(migration.includes("prune_marketing_funnel_events") && migration.includes("90 days"));
for (const field of ["email", "birth_date", "user_id", "ip_address", "user_agent", "profile_id", "analysis_content", "referrer_url"]) {
  assert(!migration.includes(field), `PII cannot be stored in marketing table: ${field}`);
}
for (const name of ["tiktok","threads"]) {
  assert(tracker.includes(`return "${name}"`), `SNS source ${name} mapped`);
  assert(growth.includes(`"${name}"`), `SNS source ${name} allowed in growth types`);
  assert(visitRoute.includes(`"${name}"`), `SNS source ${name} allowed at API boundary`);
  assert(migration.includes(`'${name}'`), `SNS source ${name} allowed in database`);
}
assert(!tracker.includes('params.get("wbraid") || params.get("fbclid")'), "fbclid must not imply paid");
assert(tracker.includes('if (params.get("fbclid")) return { channel: "social", source: "facebook" };'));
assert(tracker.includes("getFirstAcquisition(visitor.isNew)") && tracker.includes("ensureMarketingSession"));
assert(tracker.includes('emitMarketingEvent("FREE_CTA_CLICKED")'));
assert(tracker.includes('emitMarketingEvent("FREE_PAGE_VIEWED")'));
assert(visitRoute.includes("isInternalAnalyticsRequest"));
assert(client.includes("window.sessionStorage") && client.includes("crypto.randomUUID()"));
assert(!client.includes("birthDate") && !client.includes("birthTime"));
assert(server.includes('getCurrentUser()') && server.includes('"operator_roles"'));
assert(server.includes('request.headers.get("x-unboda-visitor")'));
assert(server.includes('"marketing_funnel_events"'));
assert(!eventRoute.includes('"FREE_ANALYSIS_COMPLETED"'), "public API must not be able to claim generation success");
assert(guestForm.includes('emitMarketingEvent("FREE_FORM_STARTED")'));
assert(guestForm.includes('emitMarketingEvent("FREE_SUBMIT_CLICKED")'));
assert(guestForm.includes("...marketingHeaders()"));
assert(guestStart.includes('recordMarketingEvent(request, "FREE_ANALYSIS_STARTED")'));
assert(guestGenerate.includes('recordMarketingEvent(request, "FREE_ANALYSIS_COMPLETED")'));
assert(guestLoading.includes('headers: marketingHeaders()'));
assert(guestResult.includes('emitMarketingEvent("FREE_RESULT_VIEWED")'));
assert(guestForm.includes('fetch("/api/guest-free-analysis/start"'));
assert(guestForm.includes('router.push("/guest-loading")'));
assert(guestResult.includes("ResultPageContent"));
console.log("marketing-funnel-regression: PASS");
