type PillarStarContext = {
  dayStem: string;
  targetStem: string;
  targetBranch: string;
  pillarHanja: string;
  isDayPillar: boolean;
};

export type SupplementalPillarStarSet = {
  beneficStars: string[];
  specialStars: string[];
};

type SupplementalStarFields = {
  yearSpecialStars: string[];
  monthSpecialStars: string[];
  daySpecialStars: string[];
  hourSpecialStars: string[];
};

type StarCarrier = {
  dayStem: string;
  yearStem: string;
  yearBranch: string;
  yearPillarHanja: string;
  yearSpirit?: string;
  yearNobles?: string[];
  yearSpecialStars?: string[];
  monthStem: string;
  monthBranch: string;
  monthPillarHanja: string;
  monthSpirit?: string;
  monthNobles?: string[];
  monthSpecialStars?: string[];
  dayBranch: string;
  dayPillarHanja: string;
  daySpirit?: string;
  dayNobles?: string[];
  daySpecialStars?: string[];
  hourStem: string;
  hourBranch: string;
  hourPillarHanja: string;
  hourSpirit?: string;
  hourNobles?: string[];
  hourSpecialStars?: string[];
};

// 운보다 신살/길신 V2 표시 정책:
// - 기존 manse.ts의 12신살(겁살~화개살)은 중립 신살 계열로 그대로 유지한다.
// - 천을/천덕/월덕 및 아래의 문창·문곡·학당·태극·협록·암록·금여는
//   귀인·길신 계열로 분리한다.
// - 홍염·양인·백호·괴강은 길신으로 오해되지 않도록 기타 특수 신살로 분리한다.
// - 원진·귀문·공망처럼 둘 이상의 지지 관계나 旬 계산이 필요한 항목은
//   단일 기둥 배지에 억지로 넣지 않고 별도 관계 분석 단계에서 다룬다.

const literaryStarBranches: Record<string, { name: string; branches: string[] }[]> = {
  甲: [
    { name: "문창귀인", branches: ["巳"] },
    { name: "문곡귀인", branches: ["亥"] },
    { name: "학당귀인", branches: ["亥"] },
  ],
  乙: [
    { name: "문창귀인", branches: ["午"] },
    { name: "문곡귀인", branches: ["子"] },
    { name: "학당귀인", branches: ["午"] },
  ],
  丙: [
    { name: "문창귀인", branches: ["申"] },
    { name: "문곡귀인", branches: ["寅"] },
    { name: "학당귀인", branches: ["寅"] },
  ],
  丁: [
    { name: "문창귀인", branches: ["酉"] },
    { name: "문곡귀인", branches: ["卯"] },
    { name: "학당귀인", branches: ["酉"] },
  ],
  戊: [
    { name: "문창귀인", branches: ["申"] },
    { name: "문곡귀인", branches: ["寅"] },
    { name: "학당귀인", branches: ["寅"] },
  ],
  己: [
    { name: "문창귀인", branches: ["酉"] },
    { name: "문곡귀인", branches: ["卯"] },
    { name: "학당귀인", branches: ["酉"] },
  ],
  庚: [
    { name: "문창귀인", branches: ["亥"] },
    { name: "문곡귀인", branches: ["巳"] },
    { name: "학당귀인", branches: ["巳"] },
  ],
  辛: [
    { name: "문창귀인", branches: ["子"] },
    { name: "문곡귀인", branches: ["午"] },
    { name: "학당귀인", branches: ["子"] },
  ],
  壬: [
    { name: "문창귀인", branches: ["寅"] },
    { name: "문곡귀인", branches: ["申"] },
    { name: "학당귀인", branches: ["申"] },
  ],
  癸: [
    { name: "문창귀인", branches: ["卯"] },
    { name: "문곡귀인", branches: ["酉"] },
    { name: "학당귀인", branches: ["卯"] },
  ],
};

const taegukBranches: Record<string, string[]> = {
  甲: ["子", "午"],
  乙: ["子", "午"],
  丙: ["卯", "酉"],
  丁: ["卯", "酉"],
  戊: ["辰", "戌", "丑", "未"],
  己: ["辰", "戌", "丑", "未"],
  庚: ["寅", "亥"],
  辛: ["寅", "亥"],
  壬: ["巳", "申"],
  癸: ["巳", "申"],
};

const hyeoprokBranches: Record<string, string[]> = {
  甲: ["丑", "卯"],
  乙: ["寅", "辰"],
  丙: ["辰", "午"],
  丁: ["巳", "未"],
  戊: ["辰", "午"],
  己: ["巳", "未"],
  庚: ["未", "酉"],
  辛: ["申", "戌"],
  壬: ["戌", "子"],
  癸: ["亥", "丑"],
};

const amrokBranch: Record<string, string> = {
  甲: "亥",
  乙: "戌",
  丙: "申",
  丁: "未",
  戊: "申",
  己: "未",
  庚: "巳",
  辛: "辰",
  壬: "寅",
  癸: "丑",
};

const geumyeoBranch: Record<string, string> = {
  甲: "辰",
  乙: "巳",
  丙: "未",
  丁: "申",
  戊: "未",
  己: "申",
  庚: "戌",
  辛: "亥",
  壬: "丑",
  癸: "寅",
};

