import "server-only";

import { getCurrentUser } from "@/app/lib/supabase/auth";
import { createAdminClient } from "@/app/lib/supabase/admin";

export type MarketingEvent =
  | "SITE_PAGE_VIEWED" | "FREE_PAGE_VIEWED" | "FREE_FORM_STARTED" | "FREE_SUBMIT_CLICKED"
  | "FREE_ANALYSIS_STARTED" | "FREE_ANALYSIS_COMPLETED" | "FREE_ANALYSIS_FAILED" | "FREE_RESULT_VIEWED" | "FREE_CTA_CLICKED";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[a-f0-9]{12}$/i;
const CHANNELS = ["direct","organic_search","paid_campaign","social","shared_link","referral","other"] as const;
const SOURCES = ["direct","naver","google","daum","bing","kakao","instagram","facebook","youtube","x","tiktok","threads","other"] as const;
const CAMPAIGN = /^[a-z0-9_-]{1,48}$/;
function allowed(header: string | null, entries: readonly string[]): string | null {
  return header && entries.includes(header) ? header : null;
}
function uuid(value: string | null): string | null {
  return value && UUID.test(value) ? value : null;
}

/** Exclude verified staff logins and explicitly tagged test sessions, not arbitrary emails or IPs. */
export async function isInternalAnalyticsRequest(request: Request): Promise<boolean> {
  if (request.headers.get("x-unboda-internal") === "1") return true;
  if (/bot|crawler|spider|preview|uptime/i.test(request.headers.get("user-agent") ?? "")) return true;
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    const { data } = await createAdminClient().from("operator_roles")
      .select("id").eq("auth_user_id", user.id).eq("is_active", true)
      .is("revoked_at", null).limit(1).maybeSingle();
    return Boolean(data);
  } catch { return false; }
}

/** Best-effort, allowlisted, server-side events. Never affects analysis, payments or access control. */
export async function recordMarketingEvent(request: Request, eventName: MarketingEvent): Promise<void> {
  try {
    const visitor = uuid(request.headers.get("x-unboda-visitor"));
    const session = uuid(request.headers.get("x-unboda-session"));
    if (!visitor || !session) return;
    const firstChannel = allowed(request.headers.get("x-unboda-first-channel"), CHANNELS);
    const firstSource = allowed(request.headers.get("x-unboda-first-source"), SOURCES);
    const currentChannel = allowed(request.headers.get("x-unboda-current-channel"), CHANNELS);
    const currentSource = allowed(request.headers.get("x-unboda-current-source"), SOURCES);
    const candidate = request.headers.get("x-unboda-campaign");
    const campaign = candidate && CAMPAIGN.test(candidate) ? candidate : null;
    const internal = await isInternalAnalyticsRequest(request);

    const { error } = await createAdminClient().from("marketing_funnel_events").insert({
      event_name: eventName, visitor_id: visitor, session_id: session,
      first_channel: firstChannel, first_source: firstSource,
      current_channel: currentChannel, current_source: currentSource,
      campaign, is_internal: internal,
    });
    if (error) console.warn("[marketing-funnel] write failure", { code: error.code, eventName });
  } catch (error) {
    console.warn("[marketing-funnel] unavailable", error instanceof Error ? error.name : "unknown");
  }
}
