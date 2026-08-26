import { readFileSync } from "fs";
import { join } from "path";
import {
  confirmPaymentWithToss,
  TossConfirmationError,
} from "../app/lib/toss/server";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const env = process.env as Record<string, string | undefined>;
env.NODE_ENV = "test";
process.env.TOSS_SECRET_KEY = "test_sk_failure_observability";
process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = "test_ck_failure_observability";

const originalFetch = globalThis.fetch;

async function expectFailure(
  status: number,
  body: BodyInit | null,
  expectedCode: string,
  expectedRetryability: string,
): Promise<void> {
  globalThis.fetch = async () => new Response(body, { status });

  try {
    await confirmPaymentWithToss({
      paymentKey: "pay_test_redacted",
      orderId: "order-test-failure",
      amount: 16900,
    });
    throw new Error("expected confirmation failure");
  } catch (error) {
    assert(error instanceof TossConfirmationError, "provider failure must use structured error");
    if (!(error instanceof TossConfirmationError)) return;
    assert(error.failure.provider === "toss", "failure provider must be Toss");
    assert(error.failure.httpStatus === status, "HTTP status must be preserved");
    assert(error.failure.providerErrorCode === expectedCode, "provider error code must be preserved safely");
    assert(error.failure.retryability === expectedRetryability, "retryability must be explicit");
    assert(error.failure.failureStage === "confirmation", "failure stage must be confirmation");
    assert(error.failure.correlationId.length > 0, "correlation id must be present");
    const serialized = JSON.stringify(error.failure);
    assert(!serialized.includes("test_sk_failure_observability"), "secret must not be serialized");
    assert(!serialized.includes("Authorization"), "authorization must not be serialized");
    assert(!serialized.includes("pay_test_redacted"), "payment key must not be serialized");
  }
}

async function main(): Promise<void> {
  await expectFailure(400, JSON.stringify({ code: "INVALID_REQUEST", message: "요청이 올바르지 않습니다." }), "INVALID_REQUEST", "NON_RETRYABLE");
  await expectFailure(401, JSON.stringify({ code: "UNAUTHORIZED_KEY", message: "인증에 실패했습니다." }), "UNAUTHORIZED_KEY", "NON_RETRYABLE");
  await expectFailure(409, JSON.stringify({ code: "ALREADY_PROCESSED_PAYMENT", message: "이미 처리된 결제입니다." }), "ALREADY_PROCESSED_PAYMENT", "NON_RETRYABLE");
  await expectFailure(500, JSON.stringify({ code: "PROVIDER_TEMPORARY_ERROR", message: "일시적인 오류입니다." }), "PROVIDER_TEMPORARY_ERROR", "RETRYABLE");
  await expectFailure(502, "not-json", "UNKNOWN_PROVIDER_ERROR", "RETRYABLE");

  globalThis.fetch = originalFetch;

  const route = read("app/api/orders/[orderId]/confirm-payment/route.ts");
  assert(route.includes("recordTossConfirmationFailure"), "route must persist confirmation failures");
  assert(route.includes("success: false"), "route must return structured failure response");
  assert(route.includes("retryable:"), "route must return retryability");
  assert(route.includes("providerErrorCode"), "route event must include provider error code");

  const server = read("app/lib/purchases/server.ts");
  for (const field of [
    "last_confirmation_http_status",
    "last_provider_error_code",
    "last_provider_error_message",
    "last_confirmation_attempt_at",
    "last_confirmation_retryability",
    "last_confirmation_correlation_id",
  ]) {
    assert(server.includes(field), `server must persist ${field}`);
  }

  const migration = read("supabase/migrations/019_toss_confirmation_failure_observability.sql");
  for (const field of [
    "last_confirmation_http_status",
    "last_provider_error_code",
    "last_provider_error_message",
    "last_confirmation_retryability",
  ]) {
    assert(migration.includes(field), `migration must define ${field}`);
  }

  console.log("toss confirmation failure observability regression passed");
}

main().catch((error: unknown) => {
  globalThis.fetch = originalFetch;
  console.error(error);
  process.exitCode = 1;
});
