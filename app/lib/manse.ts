import { getTenGod } from "./tenGod";
import { analyzeGyeokguk } from "./gyeokguk";
import { analyzeYongshin } from "./yongshin";
import { analyzeFortuneBrain } from "./fortuneBrain";
import { analyzeElementRelations } from "./elementRelations";
import { calculateStrength } from "./strength";
import {
  calculateSaju,
  lunarToSolar,
} from "@fullstackfamily/manseryeok";
import { calculateWeightedElements } from "./elements";
import { interpretElementAnalysis } from "./elementInterpretation";


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
const twelveSpiritOrder = [
  "겁살",
  "재살",
  "천살",
  "지살",
  "년살",
  "월살",
  "망신살",
  "장성살",
  "반안살",
  "역마살",
  "육해살",
  "화개살",
] as const;

const twelveSpiritStartBranch: Record<string, string> = {
  // 寅午戌 그룹은 亥부터 겁살
  寅: "亥",
  午: "亥",
  戌: "亥",

  // 申子辰 그룹은 巳부터 겁살
  申: "巳",
  子: "巳",
  辰: "巳",

  // 巳酉丑 그룹은 寅부터 겁살
  巳: "寅",
  酉: "寅",
  丑: "寅",

  // 亥卯未 그룹은 申부터 겁살
  亥: "申",
  卯: "申",
  未: "申",
};

function getTwelveSpirit(
  baseBranch: string,
  targetBranch: string
) {
  const startBranch = twelveSpiritStartBranch[baseBranch];

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

  const distance = (targetIndex - startIndex + 12) % 12;

  return twelveSpiritOrder[distance];
}
const heavenlyNobleBranches: Record<string, string[]> = {
  甲: ["丑", "未"],
  乙: ["子", "申"],
  丙: ["亥", "酉"],
  丁: ["酉", "亥"],
  戊: ["丑", "未"],
  己: ["子", "申"],
  庚: ["丑", "未"],
  辛: ["寅", "午"],
  壬: ["卯", "巳"],
  癸: ["卯", "巳"],
};

function hasHeavenlyNoble(
  dayStem: string,
  targetBranch: string
) {
  const nobleBranches = heavenlyNobleBranches[dayStem];

  if (!nobleBranches || !targetBranch) {
    return false;
  }

  return nobleBranches.includes(targetBranch);
}
const heavenlyVirtueMap: Record<
  string,
  { type: "stem" | "branch"; value: string }
> = {
  寅: { type: "stem", value: "丁" },
  卯: { type: "branch", value: "申" },
  辰: { type: "stem", value: "壬" },
  巳: { type: "stem", value: "辛" },
  午: { type: "branch", value: "亥" },
  未: { type: "stem", value: "甲" },
  申: { type: "stem", value: "癸" },
  酉: { type: "branch", value: "寅" },
  戌: { type: "stem", value: "丙" },
  亥: { type: "stem", value: "乙" },
  子: { type: "branch", value: "巳" },
  丑: { type: "stem", value: "庚" },
};

const monthlyVirtueStemMap: Record<string, string> = {
  寅: "丙",
  午: "丙",
  戌: "丙",

  亥: "甲",
  卯: "甲",
  未: "甲",

  申: "壬",
  子: "壬",
  辰: "壬",

  巳: "庚",
  酉: "庚",
  丑: "庚",
};

function hasHeavenlyVirtue(
  monthBranch: string,
  targetStem: string,
  targetBranch: string
) {
  const condition = heavenlyVirtueMap[monthBranch];

  if (!condition) {
    return false;
  }

  return condition.type === "stem"
    ? targetStem === condition.value
    : targetBranch === condition.value;
}

