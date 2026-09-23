import { calculateSaju } from "@fullstackfamily/manseryeok";
import { getTenGod } from "./tenGod";
import { branchElementMap } from "./elements";
import { findBranchClash, findBranchCombination } from "./fortuneRelations";

/**
 * Free daily reading, isolated from paid reports and monthly free-analysis generation.
 * Uses the very same calendar library and ten-god function as the existing saju engine.
 * No AI, purchases, credits, or database writes occur here.
 *
 * The service publication date is a KST civil day. At 12:00 of that day the
 * library's day pillar is unambiguous, including around the 子時 boundary.
 */
export const DAILY_COPY_VERSION = "daily-v2" as const;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Only the new daily presentation adapts Hanja branches to the existing Hangul
// relation helpers. The paid/monthly saju relation engine is never modified.
const DAILY_BRANCH_HANGUL: Record<string, string> = {
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
  午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
};

export type TodayBranchRelation = "합" | "충" | "같은 오행" | null;

export function getTodayBranchRelation(personDayBranch: string, todayBranch: string): TodayBranchRelation {
  const person = DAILY_BRANCH_HANGUL[personDayBranch];
  const today = DAILY_BRANCH_HANGUL[todayBranch];
  if (!person || !today) throw new Error("Unrecognized daily branch");
  if (findBranchClash(person, today)) return "충";
  if (findBranchCombination(person, today)) return "합";
  const personElement = branchElementMap[personDayBranch];
  const todayElement = branchElementMap[todayBranch];
  return personElement && personElement === todayElement ? "같은 오행" : null;
}

const branchNoteByRelation: Record<Exclude<TodayBranchRelation, null>, string> = {
  "합": "태어난 날의 지지와 오늘의 지지가 합 관계로 분류됩니다. 서로 다른 의견이나 일정을 조율할 기회가 있다면 차분히 살펴보세요.",
  "충": "태어난 날의 지지와 오늘의 지지가 충 관계로 분류됩니다. 평소의 계획과 다른 조건이 있다면 한 번 더 확인해 보세요.",
  "같은 오행": "태어난 날의 지지와 오늘의 지지가 같은 오행으로 분류됩니다. 익숙한 방식에서 계속 유지할 점과 바꾸고 싶은 점을 살펴보세요.",
};

