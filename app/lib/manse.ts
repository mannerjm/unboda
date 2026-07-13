import {
  calculateSaju,
  lunarToSolar,
} from "@fullstackfamily/manseryeok";

export function getSaju(
  birthDate: string,
  birthTime: string,
  calendarType: "양력" | "음력",
  isLeapMonth: "평달" | "윤달"
) {
  const [year, month, day] = birthDate.split("-").map(Number);
  const [hour, minute] = birthTime.split(":").map(Number);

  let solarYear = year;
  let solarMonth = month;
  let solarDay = day;

  if (calendarType === "음력") {
    const converted = lunarToSolar(
      year,
      month,
      day,
      isLeapMonth === "윤달"
    );

    solarYear = converted.solar.year;
    solarMonth = converted.solar.month;
    solarDay = converted.solar.day;
  }

  const saju = calculateSaju(
    solarYear,
    solarMonth,
    solarDay,
    hour,
    minute
  );

  return {
     solarDate: `${solarYear}-${String(solarMonth).padStart(2, "0")}-${String(
    solarDay
  ).padStart(2, "0")}`,

  yearPillar: saju.yearPillar,
  yearPillarHanja: saju.yearPillarHanja,
  yearStem: saju.yearPillarHanja[0],
  yearBranch: saju.yearPillarHanja[1],

  monthPillar: saju.monthPillar,
  monthPillarHanja: saju.monthPillarHanja,
  monthStem: saju.monthPillarHanja[0],
  monthBranch: saju.monthPillarHanja[1],

  dayPillar: saju.dayPillar,
  dayPillarHanja: saju.dayPillarHanja,
  dayStem: saju.dayPillarHanja[0],
  dayBranch: saju.dayPillarHanja[1],

  hourPillar: saju.hourPillar,
hourPillarHanja: saju.hourPillarHanja ?? "",
hourStem: saju.hourPillarHanja?.[0] ?? "",
hourBranch: saju.hourPillarHanja?.[1] ?? "",
};
}