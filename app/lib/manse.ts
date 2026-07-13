import {
  calculateSaju,
  lunarToSolar,
} from "@fullstackfamily/manseryeok";
type StemInfo = {
  element: "목" | "화" | "토" | "금" | "수";
  polarity: "양" | "음";
};

const stemInfoMap: Record<string, StemInfo> = {
  甲: { element: "목", polarity: "양" },
  乙: { element: "목", polarity: "음" },
  丙: { element: "화", polarity: "양" },
  丁: { element: "화", polarity: "음" },
  戊: { element: "토", polarity: "양" },
  己: { element: "토", polarity: "음" },
  庚: { element: "금", polarity: "양" },
  辛: { element: "금", polarity: "음" },
  壬: { element: "수", polarity: "양" },
  癸: { element: "수", polarity: "음" },
};

const generates: Record<StemInfo["element"], StemInfo["element"]> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

const controls: Record<StemInfo["element"], StemInfo["element"]> = {
  목: "토",
  화: "금",
  토: "수",
  금: "목",
  수: "화",
};
const branchHiddenStem: Record<string, string> = {
  子: "癸",
  丑: "己",
  寅: "甲",
  卯: "乙",
  辰: "戊",
  巳: "丙",
  午: "丁",
  未: "己",
  申: "庚",
  酉: "辛",
  戌: "戊",
  亥: "壬",
};
const branchHiddenStems: Record<string, string[]> = {
  子: ["癸"],
  丑: ["己", "癸", "辛"],
  寅: ["甲", "丙", "戊"],
  卯: ["乙"],
  辰: ["戊", "乙", "癸"],
  巳: ["丙", "戊", "庚"],
  午: ["丁", "己"],
  未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"],
  酉: ["辛"],
  戌: ["戊", "辛", "丁"],
  亥: ["壬", "甲"],
};

function getTenGod(dayStem: string, targetStem: string) {
  const day = stemInfoMap[dayStem];
  const target = stemInfoMap[targetStem];

  if (!day || !target) {
    return "";
  }

  const samePolarity = day.polarity === target.polarity;

  if (day.element === target.element) {
    return samePolarity ? "비견" : "겁재";
  }

  if (generates[day.element] === target.element) {
    return samePolarity ? "식신" : "상관";
  }

  if (controls[day.element] === target.element) {
    return samePolarity ? "편재" : "정재";
  }

  if (controls[target.element] === day.element) {
    return samePolarity ? "편관" : "정관";
  }

  if (generates[target.element] === day.element) {
    return samePolarity ? "편인" : "정인";
  }

  return "";
}
const twelveStages = [
  "장생",
  "목욕",
  "관대",
  "건록",
  "제왕",
  "쇠",
  "병",
  "사",
  "묘",
  "절",
  "태",
  "양",
] as const;

const branchOrder = [
  "子",
  "丑",
  "寅",
  "卯",
  "辰",
  "巳",
  "午",
  "未",
  "申",
  "酉",
  "戌",
  "亥",
] as const;

const stageStartBranch: Record<string, string> = {
  甲: "亥",
  乙: "午",
  丙: "寅",
  丁: "酉",
  戊: "寅",
  己: "酉",
  庚: "巳",
  辛: "子",
  壬: "申",
  癸: "卯",
};

const yangStems = new Set(["甲", "丙", "戊", "庚", "壬"]);

function getTwelveStage(dayStem: string, targetBranch: string) {
  const startBranch = stageStartBranch[dayStem];

  if (!startBranch || !targetBranch) {
    return "";
  }

  const startIndex = branchOrder.indexOf(
    startBranch as (typeof branchOrder)[number]
  );

  const targetIndex = branchOrder.indexOf(
    targetBranch as (typeof branchOrder)[number]
  );

  if (startIndex === -1 || targetIndex === -1) {
    return "";
  }

  const isYang = yangStems.has(dayStem);

  const distance = isYang
    ? (targetIndex - startIndex + 12) % 12
    : (startIndex - targetIndex + 12) % 12;

  return twelveStages[distance];
}
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
  const yearStage = getTwelveStage(
  saju.dayPillarHanja[0],
  saju.yearPillarHanja[1]
);

const monthStage = getTwelveStage(
  saju.dayPillarHanja[0],
  saju.monthPillarHanja[1]
);

const dayStage = getTwelveStage(
  saju.dayPillarHanja[0],
  saju.dayPillarHanja[1]
);

const hourStage = getTwelveStage(
  saju.dayPillarHanja[0],
  saju.hourPillarHanja?.[1] ?? ""
);

  return {
     solarDate: `${solarYear}-${String(solarMonth).padStart(2, "0")}-${String(
    solarDay
  ).padStart(2, "0")}`,

  yearPillar: saju.yearPillar,
  yearPillarHanja: saju.yearPillarHanja,
  yearStem: saju.yearPillarHanja[0],
  yearBranch: saju.yearPillarHanja[1],
  yearHiddenStems:
  branchHiddenStems[saju.yearPillarHanja[1]] ?? [],
  yearTenGod: getTenGod(
  saju.dayPillarHanja[0],
  saju.yearPillarHanja[0]
),
yearBranchTenGod: getTenGod(
  saju.dayPillarHanja[0],
  branchHiddenStem[saju.yearPillarHanja[1]] ?? ""
),
yearStage,


  monthPillar: saju.monthPillar,
  monthPillarHanja: saju.monthPillarHanja,
  monthStem: saju.monthPillarHanja[0],
  monthBranch: saju.monthPillarHanja[1],
  monthHiddenStems:
  branchHiddenStems[saju.monthPillarHanja[1]] ?? [],
  monthTenGod: getTenGod(
  saju.dayPillarHanja[0],
  saju.monthPillarHanja[0]
),
monthBranchTenGod: getTenGod(
  saju.dayPillarHanja[0],
  branchHiddenStem[saju.monthPillarHanja[1]] ?? ""
),
monthStage,


  dayPillar: saju.dayPillar,
  dayPillarHanja: saju.dayPillarHanja,
  dayStem: saju.dayPillarHanja[0],
  dayBranch: saju.dayPillarHanja[1],
  dayHiddenStems:
  branchHiddenStems[saju.dayPillarHanja[1]] ?? [],
  dayTenGod: "일원",
dayBranchTenGod: getTenGod(
  saju.dayPillarHanja[0],
  branchHiddenStem[saju.dayPillarHanja[1]] ?? ""
),
dayStage,

  hourPillar: saju.hourPillar,
hourPillarHanja: saju.hourPillarHanja ?? "",
hourStem: saju.hourPillarHanja?.[0] ?? "",
hourBranch: saju.hourPillarHanja?.[1] ?? "",
hourHiddenStems:
  branchHiddenStems[saju.hourPillarHanja?.[1] ?? ""] ?? [],
hourTenGod: getTenGod(
  saju.dayPillarHanja[0],
  saju.hourPillarHanja?.[0] ?? ""
),
hourBranchTenGod: getTenGod(
  saju.dayPillarHanja[0],
  branchHiddenStem[saju.hourPillarHanja?.[1] ?? ""] ?? ""
),
hourStage,
};
}