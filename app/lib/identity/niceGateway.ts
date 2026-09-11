import { createHash, createHmac, randomBytes } from "node:crypto";

export const NICE_ADULT_POLICY_VERSION = "NICE_ADULT_19_V1";
export const NICE_EVIDENCE_VERSION = "NICE_INTC_V1";
export const NICE_PUBLIC_ORIGIN = "https://unboda.kr";

const SIGNATURE_VERSION = "v1";
const GATEWAY_TIMEOUT_MS = 20_000;

export class NiceGatewayError extends Error {
  constructor(
    readonly code: string,
    readonly httpStatus: number | null = null,
  ) {
    super(code);
    this.name = "NiceGatewayError";
  }
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function buildCanonicalRequest(input: {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  body: string;
}): string {
  return [
    SIGNATURE_VERSION,
    input.method.toUpperCase(),
    input.path,
    input.timestamp,
    input.nonce,
    sha256Hex(input.body),
  ].join("\n");
}

function getGatewayConfig(): { origin: string; secret: string } {
  const rawUrl = process.env.NICE_GATEWAY_URL;
  const secret = process.env.NICE_GATEWAY_SHARED_SECRET;
  if (!rawUrl || !secret || secret.length < 32) {
    throw new NiceGatewayError("GATEWAY_NOT_CONFIGURED");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new NiceGatewayError("GATEWAY_NOT_CONFIGURED");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new NiceGatewayError("GATEWAY_NOT_CONFIGURED");
  }
  return { origin: parsed.origin, secret };
}

async function callGateway<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const { origin, secret } = getGatewayConfig();
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = randomBytes(24).toString("base64url");
  const canonical = buildCanonicalRequest({ method: "POST", path, timestamp, nonce, body });
  const signature = createHmac("sha256", secret).update(canonical).digest("hex");

  let response: Response;
  try {
    response = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-unboda-timestamp": timestamp,
        "x-unboda-nonce": nonce,
        "x-unboda-signature": signature,
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
    });
  } catch {
    throw new NiceGatewayError("GATEWAY_NETWORK_ERROR");
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new NiceGatewayError("GATEWAY_INVALID_RESPONSE", response.status);
  }

  if (!response.ok) {
    const code =
      json && typeof json === "object" && "error" in json && typeof json.error === "string"
        ? json.error
        : "GATEWAY_REQUEST_FAILED";
    throw new NiceGatewayError(code, response.status);
  }

  return json as T;
}

export type NiceStartResult = {
  ok: true;
  provider: "NICE";
  authUrl: string;
  providerContext: string;
  expiresAt: string;
};

export type NiceCompletionResult = {
  ok: true;
  provider: "NICE";
  adult: boolean;
  policyVersion: string;
  evidenceVersion: string;
};

export async function startNiceGatewayVerification(input: {
  returnUrl: string;
  closeUrl: string;
}): Promise<NiceStartResult> {
  const result = await callGateway<NiceStartResult>("/v1/nice/auth-url", input);
  if (
    result?.ok !== true ||
    result.provider !== "NICE" ||
    typeof result.authUrl !== "string" ||
    typeof result.providerContext !== "string" ||
    typeof result.expiresAt !== "string"
  ) {
    throw new NiceGatewayError("GATEWAY_INVALID_RESPONSE");
  }
  const authUrl = new URL(result.authUrl);
  const expiresAt = new Date(result.expiresAt);
  if (authUrl.protocol !== "https:" || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    throw new NiceGatewayError("GATEWAY_INVALID_RESPONSE");
  }
  return result;
}

export async function completeNiceGatewayVerification(input: {
  providerContext: string;
  webTransactionId: string;
}): Promise<NiceCompletionResult> {
  const result = await callGateway<NiceCompletionResult>("/v1/nice/result", input);
  if (
    result?.ok !== true ||
    result.provider !== "NICE" ||
    typeof result.adult !== "boolean" ||
    result.policyVersion !== NICE_ADULT_POLICY_VERSION ||
    result.evidenceVersion !== NICE_EVIDENCE_VERSION
  ) {
    throw new NiceGatewayError("GATEWAY_INVALID_RESPONSE");
  }
  return result;
}
