"use client";

type Channel = "direct" | "organic_search" | "paid_campaign" | "social" | "shared_link" | "referral" | "other";
type Source = "direct" | "naver" | "google" | "daum" | "bing" | "kakao" | "instagram" | "facebook" | "youtube" | "x" | "tiktok" | "threads" | "other";
type Attribution = { channel: Channel; source: Source };
type Session = {
  id: string;
  first: Attribution | null;
  current: Attribution;
  campaign: string | null;
  isInternal: boolean;
};

const KEY = "unboda.analytics.marketing.session.v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHANNELS: readonly string[] = ["direct","organic_search","paid_campaign","social","shared_link","referral","other"];
const SOURCES: readonly string[] = ["direct","naver","google","daum","bing","kakao","instagram","facebook","youtube","x","tiktok","threads","other"];
const CAMPAIGN = /^[a-z0-9_-]{1,48}$/;
export type MarketingBrowserEvent =
  | "SITE_PAGE_VIEWED" | "FREE_PAGE_VIEWED" | "FREE_FORM_STARTED"
  | "FREE_SUBMIT_CLICKED" | "FREE_RESULT_VIEWED" | "FREE_CTA_CLICKED";

function validAttribution(value: unknown): value is Attribution {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Attribution>;
  return CHANNELS.includes(candidate.channel ?? "") && SOURCES.includes(candidate.source ?? "");
}
function readSession(): Session | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Session>;
    if (typeof data.id !== "string" || !UUID.test(data.id) || !validAttribution(data.current)) return null;
    return {
      id: data.id, current: data.current, first: validAttribution(data.first) ? data.first : null,
      campaign: typeof data.campaign === "string" && CAMPAIGN.test(data.campaign) ? data.campaign : null,
      isInternal: data.isInternal === true,
    };
  } catch { return null; }
}

/** No birth input, names, free-result text, full URLs, or auth IDs are persisted. */
export function ensureMarketingSession(current: Attribution, first: Attribution | null): void {
  try {
    const query = new URLSearchParams(window.location.search);
    const existing = readSession();
    const explicitCampaign = (query.get("utm_campaign") ?? "").trim().toLowerCase();
    const campaign = CAMPAIGN.test(explicitCampaign) ? explicitCampaign : null;
    const newTaggedLanding = Boolean(query.get("utm_source")) && (
      !existing || existing.current.source !== current.source || existing.campaign !== campaign
    );
    const testActivated = query.get("analytics_test") === "1" && existing?.isInternal !== true;
    if (existing && !newTaggedLanding && !testActivated) return;
    const value: Session = {
      id: crypto.randomUUID(),
      current, first, campaign,
      isInternal: existing?.isInternal === true || query.get("analytics_test") === "1",
    };
    window.sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch { /* Marketing collection must not block the app. */ }
}

export function marketingHeaders(): Record<string,string> {
  try {
    const session = readSession();
    const visitor = window.localStorage.getItem("unboda.analytics.visitor.v1");
    if (!session || !visitor || !UUID.test(visitor)) return {};
    return {
      "X-Unboda-Visitor": visitor,
      "X-Unboda-Session": session.id,
      "X-Unboda-Current-Channel": session.current.channel,
      "X-Unboda-Current-Source": session.current.source,
      ...(session.first ? {
        "X-Unboda-First-Channel": session.first.channel,
        "X-Unboda-First-Source": session.first.source,
      } : {}),
      ...(session.campaign ? { "X-Unboda-Campaign": session.campaign } : {}),
      ...(session.isInternal ? { "X-Unboda-Internal": "1" } : {}),
    };
  } catch { return {}; }
}

export function emitMarketingEvent(eventName: MarketingBrowserEvent): void {
  const headers = marketingHeaders();
  if (!headers["X-Unboda-Visitor"]) return;
  void fetch("/api/analytics/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ eventName }),
    keepalive: true,
  }).catch(() => undefined);
}
