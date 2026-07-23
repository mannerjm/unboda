export type AnalyzeInput = {
  birthDate?: string;
  birthTime?: string;
  calendarType?: string;
  isLeapMonth?: string;
  gender?: string;
};

export type AnalyzeInputValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateAnalyzeInput(
  input: AnalyzeInput
): AnalyzeInputValidationResult {
  const {
    birthDate,
    birthTime,
    calendarType,
    isLeapMonth,
    gender,
  } = input;

  if (!birthDate || !birthTime || !calendarType || !gender) {
    return {
      valid: false,
      error: "필수 입력값이 누락되었습니다.",
    };
  }

if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
  return {
    valid: false,
    error: "birthDate는 YYYY-MM-DD 형식이어야 합니다.",
  };
}

const [year, month, day] = birthDate.split("-").map(Number);
const date = new Date(Date.UTC(year, month - 1, day));

if (
  date.getUTCFullYear() !== year ||
  date.getUTCMonth() !== month - 1 ||
  date.getUTCDate() !== day
) {
  return {
    valid: false,
    error: "birthDate가 실제로 존재하지 않는 날짜입니다.",
  };
}

if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) {
  return {
    valid: false,
    error: "birthTime은 HH:mm 형식이어야 합니다.",
  };
}

  if (calendarType !== "양력" && calendarType !== "음력") {
    return {
      valid: false,
      error: "calendarType은 '양력' 또는 '음력'이어야 합니다.",
    };
  }

  if (isLeapMonth !== "평달" && isLeapMonth !== "윤달") {
    return {
      valid: false,
      error: "isLeapMonth는 '평달' 또는 '윤달'이어야 합니다.",
    };
  }

  if (gender !== "남성" && gender !== "여성") {
    return {
      valid: false,
      error: "gender는 '남성' 또는 '여성'이어야 합니다.",
    };
  }

  return { valid: true };
}