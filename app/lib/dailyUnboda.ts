import { calculateSaju } from "@fullstackfamily/manseryeok";
import { getTenGod } from "./tenGod";
import { branchElementMap, stemElementMap, calculateWeightedElements, type Element } from "./elements";
import {
  findBranchClash,
  findBranchCombination,
  findBranchPunishment,
  findBranchBreak,
  findBranchHarm,
} from "./fortuneRelations";

/**
 * Free daily reading, isolated from paid reports and monthly free-analysis generation.
 * Uses the very same calendar library and ten-god function as the existing saju engine.
 * No AI, purchases, credits, or database writes occur here.
 *
 * The service publication date is a KST civil day. At 12:00 of that day the
 * library's day pillar is unambiguous, including around the 子時 boundary.
 */
export const DAILY_COPY_VERSION = "daily-v3" as const;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Only the new daily presentation adapts Hanja branches to the existing Hangul
// relation helpers. The paid/monthly saju relation engine is never modified.
const DAILY_BRANCH_HANGUL: Record<string, string> = {
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
  午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
};

export type TodayBranchRelation = "합" | "충" | "형" | "파" | "해" | "같은 오행" | null;

export function getTodayBranchRelation(personDayBranch: string, todayBranch: string): TodayBranchRelation {
  const person = DAILY_BRANCH_HANGUL[personDayBranch];
  const today = DAILY_BRANCH_HANGUL[todayBranch];
  if (!person || !today) throw new Error("Unrecognized daily branch");
  // More than one traditional label can fit the same pair. Select a single
  // consistent short-note label; no relation is scored good or bad.
  if (findBranchClash(person, today)) return "충";
  if (findBranchCombination(person, today)) return "합";
  if (findBranchPunishment(person, today)) return "형";
  if (findBranchBreak(person, today)) return "파";
  if (findBranchHarm(person, today)) return "해";
  const personElement = branchElementMap[personDayBranch];
  const todayElement = branchElementMap[todayBranch];
  return personElement && personElement === todayElement ? "같은 오행" : null;
}

