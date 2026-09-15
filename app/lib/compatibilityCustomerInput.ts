import { calculateSaju, lunarToSolar } from "@fullstackfamily/manseryeok";
import { getSaju } from "./manse";
import { calculateSeun } from "./seun";
import type {
  ProfileAppCalendarType,
  ProfileAppGender,
  ProfileDto,
} from "./profiles/types";
import type { CompatibilityPersonInput } from "./compatibilityEngine";
import type { CompatibilityTimingPersonInput } from "./compatibilityTiming";

export type CompatibilityPartnerInput = {
  label: string;
  birthDate: string;
  birthTimeKnown: boolean;
  birthTime: string | null;
  gender: ProfileAppGender;
  calendarType: ProfileAppCalendarType;
  isLeapMonth: boolean;
};

export type CompatibilityCustomerSnapshot = {
  person: CompatibilityPersonInput;
  timing: CompatibilityTimingPersonInput;
  birthTimeKnown: boolean;
};

type BirthInput = {
  birthDate: string;
  birthTime: string;
  gender: ProfileAppGender;
  calendarType: ProfileAppCalendarType;
  isLeapMonth: boolean;
};

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function validateCompatibilityPartnerInput(input: unknown):
  | { valid: true; value: CompatibilityPartnerInput }
  | { valid: false; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, error: "상대방 정보를 다시 확인해 주세요." };
  }

  const raw = input as Partial<CompatibilityPartnerInput>;
  const label = typeof raw.label === "string" ? raw.label.trim() : "";
  if (!label || label.length > 40) {
    return { valid: false, error: "상대방을 구분할 이름을 40자 이내로 입력해 주세요." };
  }

  if (typeof raw.birthDate !== "string" || !isRealDate(raw.birthDate)) {
    return { valid: false, error: "상대방의 생년월일을 확인해 주세요." };
  }

  if (typeof raw.birthTimeKnown !== "boolean") {
    return { valid: false, error: "출생시간 확인 여부를 선택해 주세요." };
  }

  const birthTime = raw.birthTimeKnown
    ? typeof raw.birthTime === "string" ? raw.birthTime.trim() : ""
    : null;
  if (raw.birthTimeKnown && !/^([01]\d|2[0-3]):[0-5]\d$/.test(birthTime ?? "")) {
    return { valid: false, error: "출생시간을 HH:mm 형식으로 입력해 주세요." };
  }

  if (raw.gender !== "남성" && raw.gender !== "여성") {
    return { valid: false, error: "성별을 선택해 주세요." };
  }
  if (raw.calendarType !== "양력" && raw.calendarType !== "음력") {
    return { valid: false, error: "양력 또는 음력을 선택해 주세요." };
  }
  if (typeof raw.isLeapMonth !== "boolean") {
    return { valid: false, error: "윤달 여부를 다시 확인해 주세요." };
  }
  if (raw.calendarType === "양력" && raw.isLeapMonth) {
    return { valid: false, error: "양력 날짜에는 윤달을 선택할 수 없습니다." };
  }

  return {
    valid: true,
    value: {
      label,
      birthDate: raw.birthDate,
      birthTimeKnown: raw.birthTimeKnown,
      birthTime,
      gender: raw.gender,
      calendarType: raw.calendarType,
      isLeapMonth: raw.isLeapMonth,
    },
  };
}

function toKnownTimeSnapshot(input: BirthInput, evaluationDate: string): CompatibilityCustomerSnapshot {
  const saju = getSaju(
    input.birthDate,
    input.birthTime,
    input.calendarType,
    input.isLeapMonth ? "윤달" : "평달",
    input.gender,
    evaluationDate,
  );

  return {
    person: {
      pillars: {
        year: saju.yearPillarHanja,
        month: saju.monthPillarHanja,
        day: saju.dayPillarHanja,
        hour: saju.hourPillarHanja,
      },
    },
    timing: {
      daeunGanji: saju.currentDaeun?.ganji ?? null,
      seunGanji: saju.currentSeun?.ganji ?? null,
    },
    birthTimeKnown: true,
  };
}

function resolveSolarDate(
  birthDate: string,
  calendarType: ProfileAppCalendarType,
  isLeapMonth: boolean,
): { year: number; month: number; day: number } {
  const [year, month, day] = birthDate.split("-").map(Number);
  if (calendarType === "양력") return { year, month, day };
  const converted = lunarToSolar(year, month, day, isLeapMonth);
  return {
    year: converted.solar.year,
    month: converted.solar.month,
    day: converted.solar.day,
  };
}

function buildUnknownTimeSnapshot(
  input: Omit<BirthInput, "birthTime">,
  evaluationYear: number,
): CompatibilityCustomerSnapshot {
  const solar = resolveSolarDate(input.birthDate, input.calendarType, input.isLeapMonth);
  const candidates = Array.from({ length: 24 }, (_, hour) => calculateSaju(
    solar.year,
    solar.month,
    solar.day,
    hour,
    0,
  ));

  const signatures = new Map<string, (typeof candidates)[number]>();
  for (const candidate of candidates) {
    const signature = [
      candidate.yearPillarHanja,
      candidate.monthPillarHanja,
      candidate.dayPillarHanja,
    ].join("|");
    if (!signatures.has(signature)) signatures.set(signature, candidate);
  }

  if (signatures.size !== 1) {
    throw new Error(
      "이 날짜는 출생시간에 따라 연주·월주·일주가 달라질 수 있어 출생시간 없이 정확한 궁합을 계산하기 어렵습니다.",
    );
  }

  const natal = [...signatures.values()][0];
  const currentSeun = calculateSeun(
    solar.year,
    evaluationYear,
    natal.dayPillarHanja[0],
    1,
  ).items[0];

  return {
    person: {
      pillars: {
        year: natal.yearPillarHanja,
        month: natal.monthPillarHanja,
        day: natal.dayPillarHanja,
        hour: null,
      },
    },
    timing: {
      daeunGanji: null,
      seunGanji: currentSeun?.ganji ?? null,
    },
    birthTimeKnown: false,
  };
}

export function buildProfileCompatibilitySnapshot(
  profile: ProfileDto,
  evaluationDate: string,
): CompatibilityCustomerSnapshot {
  return toKnownTimeSnapshot({
    birthDate: profile.birthDate,
    birthTime: profile.birthTime,
    gender: profile.gender,
    calendarType: profile.calendarType,
    isLeapMonth: profile.isLeapMonth,
  }, evaluationDate);
}

export function buildPartnerCompatibilitySnapshot(
  partner: CompatibilityPartnerInput,
  evaluationDate: string,
): CompatibilityCustomerSnapshot {
  const evaluationYear = Number(evaluationDate.slice(0, 4));
  if (!Number.isInteger(evaluationYear) || evaluationYear < 1) {
    throw new Error("궁합 분석 기준 연도를 확인하지 못했습니다.");
  }

  if (partner.birthTimeKnown && partner.birthTime) {
    return toKnownTimeSnapshot({
      birthDate: partner.birthDate,
      birthTime: partner.birthTime,
      gender: partner.gender,
      calendarType: partner.calendarType,
      isLeapMonth: partner.isLeapMonth,
    }, evaluationDate);
  }

  return buildUnknownTimeSnapshot({
    birthDate: partner.birthDate,
    gender: partner.gender,
    calendarType: partner.calendarType,
    isLeapMonth: partner.isLeapMonth,
  }, evaluationYear);
}
