import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import type { ProfileDto } from "../profiles/types";
import { getSaju } from "../manse";
import {
  buildTodayReading,
  DAILY_COPY_VERSION,
  getTodayDayPillar,
} from "../dailyUnboda";

/**
 * The server authenticates the account and loads its current self profile BEFORE
 * entering the cache. Never cache auth, profile lookup, or the rendered page.
 *
 * The cached value is only the short daily reading (not the full natal chart).
 * It is keyed by account, profile, canonical birth inputs, KST date and copy
 * version. Changing birth details or the publication day cannot reuse an old
 * reading, and another account cannot read this account's entry.
 */
export async function getCachedTodayReading(
  userId: string,
  profile: ProfileDto,
  date: string,
) {
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
      calendarType: profile.calendarType,
      isLeapMonth: profile.isLeapMonth,
      gender: profile.gender,
    }))
    .digest("hex");

  const cached = unstable_cache(
    async () => {
      const saju = getSaju(
        profile.birthDate,
        profile.birthTime,
        profile.calendarType,
        profile.isLeapMonth ? "윤달" : "평달",
        profile.gender,
        date,
      );
      return buildTodayReading({
        date,
        personDayStem: saju.dayStem,
        personDayBranch: saju.dayBranch,
        dayPillarHanja: getTodayDayPillar(date),
      });
    },
    ["today-reading", DAILY_COPY_VERSION, userId, profile.id, fingerprint, date],
    { revalidate: 86400 },
  );

  return cached();
}
