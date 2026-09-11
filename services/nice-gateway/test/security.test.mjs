import test from "node:test";
import assert from "node:assert/strict";
import { createReplayGuard, signGatewayRequest, verifyGatewayRequest } from "../src/security.mjs";

const secret = "a".repeat(64);
const base = {
  method: "POST",
  path: "/v1/nice/_probe",
  body: Buffer.from("{}"),
  timestamp: "1789101000",
  nonce: "nonce_1234567890123456",
};

test("valid signed request verifies once", () => {
  const replayGuard = createReplayGuard();
  const signature = signGatewayRequest(secret, base);
  assert.equal(
    verifyGatewayRequest({
      secret,
      ...base,
      signature,
      nowSeconds: 1789101000,
      replayGuard,
    }),
    true,
  );
  assert.throws(
    () =>
      verifyGatewayRequest({
        secret,
        ...base,
        signature,
        nowSeconds: 1789101000,
        replayGuard,
      }),
    /REPLAY_DETECTED/,
  );
});

test("tampered body fails signature verification", () => {
  const signature = signGatewayRequest(secret, base);
  assert.throws(
    () =>
      verifyGatewayRequest({
        secret,
        ...base,
        body: Buffer.from('{"tampered":true}'),
        signature,
        nowSeconds: 1789101000,
      }),
    /INVALID_SIGNATURE/,
  );
});

test("stale request fails closed", () => {
  const signature = signGatewayRequest(secret, base);
  assert.throws(
    () =>
      verifyGatewayRequest({
        secret,
        ...base,
        signature,
        nowSeconds: 1789102000,
      }),
    /STALE_REQUEST/,
  );
});
