import test from "node:test";
import assert from "node:assert/strict";
import {
  NiceVerificationError,
  encryptSyntheticResultForTest,
  isAdult19ByBirthdate,
  sealProviderContext,
  unsealProviderContext,
  verifyAndClassifyNiceResult,
} from "../src/verification.mjs";

const gatewaySecret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

test("sealed provider context round-trips without plaintext token exposure", () => {
  const now = Date.UTC(2026, 8, 11, 0, 0, 0);
  const sealed = sealProviderContext(
    {
      accessToken: "secret-access-token",
      ticket: "secret-ticket",
      iterators: 66,
      transactionId: "transaction-id",
      requestNo: "A1234567890123456789",
    },
    gatewaySecret,
    now,
  );

  assert.equal(sealed.includes("secret-access-token"), false);
  assert.equal(sealed.includes("secret-ticket"), false);
  const opened = unsealProviderContext(sealed, gatewaySecret, now + 1000);
  assert.equal(opened.accessToken, "secret-access-token");
  assert.equal(opened.ticket, "secret-ticket");
  assert.equal(opened.transactionId, "transaction-id");
});

test("sealed provider context expires after NICE transaction window", () => {
  const now = Date.UTC(2026, 8, 11, 0, 0, 0);
  const sealed = sealProviderContext(
    {
      accessToken: "secret-access-token",
      ticket: "secret-ticket",
      iterators: 66,
      transactionId: "transaction-id",
      requestNo: "A1234567890123456789",
    },
    gatewaySecret,
    now,
  );

  assert.throws(
    () => unsealProviderContext(sealed, gatewaySecret, now + 10 * 60 * 1000 + 1),
    (error) => error instanceof NiceVerificationError && error.code === "PROVIDER_CONTEXT_EXPIRED",
  );
});

test("adult policy is 만 19세 using the Korea calendar date", () => {
  const kstNoon = new Date("2026-09-11T03:00:00.000Z");
  assert.equal(isAdult19ByBirthdate("20070911", kstNoon), true);
  assert.equal(isAdult19ByBirthdate("20070912", kstNoon), false);
});

test("NICE encrypted result is integrity-checked, decrypted, and reduced to adult boolean", () => {
  const ticket = "ticket-value";
  const transactionId = "transaction-id";
  const iterators = 66;
  const encrypted = encryptSyntheticResultForTest({
    payload: {
      name: "홍길동",
      birthdate: "20000101",
      mobile_no: "01012345678",
      ci: "sensitive-ci",
    },
    ticket,
    transactionId,
    iterators,
  });

  const result = verifyAndClassifyNiceResult({
    ...encrypted,
    ticket,
    transactionId,
    iterators,
    now: new Date("2026-09-11T03:00:00.000Z"),
  });

  assert.deepEqual(result, {
    adult: true,
    policyVersion: "NICE_ADULT_19_V1",
    evidenceVersion: "NICE_INTC_V1",
  });
  assert.equal(JSON.stringify(result).includes("홍길동"), false);
  assert.equal(JSON.stringify(result).includes("01012345678"), false);
  assert.equal(JSON.stringify(result).includes("sensitive-ci"), false);
});

test("tampered encrypted result fails integrity verification", () => {
  const ticket = "ticket-value";
  const transactionId = "transaction-id";
  const iterators = 66;
  const encrypted = encryptSyntheticResultForTest({
    payload: { birthdate: "20000101" },
    ticket,
    transactionId,
    iterators,
  });

  assert.throws(
    () =>
      verifyAndClassifyNiceResult({
        encData: `${encrypted.encData}A`,
        integrityValue: encrypted.integrityValue,
        ticket,
        transactionId,
        iterators,
      }),
    (error) => error instanceof NiceVerificationError && error.code === "INTEGRITY_CHECK_FAILED",
  );
});
