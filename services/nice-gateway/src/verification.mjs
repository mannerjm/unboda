import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const CONTEXT_AAD = Buffer.from("unboda:nice-context:v1", "utf8");
const CONTEXT_PREFIX = "v1.";
const CONTEXT_TTL_MS = 10 * 60 * 1000;
export const NICE_ADULT_POLICY_VERSION = "NICE_ADULT_19_V1";
export const NICE_EVIDENCE_VERSION = "NICE_INTC_V1";

export class NiceVerificationError extends Error {
  constructor(code) {
    super(code);
    this.name = "NiceVerificationError";
    this.code = code;
  }
}

function deriveContextKey(secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new NiceVerificationError("GATEWAY_SECRET_NOT_CONFIGURED");
  }
  return createHash("sha256")
    .update("unboda:nice:sealed-context:v1\0", "utf8")
    .update(secret, "utf8")
    .digest();
}

export function sealProviderContext(context, secret, now = Date.now()) {
  const payload = {
    version: 1,
    accessToken: context.accessToken,
    ticket: context.ticket,
    iterators: context.iterators,
    transactionId: context.transactionId,
    requestNo: context.requestNo,
    expiresAt: now + CONTEXT_TTL_MS,
  };

  if (
    typeof payload.accessToken !== "string" ||
    typeof payload.ticket !== "string" ||
    !Number.isInteger(payload.iterators) ||
    typeof payload.transactionId !== "string" ||
    typeof payload.requestNo !== "string"
  ) {
    throw new NiceVerificationError("INVALID_PROVIDER_CONTEXT");
  }

  const key = deriveContextKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(CONTEXT_AAD);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${CONTEXT_PREFIX}${Buffer.concat([iv, tag, ciphertext]).toString("base64url")}`;
}

export function unsealProviderContext(value, secret, now = Date.now()) {
  if (typeof value !== "string" || !value.startsWith(CONTEXT_PREFIX)) {
    throw new NiceVerificationError("INVALID_PROVIDER_CONTEXT");
  }

  let packed;
  try {
    packed = Buffer.from(value.slice(CONTEXT_PREFIX.length), "base64url");
  } catch {
    throw new NiceVerificationError("INVALID_PROVIDER_CONTEXT");
  }
  if (packed.length < 12 + 16 + 1) throw new NiceVerificationError("INVALID_PROVIDER_CONTEXT");

  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const ciphertext = packed.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", deriveContextKey(secret), iv);
  decipher.setAAD(CONTEXT_AAD);
  decipher.setAuthTag(tag);

  let parsed;
  try {
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    parsed = JSON.parse(plaintext);
  } catch {
    throw new NiceVerificationError("INVALID_PROVIDER_CONTEXT");
  }

  if (
    parsed?.version !== 1 ||
    typeof parsed.accessToken !== "string" ||
    typeof parsed.ticket !== "string" ||
    !Number.isInteger(parsed.iterators) ||
    typeof parsed.transactionId !== "string" ||
    typeof parsed.requestNo !== "string" ||
    !Number.isFinite(parsed.expiresAt)
  ) {
    throw new NiceVerificationError("INVALID_PROVIDER_CONTEXT");
  }
  if (parsed.expiresAt <= now) throw new NiceVerificationError("PROVIDER_CONTEXT_EXPIRED");

  return parsed;
}

function deriveNiceKeys(ticket, transactionId, iterators) {
  if (
    typeof ticket !== "string" ||
    typeof transactionId !== "string" ||
    !Number.isInteger(iterators) ||
    iterators <= 0 ||
    iterators > 1_000_000
  ) {
    throw new NiceVerificationError("INVALID_PROVIDER_CONTEXT");
  }

  const raw = pbkdf2Sync(ticket, transactionId, iterators, 64, "sha256");
  const keyString = raw.toString("base64url");
  return {
    encryptionKey: Buffer.from(keyString.slice(0, 32), "utf8"),
    hmacKey: keyString.slice(48, 80),
  };
}

function verifyIntegrity(encData, integrityValue, hmacKey) {
  const expected = createHmac("sha256", hmacKey).update(encData, "utf8").digest("base64url");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(String(integrityValue || ""), "utf8");
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    throw new NiceVerificationError("INTEGRITY_CHECK_FAILED");
  }
}

function decryptResult(encData, encryptionKey) {
  let packed;
  try {
    packed = Buffer.from(encData, "base64url");
  } catch {
    throw new NiceVerificationError("INVALID_ENCRYPTED_RESULT");
  }
  if (packed.length <= 32) throw new NiceVerificationError("INVALID_ENCRYPTED_RESULT");

  const iv = packed.subarray(0, 16);
  const cipherAndTag = packed.subarray(16);
  const cipherText = cipherAndTag.subarray(0, cipherAndTag.length - 16);
  const tag = cipherAndTag.subarray(cipherAndTag.length - 16);

  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(cipherText), decipher.final()]).toString("utf8");
  } catch {
    throw new NiceVerificationError("DECRYPTION_FAILED");
  }
}

function parseBirthdate(value) {
  if (typeof value !== "string" || !/^\d{8}$/.test(value)) {
    throw new NiceVerificationError("BIRTHDATE_NOT_AVAILABLE");
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    throw new NiceVerificationError("INVALID_BIRTHDATE");
  }
  return { year, month, day };
}

function getKstDateParts(now) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function isAdult19ByBirthdate(birthdate, now = new Date()) {
  const birth = parseBirthdate(birthdate);
  const current = getKstDateParts(now);
  let age = current.year - birth.year;
  if (current.month < birth.month || (current.month === birth.month && current.day < birth.day)) {
    age -= 1;
  }
  return age >= 19;
}

export function verifyAndClassifyNiceResult({
  encData,
  integrityValue,
  ticket,
  transactionId,
  iterators,
  now = new Date(),
}) {
  if (typeof encData !== "string" || typeof integrityValue !== "string") {
    throw new NiceVerificationError("INVALID_PROVIDER_RESPONSE");
  }

  const { encryptionKey, hmacKey } = deriveNiceKeys(ticket, transactionId, iterators);
  verifyIntegrity(encData, integrityValue, hmacKey);
  const plaintext = decryptResult(encData, encryptionKey);

  let result;
  try {
    result = JSON.parse(plaintext);
  } catch {
    throw new NiceVerificationError("INVALID_DECRYPTED_RESULT");
  }

  return {
    adult: isAdult19ByBirthdate(result?.birthdate, now),
    policyVersion: NICE_ADULT_POLICY_VERSION,
    evidenceVersion: NICE_EVIDENCE_VERSION,
  };
}

// Test helper: creates a provider-shaped encrypted result without exposing it to runtime callers.
export function encryptSyntheticResultForTest({ payload, ticket, transactionId, iterators, iv = Buffer.alloc(16, 7) }) {
  const { encryptionKey, hmacKey } = deriveNiceKeys(ticket, transactionId, iterators);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const cipherText = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const encData = Buffer.concat([iv, cipherText, tag]).toString("base64url");
  const integrityValue = createHmac("sha256", hmacKey).update(encData, "utf8").digest("base64url");
  return { encData, integrityValue };
}
