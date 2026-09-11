import { createHash } from "node:crypto";
import { AccountAccessError, requireVerifiedEmailAccount } from "@/app/lib/accounts/server";
import {
  completeNiceGatewayVerification,
  NICE_ADULT_POLICY_VERSION,
  NICE_EVIDENCE_VERSION,
  NICE_PUBLIC_ORIGIN,
  NiceGatewayError,
} from "@/app/lib/identity/niceGateway";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getCurrentUser } from "@/app/lib/supabase/auth";

export const runtime = "nodejs";

function popupResponse(status: "success" | "underage" | "error", message: string, httpStatus = 200) {
  const payload = JSON.stringify({ type: "unboda:nice-verification", status, message });
  const targetOrigin = JSON.stringify(NICE_PUBLIC_ORIGIN);
  const accountUrl = JSON.stringify(`${NICE_PUBLIC_ORIGIN}/account?nice=${status}`);
  const html = `<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>본인확인</title></head>
<body><p>${message}</p><script>
try { if (window.opener) window.opener.postMessage(${payload}, ${targetOrigin}); } catch (_) {}
try { window.close(); } catch (_) {}
setTimeout(function(){ if (!window.closed) window.location.replace(${accountUrl}); }, 500);
</script></body></html>`;
  return new Response(html, {
    status: httpStatus,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
    },
  });
}

async function markFailed(sessionId: string, outcomeCode: "PROVIDER_ERROR" | "ACCOUNT_NOT_ELIGIBLE") {
  await createAdminClient()
    .from("identity_verification_sessions")
    .update({
      status: "FAILED",
      outcome_code: outcomeCode,
      provider_context: null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("status", "PROCESSING");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const webTransactionId = url.searchParams.get("web_transaction_id") ?? "";

  if (!/^[A-Za-z0-9_-]{32,128}$/.test(state) || !/^[A-Za-z0-9_-]{1,100}$/.test(webTransactionId)) {
    return popupResponse("error", "유효하지 않은 본인확인 응답입니다.", 400);
  }

  const user = await getCurrentUser();
  if (!user) {
    return popupResponse("error", "로그인 상태를 확인할 수 없습니다. 다시 로그인한 뒤 시도해 주세요.", 401);
  }

  const stateHash = createHash("sha256").update(state, "utf8").digest("hex");
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: session, error: claimError } = await admin
    .from("identity_verification_sessions")
    .update({ status: "PROCESSING", claimed_at: nowIso })
    .eq("user_id", user.id)
    .eq("state_hash", stateHash)
    .eq("status", "PENDING")
    .gt("expires_at", nowIso)
    .select("id, provider_context")
    .maybeSingle();

  if (claimError) {
    console.error("[nice-identity-callback] claim failed");
    return popupResponse("error", "본인확인 처리 중 오류가 발생했습니다.", 500);
  }
  if (!session || typeof session.provider_context !== "string") {
    return popupResponse("error", "본인확인 요청이 만료되었거나 이미 처리되었습니다.", 409);
  }

  try {
    await requireVerifiedEmailAccount();
  } catch (error) {
    await markFailed(session.id, "ACCOUNT_NOT_ELIGIBLE");
    if (error instanceof AccountAccessError) {
      return popupResponse("error", "현재 계정 상태에서는 본인확인을 완료할 수 없습니다.", 403);
    }
    return popupResponse("error", "계정 상태 확인 중 오류가 발생했습니다.", 500);
  }

  let result;
  try {
    result = await completeNiceGatewayVerification({
      providerContext: session.provider_context,
      webTransactionId,
    });
  } catch (error) {
    const code = error instanceof NiceGatewayError ? error.code : "GATEWAY_ERROR";
    console.error("[nice-identity-callback] gateway completion failed", { code });
    await markFailed(session.id, "PROVIDER_ERROR");
    return popupResponse("error", "본인확인 결과를 확인하지 못했습니다. 다시 시도해 주세요.", 502);
  }

  if (
    result.policyVersion !== NICE_ADULT_POLICY_VERSION ||
    result.evidenceVersion !== NICE_EVIDENCE_VERSION
  ) {
    await markFailed(session.id, "PROVIDER_ERROR");
    return popupResponse("error", "본인확인 결과 정책 버전을 확인하지 못했습니다.", 502);
  }

  if (!result.adult) {
    const { error: completeError } = await admin
      .from("identity_verification_sessions")
      .update({
        status: "UNDERAGE",
        outcome_code: "UNDERAGE",
        evidence_version: result.evidenceVersion,
        policy_version: result.policyVersion,
        provider_context: null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", session.id)
      .eq("status", "PROCESSING");

    if (completeError) console.error("[nice-identity-callback] underage completion persist failed");
    return popupResponse("underage", "만 19세 미만은 유료 서비스를 이용할 수 없습니다.");
  }

  let verifiedAccount;
  try {
    verifiedAccount = await requireVerifiedEmailAccount();
  } catch {
    await markFailed(session.id, "ACCOUNT_NOT_ELIGIBLE");
    return popupResponse("error", "현재 계정 상태에서는 본인확인을 완료할 수 없습니다.", 403);
  }

  const eligibleAt = new Date().toISOString();
  const { data: updatedAccount, error: accountError } = await admin
    .from("account_lifecycles")
    .update({
      paid_eligibility_status: "VERIFIED_ADULT",
      paid_eligibility_method: "EXTERNAL_PROVIDER",
      paid_eligibility_provider: "NICE",
      paid_eligible_at: eligibleAt,
      paid_eligibility_policy_version: NICE_ADULT_POLICY_VERSION,
      paid_eligibility_invalidated_at: null,
    })
    .eq("user_id", user.id)
    .eq("generation", verifiedAccount.account.generation)
    .eq("status", "ACTIVE")
    .select("id")
    .maybeSingle();

  if (accountError || !updatedAccount) {
    console.error("[nice-identity-callback] account eligibility update failed");
    await markFailed(session.id, "ACCOUNT_NOT_ELIGIBLE");
    return popupResponse("error", "본인확인 상태를 계정에 반영하지 못했습니다.", 500);
  }

  const { error: sessionError } = await admin
    .from("identity_verification_sessions")
    .update({
      status: "VERIFIED_ADULT",
      outcome_code: "ADULT",
      evidence_version: result.evidenceVersion,
      policy_version: result.policyVersion,
      provider_context: null,
      completed_at: eligibleAt,
    })
    .eq("id", session.id)
    .eq("status", "PROCESSING");

  if (sessionError) {
    console.error("[nice-identity-callback] success audit persist failed");
  }

  return popupResponse("success", "본인/성인 인증이 완료되었습니다.");
}
