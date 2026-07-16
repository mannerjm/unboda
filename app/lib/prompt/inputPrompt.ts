import type { getSaju } from "../manse";

type SajuResult = ReturnType<typeof getSaju>;

export function buildInputPrompt(
  calendarType: string,
  isLeapMonth: boolean,
  birthDate: string,
  birthTime: string,
  gender: string,
  saju: SajuResult
) {
  return `
달력 기준: ${calendarType}
윤달 여부: ${isLeapMonth ? "윤달" : "평달"}

생년월일:
${birthDate}

출생시간:
${birthTime}

성별:
${gender}

양력 변환:
${saju.solarDate}

실제 계산된 사주팔자

년주:
${saju.yearPillarHanja}

월주:
${saju.monthPillarHanja}

일주:
${saju.dayPillarHanja}

시주:
${saju.hourPillarHanja}

용신 분석:
주 용신 후보: ${saju.yongshinAnalysis.primary}
보조 용신 후보: ${saju.yongshinAnalysis.secondary.join(", ") || "없음"}
판단 근거: ${saju.yongshinAnalysis.reason}
`;
}
