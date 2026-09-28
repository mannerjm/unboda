"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISITOR_KEY = "unboda.analytics.visitor.v1";
const ACQUISITION_KEY = "unboda.analytics.acquisition.v1";

type AcquisitionChannel = "direct" | "organic_search" | "paid_campaign" | "social" | "shared_link" | "referral" | "other";
type AcquisitionSource = "direct" | "naver" | "google" | "daum" | "bing" | "kakao" | "instagram" | "facebook" | "youtube" | "x" | "other";
type Acquisition = { channel: AcquisitionChannel; source: AcquisitionSource };
type VisitorState = { id: string; isNew: boolean };

function getOrCreateVisitor(): VisitorState | null {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return { id: existing, isNew: false };
    const created = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, created);
    return { id: created, isNew: true };
  } catch {
    return null;
  }
}

function sourceFromHost(host: string): AcquisitionSource {
  const value = host.toLowerCase().replace(/^www\./, "");
  if (value === "naver.com" || value.endsWith(".naver.com")) return "naver";
  if (value === "google.com" || value.startsWith("google.") || value.includes(".google.")) return "google";
  if (value === "daum.net" || value.endsWith(".daum.net")) return "daum";
  if (value === "bing.com" || value.endsWith(".bing.com")) return "bing";
  if (value === "kakao.com" || value.endsWith(".kakao.com") || value === "kakaotalk.com") return "kakao";
  if (value === "instagram.com" || value.endsWith(".instagram.com")) return "instagram";
  if (value === "facebook.com" || value.endsWith(".facebook.com")) return "facebook";
  if (value === "youtube.com" || value.endsWith(".youtube.com") || value === "youtu.be") return "youtube";
  if (value === "x.com" || value.endsWith(".x.com") || value === "twitter.com" || value.endsWith(".twitter.com") || value === "t.co") return "x";
  return "other";
}

function isSearchSource(source: AcquisitionSource): boolean {
  return source === "naver" || source === "google" || source === "daum" || source === "bing";
}
function isSocialSource(source: AcquisitionSource): boolean {
  return source === "kakao" || source === "instagram" || source === "facebook" || source === "youtube" || source === "x";
}

function inferAcquisition(): Acquisition {
  const params = new URLSearchParams(window.location.search);
  const utmSource = (params.get("utm_source") ?? "").trim().toLowerCase();
  const utmMedium = (params.get("utm_medium") ?? "").trim().toLowerCase();
  const paidSignal = Boolean(
    params.get("gclid") || params.get("gbraid") || params.get("wbraid") || params.get("fbclid")
    || /(?:^|[_-])(cpc|ppc|paid|ads?|display|retarget)(?:$|[_-])/.test(utmMedium),
  );
  const shareSignal = /(?:^|[_-])(share|shared)(?:$|[_-])/.test(utmMedium)
    || params.get("ref") === "share";
  const utmSourceKind = sourceFromHost(utmSource || "other");

  if (shareSignal) return { channel: "shared_link", source: utmSourceKind };
  if (paidSignal) return { channel: "paid_campaign", source: utmSourceKind };
  if (utmSource) {
    if (utmMedium === "organic" && isSearchSource(utmSourceKind)) return { channel: "organic_search", source: utmSourceKind };
    if (/social/.test(utmMedium) || isSocialSource(utmSourceKind)) return { channel: "social", source: utmSourceKind };
    if (/referral/.test(utmMedium)) return { channel: "referral", source: utmSourceKind };
    return { channel: "other", source: utmSourceKind };
  }

  if (!document.referrer) return { channel: "direct", source: "direct" };
  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin === window.location.origin) return { channel: "direct", source: "direct" };
    const source = sourceFromHost(referrer.hostname);
    if (isSearchSource(source)) return { channel: "organic_search", source };
    if (isSocialSource(source)) return { channel: "social", source };
    return { channel: "referral", source };
  } catch {
    return { channel: "other", source: "other" };
  }
}

function getFirstAcquisition(isNewVisitor: boolean): Acquisition | null {
  try {
    const stored = window.localStorage.getItem(ACQUISITION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<Acquisition>;
      if (typeof parsed.channel === "string" && typeof parsed.source === "string") {
        return parsed as Acquisition;
      }
    }
    // Existing browsers predate first-touch tracking; do not relabel a later
    // direct visit as their original acquisition source.
    if (!isNewVisitor) return null;
    const inferred = inferAcquisition();
    window.localStorage.setItem(ACQUISITION_KEY, JSON.stringify(inferred));
    return inferred;
  } catch {
    return isNewVisitor ? inferAcquisition() : null;
  }
}

function isOperatorNavigation(): boolean {
  if (window.location.pathname.startsWith("/admin")) return true;
  if (window.location.pathname !== "/auth/login") return false;
  const returnTo = new URLSearchParams(window.location.search).get("returnTo");
  return returnTo === "/admin" || returnTo?.startsWith("/admin/") === true;
}

type JourneyEvent =
  | "PRODUCT_SELECTED" | "PRODUCT_DETAIL_VIEWED" | "CHECKOUT_VIEWED"
  | "REPORT_PAGE_OPENED" | "AI_CHAT_PAGE_OPENED";
type JourneySource = "recommendations" | "deep-analysis" | "compatibility" | "other";

function sourceForPath(path: string): JourneySource {
  if (path.startsWith("/recommendations") || path === "/result") return "recommendations";
  if (path.startsWith("/deep-analysis")) return "deep-analysis";
  if (path.startsWith("/special-analysis/compatibility")) return "compatibility";
  return "other";
}

function productFromPath(path: string): { id: string; stage: "detail" | "checkout" | "report" } | null {
  const match = path.match(/^\/(paid-analysis|checkout)\/([a-z0-9][a-z0-9-]{0,79})(\/report)?\/?$/);
  if (!match) return null;
  return {
    id: match[2],
    stage: match[1] === "checkout" ? "checkout" : match[3] ? "report" : "detail",
  };
}

function track(eventName: JourneyEvent, visitorId: string, productId: string | null, source: JourneySource): void {
  void fetch("/api/analytics/journey", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, visitorId, productId, source }),
    keepalive: true,
  }).catch(() => undefined);
}

export default function AnalyticsVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (isOperatorNavigation()) return;
    const visitor = getOrCreateVisitor();
    if (!visitor) return;
    const visitorId = visitor.id;
    const acquisition = getFirstAcquisition(visitor.isNew);
    void fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId,
        acquisitionChannel: acquisition?.channel ?? null,
        acquisitionSource: acquisition?.source ?? null,
      }),
      keepalive: true,
    }).catch(() => undefined);

    const path = pathname ?? window.location.pathname;
    const product = productFromPath(path);
    if (product) {
      const stage: JourneyEvent = product.stage === "checkout" ? "CHECKOUT_VIEWED"
        : product.stage === "report" ? "REPORT_PAGE_OPENED" : "PRODUCT_DETAIL_VIEWED";
      track(stage, visitorId, product.id, sourceForPath(path));
    } else if (/^\/special-analysis\/compatibility\/.+\/report\/?$/.test(path)) {
      track("REPORT_PAGE_OPENED", visitorId, null, "compatibility");
    } else if (path === "/ai-consulting" || path.startsWith("/ai-consulting/")) {
      track("AI_CHAT_PAGE_OPENED", visitorId, null, "other");
    }
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (isOperatorNavigation()) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      const product = productFromPath(destination.pathname);
      if (!product || product.stage === "report") return;
      const visitor = getOrCreateVisitor();
      if (visitor) track("PRODUCT_SELECTED", visitor.id, product.id, sourceForPath(window.location.pathname));
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
