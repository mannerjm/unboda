import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { AccountAccessError, requireVerifiedEmailAccount } from "@/app/lib/accounts/server";
import {
  NICE_PUBLIC_ORIGIN,
  NiceGatewayError,
  startNiceGatewayVerification,
} from "@/app/lib/identity/niceGateway";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_STARTS_PER_HOUR = 5;

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function POST() {
  let auth;
  try {
    auth = await requireVerifiedEmailAccount();
  } catch (error) {
    if (error instanceof AccountAccessError) {
      if (error.code === "AUTHENTICATION_REQUIRED") {
        return noStoreJson({ error: "로그인이 필요합니다." }, { status: 401 });
      }
      if (error.code === "EMAIL_NOT_VERIFIED") {
        return noStoreJson({ error: "본인확인 전에 이메일 인증을 완료해 주세요." }, { status: 403 });
      }
      return noStoreJson({ error: "현재 계정 상태에서는 본인확인을 진행할 수 없습니다." }, { status: 403 });
    }
    console.error("[nice-identity-start] account check failed");
    return noStoreJson({ error: "본인확인을 시작하지 못했습니다." }, { status: 500 });
  }

  if (auth.account.paidEligibilityStatus === "VERIFIED_ADULT") {
    return noStoreJson({ error: "이미 본인/성인 인증이 완료되었습니다." }, { status: 409 });
  }

  const admin = createAdminClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from("identity_verification_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.id)
    .gte("created_at", oneHourAgo);

  if (countError) {
    console.error("[nice-identity-start] rate limit lookup failed");
    return noStoreJson({ error: "본인확인을 시작하지 못했습니다." }, { status: 500 });
  }
  if ((count ?? 0) >= MAX_STARTS_PER_HOUR) {
    return noStoreJson(
      { error: "본인확인 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const nowIso = new Date().toISOString();
  const { error: supersedeError } = await admin
    .from("identity_verification_sessions")
    .update({
      status: "SUPERSEDED",
      outcome_code: "SUPERSEDED",
      provider_context: null,
      completed_at: nowIso,
    })
    .eq("user_id", auth.id)
    .eq("status", "PENDING");

  if (supersedeError) {
    console.error("[nice-identity-start] supersede failed");
    return noStoreJson({ error: "본인확인을 시작하지 못했습니다." }, { status: 500 });
  }

  const state = randomBytes(32).toString("base64url");
  const stateHash = createHash("sha256").update(state, "utf8").digest("hex");
  const returnUrl = `${NICE_PUBLIC_ORIGIN}/api/identity/nice/callback?state=${encodeURIComponent(state)}`;
  const closeUrl = `${NICE_PUBLIC_ORIGIN}/api/identity/nice/close?state=${encodeURIComponent(state)}`;

  let gateway;
  try {
    gateway = await startNiceGatewayVerification({ returnUrl, closeUrl });
  } catch (error) {
    const code = error instanceof NiceGatewayError ? error.code : "GATEWAY_ERROR";
    console.error("[nice-identity-start] gateway failed", { code });
    return noStoreJson(
      { error: "본인확인 기관 연결에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }

  const expiresAt = new Date(gateway.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    return noStoreJson({ error: "본인확인을 시작하지 못했습니다." }, { status: 502 });
  }

  const { error: insertError } = await admin.from("identity_verification_sessions").insert({
    user_id: auth.id,
    provider: "NICE",
    state_hash: stateHash,
    provider_context: gateway.providerContext,
    status: "PENDING",
    expires_at: expiresAt.toISOString(),
  });

  if (insertError) {
    console.error("[nice-identity-start] session insert failed");
    return noStoreJson({ error: "본인확인을 시작하지 못했습니다." }, { status: 500 });
  }

  return noStoreJson({ authUrl: gateway.authUrl });
}
