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

대운 분석:
대운 방향: ${saju.daeunAnalysis.direction}
대운 시작 나이: ${saju.daeunAnalysis.startAge}세
대운 목록:
${saju.daeunAnalysis.daeuns
  .map(
    (daeun) =>
      `${daeun.order}대운: ${daeun.ganji} (${saju.daeunAnalysis.startAge + (daeun.order - 1) * 10}세 시작)`
  )
  .join("\n")}

현재 기준 세운 분석:
${saju.seunAnalysis.items
  .map(
    (item) =>
      `${item.year}년: ${item.ganji} (${item.age}세)`
  )
  .join("\n")}
`;
}
