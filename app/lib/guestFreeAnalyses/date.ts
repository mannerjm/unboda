export const GUEST_BIRTH_DATE_MIN = "1900-01-01";

export function getGuestBirthDateMax(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isGuestBirthDateInRange(birthDate: string): boolean {
  return birthDate >= GUEST_BIRTH_DATE_MIN && birthDate <= getGuestBirthDateMax();
}