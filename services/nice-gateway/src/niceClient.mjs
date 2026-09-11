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

async function postNiceJson({ path, authorization, body, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  let response;
  try {
    response = await fetchImpl(`${NICE_API_ORIGIN}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization,
        "x-intc-devlang": "Linux/Node.js",
      },
      body: JSON.stringify(body),
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

  return { data, providerResultCode, httpStatus: response.status };
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

  const { data, providerResultCode, httpStatus } = await postNiceJson({
    path: "/ido/intc/v1.0/auth/token",
    authorization: `Basic ${base64UrlEncode(`${clientId}:${clientSecret}`)}`,
    body: { grant_type: "client_credentials", request_no: requestNo },
    fetchImpl,
    timeoutMs,
  });

  if (
    typeof data.access_token !== "string" ||
    typeof data.ticket !== "string" ||
    !Number.isInteger(data.iterators)
  ) {
    throw new NiceProviderError("INVALID_PROVIDER_RESPONSE", {
      httpStatus,
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

export async function requestNiceAuthUrl({
  accessToken,
  requestNo = createNiceRequestNo("UBA"),
  returnUrl,
  closeUrl,
  svcTypes = ["M"],
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (!accessToken) throw new NiceProviderError("ACCESS_TOKEN_NOT_CONFIGURED");
  if (requestNo.length < 20 || requestNo.length > 50) throw new NiceProviderError("INVALID_REQUEST_NO");
  if (typeof returnUrl !== "string" || returnUrl.length === 0 || returnUrl.length > 250) {
    throw new NiceProviderError("INVALID_RETURN_URL");
  }
  if (closeUrl !== undefined && (typeof closeUrl !== "string" || closeUrl.length > 250)) {
    throw new NiceProviderError("INVALID_CLOSE_URL");
  }
  if (!Array.isArray(svcTypes) || svcTypes.length === 0) throw new NiceProviderError("INVALID_SVC_TYPES");

  const body = {
    request_no: requestNo,
    return_url: returnUrl,
    svc_types: svcTypes,
    method_type: "GET",
    exp_mods: ["closeButtonOn"],
  };
  if (closeUrl) body.close_url = closeUrl;

  const { data, providerResultCode, httpStatus } = await postNiceJson({
    path: "/ido/intc/v1.0/auth/url",
    authorization: `Bearer ${accessToken}`,
    body,
    fetchImpl,
    timeoutMs,
  });

  if (typeof data.auth_url !== "string" || typeof data.transaction_id !== "string") {
    throw new NiceProviderError("INVALID_PROVIDER_RESPONSE", {
      httpStatus,
      providerResultCode,
    });
  }

  return {
    resultCode: providerResultCode,
    authUrl: data.auth_url,
    transactionId: data.transaction_id,
    requestNo: typeof data.request_no === "string" ? data.request_no : requestNo,
  };
}

export async function requestNiceResult({
  accessToken,
  webTransactionId,
  transactionId,
  requestNo,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (!accessToken) throw new NiceProviderError("ACCESS_TOKEN_NOT_CONFIGURED");
  if (typeof webTransactionId !== "string" || webTransactionId.length === 0 || webTransactionId.length > 100) {
    throw new NiceProviderError("INVALID_WEB_TRANSACTION_ID");
  }
  if (typeof transactionId !== "string" || transactionId.length === 0 || transactionId.length > 100) {
    throw new NiceProviderError("INVALID_TRANSACTION_ID");
  }
  if (typeof requestNo !== "string" || requestNo.length < 20 || requestNo.length > 50) {
    throw new NiceProviderError("INVALID_REQUEST_NO");
  }

  const { data, providerResultCode, httpStatus } = await postNiceJson({
    path: "/ido/intc/v1.0/auth/result",
    authorization: `Bearer ${accessToken}`,
    body: {
      web_transaction_id: webTransactionId,
      transaction_id: transactionId,
      request_no: requestNo,
    },
    fetchImpl,
    timeoutMs,
  });

  if (typeof data.enc_data !== "string" || typeof data.integrity_value !== "string") {
    throw new NiceProviderError("INVALID_PROVIDER_RESPONSE", {
      httpStatus,
      providerResultCode,
    });
  }

  return {
    resultCode: providerResultCode,
    encData: data.enc_data,
    integrityValue: data.integrity_value,
  };
}

export async function probeNiceAccessToken(options = {}) {
  const result = await requestNiceAccessToken(options);
  return { ok: true, provider: "NICE", resultCode: result.resultCode };
}
