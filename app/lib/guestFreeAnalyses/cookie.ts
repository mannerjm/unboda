import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const GUEST_ANALYSIS_COOKIE_NAME = "unboda_guest_analysis";
export const GUEST_ANALYSIS_TTL_SECONDS = 24 * 60 * 60;

export type GuestAnalysisCredential = {
  analysisId: string;
  secret: string;
};

export function createGuestAnalysisCredential(analysisId: string): GuestAnalysisCredential {
  return {
    analysisId,
    secret: randomBytes(32).toString("base64url"),
  };
}

export function encodeGuestAnalysisCredential(credential: GuestAnalysisCredential): string {
  return `${credential.analysisId}.${credential.secret}`;
}

export function parseGuestAnalysisCredential(value: string | undefined): GuestAnalysisCredential | null {
  if (!value) return null;

  const separator = value.indexOf(".");
  if (separator <= 0 || separator === value.length - 1) return null;

  const analysisId = value.slice(0, separator);
  const secret = value.slice(separator + 1);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(analysisId);
  const isBase64Url = /^[A-Za-z0-9_-]{40,}$/.test(secret);

  return isUuid && isBase64Url ? { analysisId, secret } : null;
}

export function hashGuestAnalysisSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export const guestAnalysisCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: GUEST_ANALYSIS_TTL_SECONDS,
};