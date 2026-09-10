export const GUEST_BIRTH_DATE_MIN = "1900-01-01";

const KOREA_UTC_OFFSET_MS = 9 * 60 * 60 * 1000;

function formatKoreaCalendarDate(now: Date): string {
  const koreaTime = new Date(now.getTime() + KOREA_UTC_OFFSET_MS);
  const year = koreaTime.getUTCFullYear();
  const month = String(koreaTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(koreaTime.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getGuestBirthDateMax(now: Date = new Date()): string {
  return formatKoreaCalendarDate(now);
}

export function isGuestBirthDateInRange(birthDate: string, now: Date = new Date()): boolean {
  return birthDate >= GUEST_BIRTH_DATE_MIN && birthDate <= getGuestBirthDateMax(now);
}