function hasMonthlyVirtue(
  monthBranch: string,
  targetStem: string
) {
  const virtueStem = monthlyVirtueStemMap[monthBranch];

  if (!virtueStem) {
    return false;
  }

  return targetStem === virtueStem;
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

const baseBranch = saju.dayPillarHanja[1];

const yearSpirit = getTwelveSpirit(
  baseBranch,
  saju.yearPillarHanja[1]
);

const monthSpirit = getTwelveSpirit(
  baseBranch,
  saju.monthPillarHanja[1]
);

const daySpirit = getTwelveSpirit(
  baseBranch,
  saju.dayPillarHanja[1]
);

const hourSpirit = getTwelveSpirit(
  baseBranch,
  saju.hourPillarHanja?.[1] ?? ""
);

const dayStem = saju.dayPillarHanja[0];

const yearNoble = hasHeavenlyNoble(
  dayStem,
  saju.yearPillarHanja[1]
);

const monthNoble = hasHeavenlyNoble(
  dayStem,
  saju.monthPillarHanja[1]
);

const dayNoble = hasHeavenlyNoble(
  dayStem,
  saju.dayPillarHanja[1]
);

const hourNoble = hasHeavenlyNoble(
  dayStem,
  saju.hourPillarHanja?.[1] ?? ""
);
function getNobleList(
  targetStem: string,
  targetBranch: string
) {
  const nobles: string[] = [];

  if (
    hasHeavenlyNoble(
      saju.dayPillarHanja[0],
      targetBranch
    )
  ) {
    nobles.push("천을귀인");
  }

  if (
    hasHeavenlyVirtue(
      saju.monthPillarHanja[1],
      targetStem,
      targetBranch
    )
  ) {
    nobles.push("천덕귀인");
  }

  if (
    hasMonthlyVirtue(
      saju.monthPillarHanja[1],
      targetStem
    )
  ) {
    nobles.push("월덕귀인");
  }

  return nobles;
}
const yearNobles = getNobleList(
  saju.yearPillarHanja[0],
  saju.yearPillarHanja[1]
);

const monthNobles = getNobleList(
  saju.monthPillarHanja[0],
  saju.monthPillarHanja[1]
);

const dayNobles = getNobleList(
  saju.dayPillarHanja[0],
  saju.dayPillarHanja[1]
);

const hourNobles = getNobleList(
  saju.hourPillarHanja?.[0] ?? "",
  saju.hourPillarHanja?.[1] ?? ""
);

const elementAnalysis = calculateWeightedElements(
  [
    saju.yearPillarHanja[0],
    saju.monthPillarHanja[0],
    saju.dayPillarHanja[0],
    saju.hourPillarHanja?.[0] ?? "",
  ],
  [
    saju.yearPillarHanja[1],
    saju.monthPillarHanja[1],
    saju.dayPillarHanja[1],
    saju.hourPillarHanja?.[1] ?? "",
  ]
);
const elementInterpretation =
  interpretElementAnalysis(elementAnalysis);

  const strengthAnalysis = calculateStrength(
  saju.dayPillarHanja[0],
  elementAnalysis
);

const yongshinAnalysis = analyzeYongshin(
  saju.dayPillarHanja[0],
  saju.monthPillarHanja[1],
  strengthAnalysis,
  elementAnalysis
);

const gyeokgukAnalysis = analyzeGyeokguk({
  dayStem: saju.dayPillarHanja[0],

  yearStem: saju.yearPillarHanja[0],
  monthStem: saju.monthPillarHanja[0],
  hourStem: saju.hourPillarHanja?.[0] ?? "",

  yearBranch: saju.yearPillarHanja[1],
  monthBranch: saju.monthPillarHanja[1],
  dayBranch: saju.dayPillarHanja[1],
  hourBranch: saju.hourPillarHanja?.[1] ?? "",

  monthHiddenStems:
    branchHiddenStems[saju.monthPillarHanja[1]] ?? [],

   strengthAnalysis,
});


const elementRelations =
  analyzeElementRelations(elementAnalysis);

  const fortuneBrain = analyzeFortuneBrain({
  strength: strengthAnalysis,
  elements: elementInterpretation,
  relations: elementRelations,
});

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
yearSpirit,
yearNoble,
yearNobles,


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
monthSpirit,
monthNoble,
monthNobles,

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
daySpirit,
dayNoble,
dayNobles,

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
hourSpirit,
hourNoble,
hourNobles,

elementAnalysis,
elementInterpretation,
strengthAnalysis,
elementRelations,
yongshinAnalysis,
gyeokgukAnalysis,
fortuneBrain,
};
}