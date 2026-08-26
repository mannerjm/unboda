import { randomUUID } from "node:crypto";
import { getTossConfig } from "./config";

export type TossPaymentStatus =
  | "READY"
  | "IN_PROGRESS"
  | "WAITING_FOR_DEPOSIT"
  | "DONE"
  | "CANCELED"
  | "PARTIAL_CANCELED"
  | "ABORTED"
  | "EXPIRED";

export type TossConfirmResponse = {
  paymentKey: string;
  orderId: string;
  totalAmount: number;
  status: TossPaymentStatus;
  method: string | null;
  currency: string;
  mId: string | null;
  approvedAt: string | null;
};

export type TossPaymentLookupResponse = TossConfirmResponse & {
  balanceAmount?: number;
  cancels?: TossCancellationResponse["cancels"];
};
export type TossCancellationResponse = TossConfirmResponse & {
  balanceAmount: number;
  cancels: Array<{
    transactionKey: string;
    cancelAmount: number;
    cancelStatus: string;
    canceledAt: string;
    refundableAmount: number;
  }>;
};

export type TossFailureRetryability =
  | "RETRYABLE"
  | "NON_RETRYABLE"
  | "OWNER_ESCALATION_REQUIRED";

export type TossConfirmationFailure = {
  provider: "toss";
  httpStatus: number;
  providerErrorCode: string;
  safeMessage: string;
  failureStage: "confirmation";
  retryability: TossFailureRetryability;
  correlationId: string;
  occurredAt: string;
};

export type TossCancellationFailure = Omit<TossConfirmationFailure, "failureStage"> & {
  failureStage: "cancellation";
};

function sanitizeProviderMessage(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const sanitized = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/(?:pay|tgen|test)[_-]?[A-Za-z0-9_-]{12,}/gi, "[redacted]")
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .trim();
  return sanitized.slice(0, 240) || fallback;
}

function normalizeProviderCode(value: unknown): string {
  if (typeof value !== "string") return "UNKNOWN_PROVIDER_ERROR";
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9_]{1,80}$/.test(code) ? code : "UNKNOWN_PROVIDER_ERROR";
}

function classifyRetryability(
  status: number,
  providerErrorCode: string,
): TossFailureRetryability {
  if (status >= 500 || status === 408 || status === 429 || providerErrorCode === "NETWORK_ERROR") {
    return "RETRYABLE";
  }
  if (status === 400 || status === 401 || status === 403 || status === 409) {
    return "NON_RETRYABLE";
  }
  return "OWNER_ESCALATION_REQUIRED";
}

export class TossConfirmationError extends Error {
  readonly failure: TossConfirmationFailure;

  constructor(failure: TossConfirmationFailure) {
    super(failure.safeMessage);
    this.name = "TossConfirmationError";
    this.failure = failure;
  }
}

export async function confirmPaymentWithToss(input: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<TossConfirmResponse> {
  const { apiBaseUrl, secretKey } = getTossConfig();

  if (!input.paymentKey || !input.orderId || !Number.isFinite(input.amount)) {
    throw new TossConfirmationError({
      provider: "toss", httpStatus: 400, providerErrorCode: "INVALID_REQUEST",
      safeMessage: "잘못된 Toss 결제 확인 값입니다.", failureStage: "confirmation",
      retryability: "NON_RETRYABLE", correlationId: randomUUID(), occurredAt: new Date().toISOString(),
    });
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/payments/confirm`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey: input.paymentKey, orderId: input.orderId, amount: input.amount }),
    });
  } catch {
    throw new TossConfirmationError({
      provider: "toss", httpStatus: 503, providerErrorCode: "NETWORK_ERROR",
      safeMessage: "Toss 결제 확인 서버에 연결하지 못했습니다.", failureStage: "confirmation",
      retryability: "RETRYABLE", correlationId: randomUUID(), occurredAt: new Date().toISOString(),
    });
  }

  if (!response.ok) {
    let providerErrorCode = "UNKNOWN_PROVIDER_ERROR";
    let providerMessage = `Toss 결제 확인이 실패했습니다. (${response.status})`;

    try {
      const payload = (await response.json()) as { code?: unknown; message?: unknown };
      providerErrorCode = normalizeProviderCode(payload.code);
      providerMessage = sanitizeProviderMessage(payload.message, providerMessage);
    } catch {
      // ignore JSON parsing failure and keep a safe fallback message
    }

    throw new TossConfirmationError({
      provider: "toss", httpStatus: response.status, providerErrorCode,
      safeMessage: providerMessage, failureStage: "confirmation",
      retryability: classifyRetryability(response.status, providerErrorCode),
      correlationId: randomUUID(), occurredAt: new Date().toISOString(),
    });
  }

  const payload = (await response.json()) as Partial<TossConfirmResponse>;

  if (
    !payload.paymentKey ||
    !payload.orderId ||
    typeof payload.totalAmount !== "number" ||
    !payload.status
  ) {
    throw new TossConfirmationError({
      provider: "toss", httpStatus: 502, providerErrorCode: "MALFORMED_PROVIDER_RESPONSE",
      safeMessage: "Toss 응답이 올바르지 않습니다.", failureStage: "confirmation",
      retryability: "OWNER_ESCALATION_REQUIRED", correlationId: randomUUID(), occurredAt: new Date().toISOString(),
    });
  }

  return {
    paymentKey: payload.paymentKey,
    orderId: payload.orderId,
    totalAmount: payload.totalAmount,
    status: payload.status,
    method: payload.method ?? null,
    currency: payload.currency ?? "KRW",
    mId: payload.mId ?? null,
    approvedAt: payload.approvedAt ?? null,
  };
}

export async function getPaymentByOrderIdFromToss(
  orderId: string,
): Promise<TossPaymentLookupResponse> {
  const { apiBaseUrl, secretKey } = getTossConfig();
  const response = await fetch(
    `${apiBaseUrl}/payments/orders/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      },
    },
  );

  if (!response.ok) {
    throw new TossConfirmationError({
      provider: "toss", httpStatus: response.status, providerErrorCode: "LOOKUP_FAILED",
      safeMessage: `Toss 결제 조회가 실패했습니다. (${response.status})`, failureStage: "confirmation",
      retryability: response.status >= 500 ? "RETRYABLE" : "NON_RETRYABLE",
      correlationId: randomUUID(), occurredAt: new Date().toISOString(),
    });
  }

  const payload = (await response.json()) as Partial<TossPaymentLookupResponse>;

  if (
    !payload.paymentKey ||
    !payload.orderId ||
    typeof payload.totalAmount !== "number" ||
    !payload.status
  ) {
    throw new TossConfirmationError({
      provider: "toss", httpStatus: 502, providerErrorCode: "MALFORMED_PROVIDER_RESPONSE",
      safeMessage: "Toss 조회 응답이 올바르지 않습니다.", failureStage: "confirmation",
      retryability: "OWNER_ESCALATION_REQUIRED", correlationId: randomUUID(), occurredAt: new Date().toISOString(),
    });
  }

  return {
    paymentKey: payload.paymentKey,
    orderId: payload.orderId,
    totalAmount: payload.totalAmount,
    status: payload.status,
    method: payload.method ?? null,
    currency: payload.currency ?? "KRW",
    mId: payload.mId ?? null,
    approvedAt: payload.approvedAt ?? null,
    balanceAmount: payload.balanceAmount,
    cancels: payload.cancels,
  };
}

