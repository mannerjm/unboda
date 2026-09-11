import { createHash } from "node:crypto";
import { NICE_PUBLIC_ORIGIN } from "@/app/lib/identity/niceGateway";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getCurrentUser } from "@/app/lib/supabase/auth";

export const runtime = "nodejs";

function closeResponse() {
  const payload = JSON.stringify({
    type: "unboda:nice-verification",
    status: "cancelled",
    message: "본인확인이 취소되었습니다.",
  });
  const targetOrigin = JSON.stringify(NICE_PUBLIC_ORIGIN);
  const accountUrl = JSON.stringify(`${NICE_PUBLIC_ORIGIN}/account?nice=cancelled`);
  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>본인확인</title></head>
<body><p>본인확인이 취소되었습니다.</p><script>
try { if (window.opener) window.opener.postMessage(${payload}, ${targetOrigin}); } catch (_) {}
try { window.close(); } catch (_) {}
setTimeout(function(){ if (!window.closed) window.location.replace(${accountUrl}); }, 500);
</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'",
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(state)) return closeResponse();

  const user = await getCurrentUser();
  if (!user) return closeResponse();

  const stateHash = createHash("sha256").update(state, "utf8").digest("hex");
  const completedAt = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("identity_verification_sessions")
    .update({
      status: "CANCELLED",
      outcome_code: "CANCELLED",
      provider_context: null,
      completed_at: completedAt,
    })
    .eq("user_id", user.id)
    .eq("state_hash", stateHash)
    .eq("status", "PENDING");

  if (error) console.error("[nice-identity-close] cancellation persist failed");
  return closeResponse();
}
