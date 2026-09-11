type PillarStarContext = {
  dayStem: string;
  targetStem: string;
  targetBranch: string;
  pillarHanja: string;
  isDayPillar: boolean;
};

type StarCarrier = {
  dayStem: string;
  yearStem: string;
  yearBranch: string;
  yearPillarHanja: string;
  yearNobles?: string[];
  monthStem: string;
  monthBranch: string;
  monthPillarHanja: string;
  monthNobles?: string[];
  dayBranch: string;
  dayPillarHanja: string;
  dayNobles?: string[];
  hourStem: string;
  hourBranch: string;
  hourPillarHanja: string;
  hourNobles?: string[];
};

// 운보다 신살/길신 V1 정책:
// - 기존 manse.ts의 12신살(겁살~화개살)과 천을/천덕/월덕귀인은 그대로 유지한다.
// - 아래는 일간/간지 기준이 비교적 명확한 보조 길신·신살만 추가한다.
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

// 양인은 유파 차이가 있어 V1에서는 고전에서 널리 쓰는 양간 기준만 채택한다.
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

// 괴강은 V1에서 가장 보수적인 4일주 기준만 채택한다.
const gwaegangDayPillars = new Set(["庚辰", "庚戌", "壬辰", "壬戌"]);

function pushIfMatch(stars: string[], name: string, branches: string[] | undefined, targetBranch: string) {
  if (branches?.includes(targetBranch)) stars.push(name);
}

export function getSupplementalPillarStars({
  dayStem,
  targetBranch,
  pillarHanja,
  isDayPillar,
}: PillarStarContext): string[] {
  const stars: string[] = [];

  for (const rule of literaryStarBranches[dayStem] ?? []) {
    pushIfMatch(stars, rule.name, rule.branches, targetBranch);
  }

  pushIfMatch(stars, "태극귀인", taegukBranches[dayStem], targetBranch);
  pushIfMatch(stars, "협록", hyeoprokBranches[dayStem], targetBranch);

  if (amrokBranch[dayStem] === targetBranch) stars.push("암록");
  if (geumyeoBranch[dayStem] === targetBranch) stars.push("금여");
  if (hongyeomBranch[dayStem] === targetBranch) stars.push("홍염살");
  if (yanginBranch[dayStem] === targetBranch) stars.push("양인살");
  if (baekhoPillars.has(pillarHanja)) stars.push("백호대살");
  if (isDayPillar && gwaegangDayPillars.has(pillarHanja)) stars.push("괴강살");

  return [...new Set(stars)];
}

function mergeUnique(existing: string[] | undefined, supplemental: string[]): string[] {
  return [...new Set([...(existing ?? []), ...supplemental])];
}

export function enrichSupplementalPillarStars<T extends StarCarrier>(value: T): T {
  const dayStem = value.dayStem;

  return {
    ...value,
    yearNobles: mergeUnique(
      value.yearNobles,
      getSupplementalPillarStars({
        dayStem,
        targetStem: value.yearStem,
        targetBranch: value.yearBranch,
        pillarHanja: value.yearPillarHanja,
        isDayPillar: false,
      }),
    ),
    monthNobles: mergeUnique(
      value.monthNobles,
      getSupplementalPillarStars({
        dayStem,
        targetStem: value.monthStem,
        targetBranch: value.monthBranch,
        pillarHanja: value.monthPillarHanja,
        isDayPillar: false,
      }),
    ),
    dayNobles: mergeUnique(
      value.dayNobles,
      getSupplementalPillarStars({
        dayStem,
        targetStem: dayStem,
        targetBranch: value.dayBranch,
        pillarHanja: value.dayPillarHanja,
        isDayPillar: true,
      }),
    ),
    hourNobles: mergeUnique(
      value.hourNobles,
      getSupplementalPillarStars({
        dayStem,
        targetStem: value.hourStem,
        targetBranch: value.hourBranch,
        pillarHanja: value.hourPillarHanja,
        isDayPillar: false,
      }),
    ),
  } as T;
}