const hongyeomBranch: Record<string, string> = {
  甲: "午",
  乙: "午",
  丙: "寅",
  丁: "未",
  戊: "辰",
  己: "辰",
  庚: "戌",
  辛: "酉",
  壬: "子",
  癸: "申",
};

// 양인은 유파 차이가 있어 V2에서도 고전에서 널리 쓰는 양간 기준만 채택한다.
const yanginBranch: Record<string, string> = {
  甲: "卯",
  丙: "午",
  戊: "午",
  庚: "酉",
  壬: "子",
};

const baekhoPillars = new Set([
  "甲辰",
  "乙未",
  "丙戌",
  "丁丑",
  "戊辰",
  "壬戌",
  "癸丑",
]);

// 괴강은 가장 보수적인 4일주 기준만 채택한다.
const gwaegangDayPillars = new Set(["庚辰", "庚戌", "壬辰", "壬戌"]);
const specialStarNames = new Set(["홍염살", "양인살", "백호대살", "괴강살"]);

function pushIfMatch(stars: string[], name: string, branches: string[] | undefined, targetBranch: string) {
  if (branches?.includes(targetBranch)) stars.push(name);
}

export function getSupplementalPillarStars({
  dayStem,
  targetBranch,
  pillarHanja,
  isDayPillar,
}: PillarStarContext): SupplementalPillarStarSet {
  const beneficStars: string[] = [];
  const specialStars: string[] = [];

  for (const rule of literaryStarBranches[dayStem] ?? []) {
    pushIfMatch(beneficStars, rule.name, rule.branches, targetBranch);
  }

  pushIfMatch(beneficStars, "태극귀인", taegukBranches[dayStem], targetBranch);
  pushIfMatch(beneficStars, "협록", hyeoprokBranches[dayStem], targetBranch);

  if (amrokBranch[dayStem] === targetBranch) beneficStars.push("암록");
  if (geumyeoBranch[dayStem] === targetBranch) beneficStars.push("금여");
  if (hongyeomBranch[dayStem] === targetBranch) specialStars.push("홍염살");
  if (yanginBranch[dayStem] === targetBranch) specialStars.push("양인살");
  if (baekhoPillars.has(pillarHanja)) specialStars.push("백호대살");
  if (isDayPillar && gwaegangDayPillars.has(pillarHanja)) specialStars.push("괴강살");

  return {
    beneficStars: [...new Set(beneficStars)],
    specialStars: [...new Set(specialStars)],
  };
}

function mergeUnique(existing: string[] | undefined, supplemental: string[]): string[] {
  return [...new Set([...(existing ?? []), ...supplemental])];
}

function mergeBenefics(existing: string[] | undefined, supplemental: string[]): string[] {
  return mergeUnique(existing?.filter((name) => !specialStarNames.has(name)), supplemental);
}

function mergeSpirit(existing: string | undefined, specialStars: string[]): string {
  const existingParts = existing
    ? existing.split(" · ").map((value) => value.trim()).filter(Boolean)
    : [];
  return [...new Set([...existingParts, ...specialStars])].join(" · ");
}

export function enrichSupplementalPillarStars<T extends StarCarrier>(
  value: T,
): T & SupplementalStarFields {
  const dayStem = value.dayStem;
  const year = getSupplementalPillarStars({
    dayStem,
    targetStem: value.yearStem,
    targetBranch: value.yearBranch,
    pillarHanja: value.yearPillarHanja,
    isDayPillar: false,
  });
  const month = getSupplementalPillarStars({
    dayStem,
    targetStem: value.monthStem,
    targetBranch: value.monthBranch,
    pillarHanja: value.monthPillarHanja,
    isDayPillar: false,
  });
  const day = getSupplementalPillarStars({
    dayStem,
    targetStem: dayStem,
    targetBranch: value.dayBranch,
    pillarHanja: value.dayPillarHanja,
    isDayPillar: true,
  });
  const hour = getSupplementalPillarStars({
    dayStem,
    targetStem: value.hourStem,
    targetBranch: value.hourBranch,
    pillarHanja: value.hourPillarHanja,
    isDayPillar: false,
  });

  const yearSpecialStars = mergeUnique(value.yearSpecialStars, year.specialStars);
  const monthSpecialStars = mergeUnique(value.monthSpecialStars, month.specialStars);
  const daySpecialStars = mergeUnique(value.daySpecialStars, day.specialStars);
  const hourSpecialStars = mergeUnique(value.hourSpecialStars, hour.specialStars);

  return {
    ...value,
    yearNobles: mergeBenefics(value.yearNobles, year.beneficStars),
    monthNobles: mergeBenefics(value.monthNobles, month.beneficStars),
    dayNobles: mergeBenefics(value.dayNobles, day.beneficStars),
    hourNobles: mergeBenefics(value.hourNobles, hour.beneficStars),
    yearSpecialStars,
    monthSpecialStars,
    daySpecialStars,
    hourSpecialStars,
    yearSpirit: mergeSpirit(value.yearSpirit, yearSpecialStars),
    monthSpirit: mergeSpirit(value.monthSpirit, monthSpecialStars),
    daySpirit: mergeSpirit(value.daySpirit, daySpecialStars),
    hourSpirit: mergeSpirit(value.hourSpirit, hourSpecialStars),
  };
}
