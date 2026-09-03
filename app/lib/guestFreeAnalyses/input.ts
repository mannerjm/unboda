import "server-only";

import type { ProfileInput } from "../profiles/types";
import { validateProfileInput } from "../profiles/types";
import { GUEST_BIRTH_DATE_MIN, getGuestBirthDateMax, isGuestBirthDateInRange } from "./date";

export { GUEST_BIRTH_DATE_MIN, getGuestBirthDateMax } from "./date";

export const GUEST_AGE_SELF_ATTESTATION_ERROR_CODE = "GUEST_AGE_SELF_ATTESTATION_REQUIRED";

export function hasGuestAgeSelfAttestation(input: unknown): input is { age14OrOlderConfirmed: true } {
  return typeof input === "object" && input !== null &&
    "age14OrOlderConfirmed" in input &&
    (input as { age14OrOlderConfirmed?: unknown }).age14OrOlderConfirmed === true;
}

export function guestAgeSelfAttestationError(): { code: string; error: string } {
  return {
    code: GUEST_AGE_SELF_ATTESTATION_ERROR_CODE,
    error: "서비스 이용자는 만 14세 이상이어야 합니다.",
  };
}

export function validateGuestProfileInput(input: unknown): ReturnType<typeof validateProfileInput> {
  const validated = validateProfileInput(input);
  if (!validated.valid) return validated;
  const profile = validated.value as ProfileInput;
  if (!isGuestBirthDateInRange(profile.birthDate)) {
    return { valid: false, error: `birthDate는 ${GUEST_BIRTH_DATE_MIN}부터 오늘까지여야 합니다.` };
  }
  return validated;
}