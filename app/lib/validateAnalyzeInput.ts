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