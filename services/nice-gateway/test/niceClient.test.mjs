import test from "node:test";
import assert from "node:assert/strict";
import { base64UrlEncode, NiceProviderError, probeNiceAccessToken, requestNiceAccessToken } from "../src/niceClient.mjs";

const clientId = "client-id-example";
const clientSecret = "client-secret-example";

test("token request uses NICE basic base64url and returns secrets only to caller", async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url, init };
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          result_code: "0000",
          request_no: "A1234567890123456789",
          access_token: "access-token",
          ticket: "ticket-value",
          iterators: 66,
        };
      },
    };
  };

  const result = await requestNiceAccessToken({
    clientId,
    clientSecret,
    requestNo: "A1234567890123456789",
    fetchImpl,
  });

  assert.equal(captured.url, "https://auth.niceid.co.kr/ido/intc/v1.0/auth/token");
  assert.equal(captured.init.headers.authorization, `Basic ${base64UrlEncode(`${clientId}:${clientSecret}`)}`);
  assert.deepEqual(JSON.parse(captured.init.body), {
    grant_type: "client_credentials",
    request_no: "A1234567890123456789",
  });
  assert.equal(result.accessToken, "access-token");
  assert.equal(result.ticket, "ticket-value");
});

test("probe output never exposes access token or ticket", async () => {
  const result = await probeNiceAccessToken({
    clientId,
    clientSecret,
    requestNo: "A1234567890123456789",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          result_code: "0000",
          request_no: "A1234567890123456789",
          access_token: "access-token",
          ticket: "ticket-value",
          iterators: 66,
        };
      },
    }),
  });

  assert.deepEqual(result, { ok: true, provider: "NICE", resultCode: "0000" });
  assert.equal(JSON.stringify(result).includes("access-token"), false);
  assert.equal(JSON.stringify(result).includes("ticket-value"), false);
});

test("provider rejection is sanitized", async () => {
  await assert.rejects(
    () =>
      requestNiceAccessToken({
        clientId,
        clientSecret,
        requestNo: "A1234567890123456789",
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          async json() {
            return { result_code: "9999", result_message: "sensitive provider detail" };
          },
        }),
      }),
    (error) => {
      assert.equal(error instanceof NiceProviderError, true);
      assert.equal(error.code, "PROVIDER_REJECTED_REQUEST");
      assert.equal(error.providerResultCode, "9999");
      assert.equal(error.message.includes("sensitive provider detail"), false);
      return true;
    },
  );
});