export class TossCancellationError extends Error {
  readonly failure: TossCancellationFailure;

  constructor(failure: TossCancellationFailure) {
    super(failure.safeMessage);
    this.name = "TossCancellationError";
    this.failure = failure;
  }
}

export async function cancelPaymentWithToss(input: {
  paymentKey: string;
  cancelReason: string;
}): Promise<TossCancellationResponse> {
  const { apiBaseUrl, secretKey } = getTossConfig();
  if (!input.paymentKey || !input.cancelReason || input.cancelReason.length > 200) {
    throw new TossCancellationError({
      provider: "toss", httpStatus: 400, providerErrorCode: "INVALID_CANCEL_REQUEST",
      safeMessage: "취소 요청 정보가 올바르지 않습니다.", failureStage: "cancellation",
      retryability: "NON_RETRYABLE", correlationId: randomUUID(), occurredAt: new Date().toISOString(),
    });
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/payments/${encodeURIComponent(input.paymentKey)}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cancelReason: input.cancelReason }),
    });
  } catch {
    throw new TossCancellationError({
      provider: "toss", httpStatus: 503, providerErrorCode: "NETWORK_ERROR",
      safeMessage: "결제 취소 서버에 연결하지 못했습니다.", failureStage: "cancellation",
      retryability: "RETRYABLE", correlationId: randomUUID(), occurredAt: new Date().toISOString(),
    });
  }

  if (!response.ok) {
    let code = "UNKNOWN_PROVIDER_ERROR";
    let message = `결제 취소에 실패했습니다. (${response.status})`;
    try {
      const payload = await response.json() as { code?: unknown; message?: unknown };
      code = normalizeProviderCode(payload.code);
      message = sanitizeProviderMessage(payload.message, message);
    } catch { /* preserve safe fallback */ }
    throw new TossCancellationError({
      provider: "toss", httpStatus: response.status, providerErrorCode: code,
      safeMessage: message, failureStage: "cancellation",
      retryability: response.status >= 500 || response.status === 408 || response.status === 429 ? "RETRYABLE" : "NON_RETRYABLE",
      correlationId: randomUUID(), occurredAt: new Date().toISOString(),
    });
  }

  const payload = await response.json() as Partial<TossCancellationResponse>;
  const cancel = payload.cancels?.[payload.cancels.length - 1];
  if (!payload.paymentKey || !payload.orderId || payload.status !== "CANCELED" || !cancel || cancel.cancelStatus !== "DONE") {
    throw new TossCancellationError({
      provider: "toss", httpStatus: 502, providerErrorCode: "MALFORMED_CANCELLATION_RESPONSE",
      safeMessage: "Toss 취소 응답이 올바르지 않습니다.", failureStage: "cancellation",
      retryability: "OWNER_ESCALATION_REQUIRED", correlationId: randomUUID(), occurredAt: new Date().toISOString(),
    });
  }
  return {
    paymentKey: payload.paymentKey,
    orderId: payload.orderId,
    totalAmount: payload.totalAmount ?? 0,
    status: payload.status,
    method: payload.method ?? null,
    currency: payload.currency ?? "KRW",
    mId: payload.mId ?? null,
    approvedAt: payload.approvedAt ?? null,
    balanceAmount: payload.balanceAmount ?? 0,
    cancels: payload.cancels ?? [],
  };
}