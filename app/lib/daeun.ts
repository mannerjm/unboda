import { calculateFourPillars } from "manseryeok";
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


function calculateDaeunStartAge(
  birthDate: string,
  birthTime: string,
  gender: Gender
): number {
  const [year, month, day] = birthDate.split("-").map(Number);
  const [hour, minute] = birthTime.split(":").map(Number);

  const result = calculateFourPillars({
    year,
    month,
    day,
    hour,
    minute,
    gender: gender === "남성" ? "male" : "female",
  });

  const startAge = result.luckPillars?.startAge;

if (startAge === undefined) {
  throw new Error("대운 시작 나이를 계산하지 못했습니다.");
}

return startAge;
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
  gender
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