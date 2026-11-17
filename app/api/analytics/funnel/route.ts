import { NextResponse } from "next/server";
import { recordMarketingEvent, type MarketingEvent } from "@/app/lib/analytics/marketingServer";

const PUBLIC_EVENTS: readonly MarketingEvent[] = [
  "SITE_PAGE_VIEWED", "FREE_PAGE_VIEWED", "FREE_CTA_CLICKED", "FREE_FORM_STARTED",
  "FREE_SUBMIT_CLICKED", "FREE_RESULT_VIEWED",
];

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "잘못된 요청 출처입니다." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 512) {
    return NextResponse.json({ error: "잘못된 요청 크기입니다." }, { status: 413 });
  }
  const body = await request.json().catch(() => null) as { eventName?: unknown } | null;
  if (!body || typeof body.eventName !== "string"
    || !PUBLIC_EVENTS.includes(body.eventName as MarketingEvent)) {
    return NextResponse.json({ error: "잘못된 이벤트입니다." }, { status: 400 });
  }
  await recordMarketingEvent(request, body.eventName as MarketingEvent);
  return new NextResponse(null, { status: 204 });
}
