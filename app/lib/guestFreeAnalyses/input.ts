import "server-only";

import type { ProfileInput } from "../profiles/types";
import { validateProfileInput } from "../profiles/types";
import { GUEST_BIRTH_DATE_MIN, getGuestBirthDateMax, isGuestBirthDateInRange } from "./date";

export { GUEST_BIRTH_DATE_MIN, getGuestBirthDateMax } from "./date";

export function validateGuestProfileInput(input: unknown): ReturnType<typeof validateProfileInput> {
  const validated = validateProfileInput(input);
  if (!validated.valid) return validated;
  const profile = validated.value as ProfileInput;
  if (!isGuestBirthDateInRange(profile.birthDate)) {
    return { valid: false, error: `birthDate는 ${GUEST_BIRTH_DATE_MIN}부터 오늘까지여야 합니다.` };
  }
  return validated;
}