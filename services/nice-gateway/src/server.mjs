import http from "node:http";
import { createReplayGuard, verifyGatewayRequest } from "./security.mjs";
import { NiceProviderError, probeNiceAccessToken } from "./niceClient.mjs";

const host = process.env.NICE_GATEWAY_HOST || "127.0.0.1";
const port = Number(process.env.NICE_GATEWAY_PORT || "8787");
const replayGuard = createReplayGuard();
const MAX_BODY_BYTES = 16 * 1024;

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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    return writeJson(res, 200, { ok: true });
  }

  if (req.method !== "POST" || url.pathname !== "/v1/nice/_probe") {
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

  try {
    const result = await probeNiceAccessToken({
      clientId: process.env.NICE_CLIENT_ID,
      clientSecret: process.env.NICE_CLIENT_SECRET,
    });
    return writeJson(res, 200, result);
  } catch (error) {
    if (error instanceof NiceProviderError) {
      return writeJson(res, 502, {
        ok: false,
        error: error.code,
        provider: "NICE",
        httpStatus: error.httpStatus,
        providerResultCode: error.providerResultCode,
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
