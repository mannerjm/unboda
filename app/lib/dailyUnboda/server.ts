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
        personYearPillarHanja: saju.yearPillarHanja,
        personMonthPillarHanja: saju.monthPillarHanja,
        // The saved profile has a default 12:00 time but no verified-time flag.
        // Never pass saju.hourPillarHanja as a confirmed birth-hour signal.
        // The current annual cycle requires no assumed birth hour. The decade
        // cycle's start age does: skip it when the profile still has the
        // unconfirmed 12:00 form default. Neither cycle changes paid reports.
        currentSeunGanji: saju.currentSeun?.ganji ?? null,
        currentDaeunGanji: profile.birthTime !== "12:00"
          ? saju.currentDaeun?.ganji ?? null
          : null,
        dayPillarHanja: getTodayDayPillar(date),
      });
    },
    ["today-reading", DAILY_COPY_VERSION, userId, profile.id, fingerprint, date],
    { revalidate: 86400 },
  );

  return cached();
}
