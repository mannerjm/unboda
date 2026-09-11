"use client";

import { useEffect } from "react";

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

export default function AnalyticsVisitTracker() {
  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) return;
    const visitorId = getOrCreateVisitorId();
    if (!visitorId) return;

    void fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId }),
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  return null;
}
