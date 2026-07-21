import { getSolarTermsByYear } from "@fullstackfamily/manseryeok";

export type DaeunDirection = "순행" | "역행";
export type Gender = "남성" | "여성";

export interface DaeunItem {
  order: number;
  ganji: string;
}

export interface DaeunAnalysis {
  direction: DaeunDirection;
  startAge: number;
  daeuns: DaeunItem[];
}


const STEMS = [
  "갑", "을", "병", "정", "무",
  "기", "경", "신", "임", "계",
];

const BRANCHES = [
  "자", "축", "인", "묘", "진", "사",
  "오", "미", "신", "유", "술", "해",
];

const YANG_STEMS = ["갑", "병", "무", "경", "임"];

function getDirection(
  yearStem: string,
  gender: Gender
): DaeunDirection {
  const isYang = YANG_STEMS.includes(yearStem);

  if (
    (gender === "남성" && isYang) ||
    (gender === "여성" && !isYang)
  ) {
    return "순행";
  }

  return "역행";
}
type SolarTermLike = {
  name: string;
  nameHanja: string;
  index: number;
  longitude: number;
  type: "jeolgi" | "junggi";
  sajuMonth: number;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function toDate(term: SolarTermLike): Date {
  return new Date(
    term.year,
    term.month - 1,
    term.day,
    term.hour,
    term.minute,
    0,
    0
  );
}

function calculateDaeunStartAge(
  birthDate: string,
  birthTime: string,
  direction: DaeunDirection
): number {
  void birthDate;
  void birthTime;
  void direction;

  // 임시값: 추후 실제 절입 시각 기반 계산으로 교체
  return 5;
}

function moveGanji(
  ganji: string,
  offset: number
): string {
  const stem = ganji[0];
  const branch = ganji[1];

  const stemIndex = STEMS.indexOf(stem);
  const branchIndex = BRANCHES.indexOf(branch);

  if (stemIndex === -1 || branchIndex === -1) {
    throw new Error(`잘못된 간지입니다: ${ganji}`);
  }

  const nextStem =
    STEMS[(stemIndex + offset + 1000) % STEMS.length];

  const nextBranch =
    BRANCHES[(branchIndex + offset + 1200) % BRANCHES.length];

  return `${nextStem}${nextBranch}`;
}

export function calculateDaeun(
  yearPillar: string,
  monthPillar: string,
  gender: Gender,
  birthDate: string,
  birthTime: string,
  count = 10
): DaeunAnalysis {
  const yearStem = yearPillar[0];
  const direction = getDirection(yearStem, gender);
  const step = direction === "순행" ? 1 : -1;

  const startAge = calculateDaeunStartAge(
    birthDate,
    birthTime,
    direction
  );

  const daeuns: DaeunItem[] = [];

  for (let i = 1; i <= count; i++) {
    daeuns.push({
      order: i,
      ganji: moveGanji(monthPillar, step * i),
    });
  }

  return {
    direction,
    startAge,
    daeuns,
  };
}