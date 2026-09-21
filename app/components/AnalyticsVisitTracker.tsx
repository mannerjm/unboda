"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISITOR_KEY = "unboda.analytics.visitor.v1";

function getOrCreateVisitorId(): string | null {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    return null;
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
    const visitorId = getOrCreateVisitorId();
    if (!visitorId) return;
    void fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId }),
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
      const visitorId = getOrCreateVisitorId();
      if (visitorId) track("PRODUCT_SELECTED", visitorId, product.id, sourceForPath(window.location.pathname));
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
