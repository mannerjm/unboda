import http from "node:http";
import { createReplayGuard, verifyGatewayRequest } from "./security.mjs";
import {
  NiceProviderError,
  probeNiceAccessToken,
  requestNiceAccessToken,
  requestNiceAuthUrl,
  requestNiceResult,
} from "./niceClient.mjs";
import {
  NiceVerificationError,
  sealProviderContext,
  unsealProviderContext,
  verifyAndClassifyNiceResult,
} from "./verification.mjs";

const host = process.env.NICE_GATEWAY_HOST || "127.0.0.1";
const port = Number(process.env.NICE_GATEWAY_PORT || "8787");
const replayGuard = createReplayGuard();
const MAX_BODY_BYTES = 16 * 1024;
const ALLOWED_PUBLIC_ORIGIN = process.env.NICE_PUBLIC_ORIGIN || "https://unboda.kr";
const protectedPaths = new Set([
  "/v1/nice/_probe",
  "/v1/nice/auth-url",
  "/v1/nice/result",
]);

function writeJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function parseJsonBody(body) {
  try {
    const parsed = JSON.parse(body.toString("utf8") || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_JSON");
    return parsed;
  } catch {
    throw new NiceVerificationError("INVALID_REQUEST_BODY");
  }
}

function requireSignedRequest(req, path, body) {
  verifyGatewayRequest({
    secret: process.env.NICE_GATEWAY_SHARED_SECRET,
    method: req.method,
    path,
    body,
    timestamp: req.headers["x-unboda-timestamp"],
    nonce: req.headers["x-unboda-nonce"],
    signature: req.headers["x-unboda-signature"],
    replayGuard,
  });
}

function assertAllowedReturnUrl(value, expectedPath) {
  if (typeof value !== "string" || value.length === 0 || value.length > 250) {
    throw new NiceVerificationError("INVALID_RETURN_URL");
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new NiceVerificationError("INVALID_RETURN_URL");
  }
  if (parsed.origin !== ALLOWED_PUBLIC_ORIGIN || parsed.pathname !== expectedPath) {
    throw new NiceVerificationError("INVALID_RETURN_URL");
  }
  return parsed.toString();
}

function assertProviderAuthUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new NiceVerificationError("INVALID_PROVIDER_AUTH_URL");
  }
  const allowedHosts = new Set([
    "auth.niceid.co.kr",
    "nice.checkplus.co.kr",
    "cert.vno.co.kr",
    "cert.niceid.co.kr",
  ]);
  if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname)) {
    throw new NiceVerificationError("INVALID_PROVIDER_AUTH_URL");
  }
  return parsed.toString();
}

function writeProviderError(res, error) {
  return writeJson(res, 502, {
    ok: false,
    error: error.code,
    provider: "NICE",
    httpStatus: error.httpStatus,
    providerResultCode: error.providerResultCode,
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    return writeJson(res, 200, { ok: true });
  }

  if (req.method !== "POST" || !protectedPaths.has(url.pathname)) {
    return writeJson(res, 404, { error: "NOT_FOUND" });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return writeJson(res, 413, { error: "PAYLOAD_TOO_LARGE" });
  }

  try {
    requireSignedRequest(req, url.pathname, body);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNAUTHORIZED";
    if (code === "GATEWAY_SECRET_NOT_CONFIGURED") {
      return writeJson(res, 503, { error: "GATEWAY_NOT_CONFIGURED" });
    }
    return writeJson(res, 401, { error: "UNAUTHORIZED" });
  }

  let payload;
  try {
    payload = parseJsonBody(body);
  } catch {
    return writeJson(res, 400, { error: "INVALID_REQUEST" });
  }

  try {
    if (url.pathname === "/v1/nice/_probe") {
      const result = await probeNiceAccessToken({
        clientId: process.env.NICE_CLIENT_ID,
        clientSecret: process.env.NICE_CLIENT_SECRET,
      });
      return writeJson(res, 200, result);
    }

    if (url.pathname === "/v1/nice/auth-url") {
      const returnUrl = assertAllowedReturnUrl(payload.returnUrl, "/api/identity/nice/callback");
      const closeUrl = assertAllowedReturnUrl(payload.closeUrl, "/api/identity/nice/close");
      const token = await requestNiceAccessToken({
        clientId: process.env.NICE_CLIENT_ID,
        clientSecret: process.env.NICE_CLIENT_SECRET,
      });
      const auth = await requestNiceAuthUrl({
        accessToken: token.accessToken,
        returnUrl,
        closeUrl,
        svcTypes: ["M"],
      });
      const authUrl = assertProviderAuthUrl(auth.authUrl);
      const now = Date.now();
      const providerContext = sealProviderContext(
        {
          accessToken: token.accessToken,
          ticket: token.ticket,
          iterators: token.iterators,
          transactionId: auth.transactionId,
          requestNo: auth.requestNo,
        },
        process.env.NICE_GATEWAY_SHARED_SECRET,
        now,
      );
      return writeJson(res, 200, {
        ok: true,
        provider: "NICE",
        authUrl,
        providerContext,
        expiresAt: new Date(now + 10 * 60 * 1000).toISOString(),
      });
    }

    if (url.pathname === "/v1/nice/result") {
      if (
        typeof payload.providerContext !== "string" ||
        typeof payload.webTransactionId !== "string" ||
        !/^[A-Za-z0-9_-]{1,100}$/.test(payload.webTransactionId)
      ) {
        return writeJson(res, 400, { error: "INVALID_REQUEST" });
      }
      const context = unsealProviderContext(
        payload.providerContext,
        process.env.NICE_GATEWAY_SHARED_SECRET,
      );
      const providerResult = await requestNiceResult({
        accessToken: context.accessToken,
        webTransactionId: payload.webTransactionId,
        transactionId: context.transactionId,
        requestNo: context.requestNo,
      });
      const classification = verifyAndClassifyNiceResult({
        encData: providerResult.encData,
        integrityValue: providerResult.integrityValue,
        ticket: context.ticket,
        transactionId: context.transactionId,
        iterators: context.iterators,
      });
      return writeJson(res, 200, {
        ok: true,
        provider: "NICE",
        adult: classification.adult,
        policyVersion: classification.policyVersion,
        evidenceVersion: classification.evidenceVersion,
      });
    }

    return writeJson(res, 404, { error: "NOT_FOUND" });
  } catch (error) {
    if (error instanceof NiceProviderError) return writeProviderError(res, error);
    if (error instanceof NiceVerificationError) {
      const providerFaultCodes = new Set([
        "INTEGRITY_CHECK_FAILED",
        "INVALID_ENCRYPTED_RESULT",
        "DECRYPTION_FAILED",
        "INVALID_DECRYPTED_RESULT",
        "BIRTHDATE_NOT_AVAILABLE",
        "INVALID_BIRTHDATE",
        "INVALID_PROVIDER_AUTH_URL",
      ]);
      return writeJson(res, providerFaultCodes.has(error.code) ? 502 : 422, {
        ok: false,
        error: error.code,
        provider: "NICE",
      });
    }
    return writeJson(res, 502, { ok: false, error: "PROVIDER_UNKNOWN_ERROR", provider: "NICE" });
  }
});

server.requestTimeout = 10_000;
server.headersTimeout = 12_000;
server.keepAliveTimeout = 5_000;

server.listen(port, host, () => {
  console.log(`nice-gateway listening on ${host}:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
