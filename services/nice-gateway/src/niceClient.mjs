import { randomBytes } from "node:crypto";

export const NICE_API_ORIGIN = "https://auth.niceid.co.kr";
const DEFAULT_TIMEOUT_MS = 7000;

export class NiceProviderError extends Error {
  constructor(code, { httpStatus = null, providerResultCode = null } = {}) {
    super(code);
    this.name = "NiceProviderError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.providerResultCode = providerResultCode;
  }
}

export function base64UrlEncode(value) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function createNiceRequestNo(prefix = "UB") {
  const now = new Date();
  const stamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
    String(now.getUTCHours()).padStart(2, "0"),
    String(now.getUTCMinutes()).padStart(2, "0"),
    String(now.getUTCSeconds()).padStart(2, "0"),
  ].join("");
  return `${prefix}${stamp}${randomBytes(8).toString("hex")}`.slice(0, 50);
}

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    throw new NiceProviderError("INVALID_PROVIDER_RESPONSE", { httpStatus: response.status });
  }
}

export async function requestNiceAccessToken({
  clientId,
  clientSecret,
  requestNo = createNiceRequestNo("UBT"),
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (!clientId || !clientSecret) throw new NiceProviderError("CREDENTIALS_NOT_CONFIGURED");
  if (requestNo.length < 20 || requestNo.length > 50) throw new NiceProviderError("INVALID_REQUEST_NO");

  let response;
  try {
    response = await fetchImpl(`${NICE_API_ORIGIN}/ido/intc/v1.0/auth/token`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Basic ${base64UrlEncode(`${clientId}:${clientSecret}`)}`,
        "x-intc-devlang": "Linux/Node.js",
      },
      body: JSON.stringify({ grant_type: "client_credentials", request_no: requestNo }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new NiceProviderError("PROVIDER_NETWORK_ERROR");
  }

  const data = await readJsonSafely(response);
  const providerResultCode = typeof data?.result_code === "string" ? data.result_code : null;

  if (!response.ok) {
    throw new NiceProviderError("PROVIDER_HTTP_ERROR", {
      httpStatus: response.status,
      providerResultCode,
    });
  }

  if (providerResultCode !== "0000") {
    throw new NiceProviderError("PROVIDER_REJECTED_REQUEST", {
      httpStatus: response.status,
      providerResultCode,
    });
  }

  if (
    typeof data.access_token !== "string" ||
    typeof data.ticket !== "string" ||
    !Number.isInteger(data.iterators)
  ) {
    throw new NiceProviderError("INVALID_PROVIDER_RESPONSE", {
      httpStatus: response.status,
      providerResultCode,
    });
  }

  return {
    resultCode: providerResultCode,
    accessToken: data.access_token,
    ticket: data.ticket,
    iterators: data.iterators,
    requestNo: typeof data.request_no === "string" ? data.request_no : requestNo,
  };
}

export async function probeNiceAccessToken(options = {}) {
  const result = await requestNiceAccessToken(options);
  return { ok: true, provider: "NICE", resultCode: result.resultCode };
}