const copyByTenGod: Record<string, {
  topic: string;
  flow: string;
  action: string;
}> = {
  "비견": {
    topic: "나의 기준과 협력",
    flow: "오늘은 스스로 정할 일과 다른 사람과 상의할 일을 구분하는 관점으로 하루를 살펴보세요. 자신의 기준을 지키면서도 주변의 의견을 들어볼 수 있습니다.",
    action: "혼자 결정할 일과 의견을 물어볼 일을 하나씩 구분해 보세요.",
  },
  "겁재": {
    topic: "함께하는 일과 자원",
    flow: "오늘은 다른 사람과 함께 쓰는 시간이나 자원을 어떻게 나눌지 생각해 볼 수 있습니다. 비교하기보다 각자의 역할과 필요한 몫을 확인하는 쪽에 초점을 두어 보세요.",
    action: "함께하는 일이 있다면 역할이나 사용 시간을 한 번 확인해 보세요.",
  },
  "식신": {
    topic: "표현과 차근차근 실행",
    flow: "오늘은 생각해 둔 일을 작은 행동으로 옮기는 방향을 살펴보세요. 결과를 서두르기보다 손에 잡히는 것부터 하나씩 정리하는 데 의미를 둘 수 있습니다.",
    action: "이미 준비한 일 중 지금 시작할 수 있는 한 가지를 골라 보세요.",
  },
  "상관": {
    topic: "새로운 관점과 전달",
    flow: "오늘은 익숙한 방식에서 다른 가능성을 찾아보는 관점으로 하루를 살펴보세요. 새로운 생각을 전할 때는 상대가 이해하기 쉬운 표현인지도 함께 확인해 보세요.",
    action: "바꾸고 싶은 일이 있다면 이유를 한 문장으로 적어 보세요.",
  },
  "편재": {
    topic: "활동의 폭과 자원 활용",
    flow: "오늘은 눈앞의 여러 가능성 가운데 어디에 시간을 쓸지 살펴보세요. 새로운 선택을 넓게 보되, 실제 사용할 수 있는 자원과 여건을 함께 확인하는 것이 좋겠습니다.",
    action: "관심이 가는 일 하나에 필요한 시간과 자원을 적어 보세요.",
  },
  "정재": {
    topic: "계획과 자원 관리",
    flow: "오늘은 현재의 계획과 자원을 차분히 점검하는 관점으로 하루를 살펴보세요. 새 일을 늘리기보다 지금 진행 중인 일의 순서와 필요한 것을 확인할 수 있습니다.",
    action: "오늘 사용할 시간이나 예산 중 먼저 정리할 한 가지를 골라 보세요.",
  },
  "편관": {
    topic: "책임과 대응",
    flow: "오늘은 마주한 과제에서 무엇을 먼저 다루어야 할지 구분하는 관점으로 살펴보세요. 해야 할 일이 있다면 부담의 크기보다 순서를 정하는 데 초점을 맞출 수 있습니다.",
    action: "오늘 맡은 일이 있다면 가장 먼저 확인할 조건을 적어 보세요.",
  },
  "정관": {
    topic: "역할과 기준",
    flow: "오늘은 자신의 역할과 필요한 기준을 확인하는 관점으로 하루를 살펴보세요. 정해진 순서를 따르면서도 조정이 필요한 부분이 있는지 차분히 확인해 볼 수 있습니다.",
    action: "오늘의 일에서 꼭 지켜야 할 기준 한 가지를 확인해 보세요.",
  },
  "편인": {
    topic: "관찰과 다른 시선",
    flow: "오늘은 익숙한 문제를 다른 각도에서 바라보는 관점으로 하루를 살펴보세요. 즉시 결론을 내리기보다 새로운 정보를 비교해 보는 시간을 가질 수 있습니다.",
    action: "지금 고민하는 일이 있다면 다른 해석 한 가지를 적어 보세요.",
  },
  "정인": {
    topic: "이해와 준비",
    flow: "오늘은 필요한 내용을 이해하고 차근차근 준비하는 관점으로 하루를 살펴보세요. 이미 알고 있는 것을 정리하면 다음 행동에 참고할 기준을 더 분명히 할 수 있습니다.",
    action: "오늘 필요한 정보나 준비물 한 가지를 확인해 보세요.",
  },
};

export type TodayReading = {
  date: string;
  version: typeof DAILY_COPY_VERSION;
  dayPillarHanja: string;
  tenGod: string;
  branchRelation: TodayBranchRelation;
  topic: string;
  flow: string;
  action: string;
};

/** Called with the canonical KST date; never accept a birth date from the browser. */
export function getTodayDayPillar(date: string): string {
  if (!DATE_PATTERN.test(date)) throw new Error("Invalid daily date");
  const [year, month, day] = date.split("-").map(Number);
  const validated = new Date(Date.UTC(year, month - 1, day));
  if (validated.getUTCFullYear() !== year || validated.getUTCMonth() !== month - 1 || validated.getUTCDate() !== day) {
    throw new Error("Invalid daily date");
  }
  // Noon is deliberate: day-boundary conventions at 23:00 cannot shift this day pillar.
  const pillar = calculateSaju(year, month, day, 12, 0).dayPillarHanja;
  if (typeof pillar !== "string" || !/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(pillar)) {
    throw new Error("Unrecognized day pillar");
  }
  return pillar;
}

/** Pure, deterministic presentation: no OpenAI call, randomness, billing or persistence. */
export function buildTodayReading(input: {
  date: string;
  personDayStem: string;
  personDayBranch?: string;
  dayPillarHanja: string;
}): TodayReading {
  const { date, personDayStem, personDayBranch, dayPillarHanja } = input;
  if (!/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(dayPillarHanja)) {
    throw new Error("Unrecognized day pillar");
  }
  const tenGod = getTenGod(personDayStem, dayPillarHanja[0]);
  const copy = copyByTenGod[tenGod];
  if (!copy) throw new Error("Unrecognized ten-god relation");
  const branchRelation = personDayBranch
    ? getTodayBranchRelation(personDayBranch, dayPillarHanja[1])
    : null;
  return {
    date,
    version: DAILY_COPY_VERSION,
    dayPillarHanja,
    tenGod,
    branchRelation,
    ...copy,
    flow: branchRelation ? `${copy.flow} ${branchNoteByRelation[branchRelation]}` : copy.flow,
  };
}
