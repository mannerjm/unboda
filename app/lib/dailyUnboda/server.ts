import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import type { ProfileDto } from "../profiles/types";
import { getSaju } from "../manse";
import {
  buildTodayReading,
  DAILY_COPY_VERSION,
  getTodayDayPillar,
  getTodayYearPillar,
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
      birthTimeKnown: profile.birthTimeKnown ?? null,
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
        profile.birthTimeKnown,
      );
      return buildTodayReading({
        date,
        personDayStem: saju.dayStem,
        personDayBranch: saju.dayBranch,
        personYearPillarHanja: saju.yearPillarHanja,
        personMonthPillarHanja: saju.monthPillarHanja,
        // No saved profile field confirms that ANY birth time is verified,
        // including times other than the form default 12:00. A decade-cycle
        // start age can depend on the actual time: omit the decade cycle from
        // free daily copy until an explicit verified/unknown distinction exists.
        // Do not pass the hour pillar. Neither rule modifies the paid engine.
        // Use today's solar-term year pillar for the DAILY annual context,
        // rather than calculateSeun's January-1 civil-year boundary.
        currentSeunGanji: getTodayYearPillar(date),
        currentDaeunGanji: profile.birthTimeKnown === true ? saju.currentDaeun?.ganji ?? null : null,
        ...(profile.birthTimeKnown === true && saju.hourPillarHanja ? { verifiedHourPillarHanja: saju.hourPillarHanja } : {}),
        dayPillarHanja: getTodayDayPillar(date),
      });
    },
    ["today-reading", DAILY_COPY_VERSION, userId, profile.id, fingerprint, date],
    { revalidate: 86400 },
  );

  return cached();
}
