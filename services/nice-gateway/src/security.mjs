import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_VERSION = "v1";
const DEFAULT_MAX_SKEW_SECONDS = 300;

export function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function buildCanonicalRequest({ method, path, timestamp, nonce, body = "" }) {
  return [
    SIGNATURE_VERSION,
    String(method || "").toUpperCase(),
    String(path || ""),
    String(timestamp || ""),
    String(nonce || ""),
    sha256Hex(body),
  ].join("\n");
}

export function signGatewayRequest(secret, input) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("GATEWAY_SHARED_SECRET_TOO_SHORT");
  }
  const canonical = buildCanonicalRequest(input);
  return createHmac("sha256", secret).update(canonical).digest("hex");
}

export function createReplayGuard() {
  const seen = new Map();

  return {
    assertFresh(nonce, nowSeconds, ttlSeconds) {
      for (const [key, expiresAt] of seen) {
        if (expiresAt <= nowSeconds) seen.delete(key);
      }
      if (seen.has(nonce)) throw new Error("REPLAY_DETECTED");
      seen.set(nonce, nowSeconds + ttlSeconds);
    },
  };
}

export function verifyGatewayRequest({
  secret,
  method,
  path,
  body = "",
  timestamp,
  nonce,
  signature,
  nowSeconds = Math.floor(Date.now() / 1000),
  maxSkewSeconds = DEFAULT_MAX_SKEW_SECONDS,
  replayGuard,
}) {
  if (typeof secret !== "string" || secret.length < 32) throw new Error("GATEWAY_SECRET_NOT_CONFIGURED");
  if (!/^\d{10}$/.test(String(timestamp || ""))) throw new Error("INVALID_TIMESTAMP");
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(String(nonce || ""))) throw new Error("INVALID_NONCE");
  if (!/^[a-f0-9]{64}$/i.test(String(signature || ""))) throw new Error("INVALID_SIGNATURE");

  const ts = Number(timestamp);
  if (!Number.isSafeInteger(ts) || Math.abs(nowSeconds - ts) > maxSkewSeconds) {
    throw new Error("STALE_REQUEST");
  }

  const expected = signGatewayRequest(secret, { method, path, timestamp, nonce, body });
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error("INVALID_SIGNATURE");
  }

  replayGuard?.assertFresh(nonce, nowSeconds, maxSkewSeconds);
  return true;
}