const branchNoteByRelation: Record<Exclude<TodayBranchRelation, null>, string> = {
  "합": "태어난 날의 지지와 오늘의 지지가 합 관계로 분류됩니다. 서로 다른 의견이나 일정을 조율할 기회가 있다면 차분히 살펴보세요.",
  "충": "태어난 날의 지지와 오늘의 지지가 충 관계로 분류됩니다. 평소의 계획과 다른 조건이 있다면 한 번 더 확인해 보세요.",
  "형": "태어난 날의 지지와 오늘의 지지가 형 관계로 분류됩니다. 기준이나 순서가 엇갈리는 일이 있다면 차근차근 살펴보세요.",
  "파": "태어난 날의 지지와 오늘의 지지가 파 관계로 분류됩니다. 평소의 진행 방식을 점검할 부분이 있는지 살펴보세요.",
  "해": "태어난 날의 지지와 오늘의 지지가 해 관계로 분류됩니다. 서로의 기대가 다른 부분을 미리 확인해 보세요.",
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
  /** One selected context; never a fabricated claim of a predicted event. */
  focusPillar?: "day" | "month" | "year" | "hour" | null;
  focusRelation?: TodayBranchRelation;
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


type NatalPillar = "day" | "month" | "year" | "hour";
type NonNullRelation = Exclude<TodayBranchRelation, null>;
type PillarSignal = { pillar: NatalPillar; relation: NonNullRelation };

const PILLAR_LANGUAGE: Record<NatalPillar, { title: string; subject: string }> = {
  day: { title: "내 일상", subject: "태어난 날" },
  month: { title: "일과 생활", subject: "태어난 달" },
  year: { title: "주변과의 관계", subject: "태어난 해" },
  hour: { title: "개인적인 계획", subject: "태어난 시간" },
};

const RELATION_LANGUAGE: Record<NonNullRelation, {
  title: string;
  note: string;
  action: string;
}> = {
  "합": { title: "조율", note: "서로 맞춰 볼 부분을 살펴보는 관점으로 읽어 보세요.", action: "서로 맞춰 볼 기준 한 가지를 확인해 보세요." },
  "충": { title: "조건 점검", note: "계획과 다른 조건이 있는지 살펴보는 관점으로 읽어 보세요.", action: "달라진 조건 한 가지를 확인해 보세요." },
  "형": { title: "순서 정리", note: "기준이나 순서가 엇갈리는 부분을 확인하는 관점으로 읽어 보세요.", action: "먼저 정리할 순서 한 가지를 적어 보세요." },
  "파": { title: "방식 점검", note: "기존에 하던 방식 중 조정할 부분이 있는지 살펴보세요.", action: "점검할 진행 단계 한 가지를 골라 보세요." },
  "해": { title: "기대 확인", note: "기대가 서로 다른 부분을 확인하는 관점으로 읽어 보세요.", action: "서로의 기대가 다른 부분 한 가지를 확인해 보세요." },
  "같은 오행": { title: "기존 흐름 살피기", note: "익숙한 기준에서 이어갈 점과 바꿀 점을 살펴보세요.", action: "계속 유지할 기준 한 가지를 적어 보세요." },
};

// Ten-god context is the starting point for the single practical action.
// A relation changes the ACTION, rather than appending a second unrelated task.
const ACTION_CONTEXT: Record<string, string> = {
  "비견": "내가 직접 결정할 일",
  "겁재": "함께 사용하는 시간과 자원",
  "식신": "준비해 둔 작은 일",
  "상관": "새로운 생각을 전할 일",
  "편재": "새로 살펴볼 선택지",
  "정재": "오늘 쓸 시간과 예산",
  "편관": "지금 맡은 과제",
  "정관": "지켜야 할 역할과 기준",
  "편인": "다른 시선으로 볼 고민",
  "정인": "오늘 필요한 정보와 준비",
};

const VALID_PILLAR = /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/;
function checkedPillar(value: string | undefined): string | null {
  if (!value) return null;
  if (!VALID_PILLAR.test(value)) throw new Error("Unrecognized natal pillar");
  return value;
}
function relationSignal(pillar: NatalPillar, natalPillar: string | null, todayBranch: string): PillarSignal | null {
  if (!natalPillar) return null;
  const relation = getTodayBranchRelation(natalPillar[1], todayBranch);
  return relation ? { pillar, relation } : null;
}

/**
 * Relationship-first daily copy. The day stem's ten-god theme is always the
 * primary context; natal day/month/year branch interactions then refine it.
 * An "hour" signal is optional and must only be explicitly supplied for a
 * VERIFIED birth time; our current profile form defaults to 12:00 and has
 * no verification bit, so the server intentionally does NOT pass an hour.
 */
function expandedTodayCopy(input: {
  tenGod: string;
  dayPillar: string;
  monthPillar: string;
  yearPillar: string;
  verifiedHourPillar: string | null;
  todayPillar: string;
}): { topic: string; flowNote: string; action: string; focusPillar: NatalPillar | null; focusRelation: TodayBranchRelation } {
  const { tenGod, dayPillar, monthPillar, yearPillar, verifiedHourPillar, todayPillar } = input;
  const original = copyByTenGod[tenGod]!;
  const todayBranch = todayPillar[1];
  const signals: PillarSignal[] = [
    relationSignal("day", dayPillar, todayBranch),
    relationSignal("month", monthPillar, todayBranch),
    relationSignal("year", yearPillar, todayBranch),
    relationSignal("hour", verifiedHourPillar, todayBranch),
  ].filter((signal): signal is PillarSignal => Boolean(signal));

  // The highest-priority available non-neutral day/month/year interaction
  // supplies the headline/action. Same-element is a descriptive fallback.
  // We do not infer auspiciousness or add up "good/bad" fortune points.
  const focus = signals.find((signal) => signal.relation !== "같은 오행") ?? signals[0] ?? null;
  const supplementary = signals.find((signal) => signal !== focus && signal.pillar !== "hour" && signal.relation !== "같은 오행") ?? null;
  const focusCopy = focus ? RELATION_LANGUAGE[focus.relation] : null;
  const focusName = focus ? PILLAR_LANGUAGE[focus.pillar] : null;

  const notes: string[] = [];
  if (focus && focusCopy && focusName) {
    notes.push(\`\${focusName.subject}의 지지와 오늘의 지지는 \${focus.relation} 관계로 분류됩니다. \${focusCopy.note}\`);
  }
  if (supplementary) {
    notes.push(\`\${PILLAR_LANGUAGE[supplementary.pillar].subject}의 지지에서도 \${supplementary.relation} 관계를 확인할 수 있습니다.\`);
  }

  // Use the EXISTING weighted five-element implementation, restricted to the
  // three reliable natal pillars. Never treat the form's default noon hour as
  // confirmed, and do not equate low/high weight with auspiciousness.
  const elements = calculateWeightedElements(
    [yearPillar[0], monthPillar[0], dayPillar[0], ...(verifiedHourPillar ? [verifiedHourPillar[0]] : [])],
    [yearPillar[1], monthPillar[1], dayPillar[1], ...(verifiedHourPillar ? [verifiedHourPillar[1]] : [])],
  );
  const todayStemElement: Element | undefined = stemElementMap[todayPillar[0]];
  const todayBranchElement: Element | undefined = branchElementMap[todayPillar[1]];
  const high = elements.strongest.length === 1 ? elements.strongest[0] : null;
  const low = elements.weakest.length === 1 ? elements.weakest[0] : null;
  const elementNote =
    todayStemElement && high === todayStemElement
      ? \`연·월·일주에 나타난 오행 중 \${todayStemElement}의 상대 비중이 높고 오늘의 천간도 같은 오행입니다.\`
      : todayStemElement && low === todayStemElement
        ? \`연·월·일주에 나타난 오행 중 \${todayStemElement}의 상대 비중이 낮고 오늘의 천간은 해당 오행입니다.\`
        : todayBranchElement && high === todayBranchElement
          ? \`연·월·일주에 나타난 오행 중 \${todayBranchElement}의 상대 비중이 높고 오늘의 지지도 같은 오행입니다.\`
          : todayBranchElement && low === todayBranchElement
            ? \`연·월·일주에 나타난 오행 중 \${todayBranchElement}의 상대 비중이 낮고 오늘의 지지는 해당 오행입니다.\`
            : null;
  if (elementNote) notes.push(elementNote);
  return {
    topic: focus ? \`\${original.topic} · \${focusName!.title} \${focusCopy!.title}\` : original.topic,
    flowNote: notes.join(" "),
    action: focusCopy
      ? \`\${ACTION_CONTEXT[tenGod]}에서 \${focusCopy.action}\`
      : original.action,
    focusPillar: focus?.pillar ?? null,
    focusRelation: focus?.relation ?? null,
  };
}

/** Pure, deterministic presentation: no OpenAI call, randomness, billing or persistence. */
export function buildTodayReading(input: {
  date: string;
  personDayStem: string;
  personDayBranch?: string;
  dayPillarHanja: string;
  personYearPillarHanja?: string;
  personMonthPillarHanja?: string;
  /** Do not set unless actual time was explicitly verified by the user. */
  verifiedHourPillarHanja?: string;
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
  const year = checkedPillar(input.personYearPillarHanja);
  const month = checkedPillar(input.personMonthPillarHanja);
  const hour = checkedPillar(input.verifiedHourPillarHanja);
  // Existing standalone callers remain on safe day-pillar-only copy. Expanded
  // interpretation requires BOTH actual year and month natal pillars.
  const expanded = personDayBranch && year && month
    ? expandedTodayCopy({
      tenGod,
      dayPillar: `${personDayStem}${personDayBranch}`,
      monthPillar: month,
      yearPillar: year,
      verifiedHourPillar: hour,
      todayPillar: dayPillarHanja,
    })
    : null;
  return {
    date,
    version: DAILY_COPY_VERSION,
    dayPillarHanja,
    tenGod,
    branchRelation,
    ...(expanded ? { focusPillar: expanded.focusPillar, focusRelation: expanded.focusRelation } : {}),
    ...copy,
    topic: expanded?.topic ?? copy.topic,
    action: expanded?.action ?? copy.action,
    flow: expanded ? `${copy.flow} ${expanded.flowNote}`.trim()
      : branchRelation ? `${copy.flow} ${branchNoteByRelation[branchRelation]}` : copy.flow,
  };
}
