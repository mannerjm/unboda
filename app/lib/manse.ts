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
    monthPillar: saju.monthPillar,
    monthPillarHanja: saju.monthPillarHanja,
    dayPillar: saju.dayPillar,
    dayPillarHanja: saju.dayPillarHanja,
    hourPillar: saju.hourPillar,
    hourPillarHanja: saju.hourPillarHanja,
  };
}