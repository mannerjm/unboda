/* 운보다 PWA: network-only. Never cache sessions, payments, reports, AI chats or API data. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate" || event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() =>
      new Response(
        '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>인터넷 연결 확인 | 운보다</title><body style="font-family:system-ui,sans-serif;background:#f5f7fc;color:#11162d;padding:48px 20px;text-align:center"><h1>인터넷 연결을 확인해 주세요</h1><p>운보다는 안전한 분석 및 결제를 위해 인터넷 연결이 필요합니다.</p><p>연결 후 다시 열어 주세요.</p></body></html>',
        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
      )
    )
  );
});
