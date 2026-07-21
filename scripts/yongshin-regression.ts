import { getSaju } from "../app/lib/manse";

const start = new Date("1990-01-01");
const end = new Date("2000-12-31");

const testTimes = [
  "00:30",
  "05:30",
  "12:00",
  "17:30",
  "23:30",
];

const generating: Record<string, string> = {
  목: "수",
  화: "목",
  토: "화",
  금: "토",
  수: "금",
};

const generates: Record<string, string> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

const controls: Record<string, string> = {
  목: "토",
  화: "금",
  토: "수",
  금: "목",
  수: "화",
};

const controlledBy: Record<string, string> = {
  목: "금",
  화: "수",
  토: "목",
  금: "화",
  수: "토",
};

const suspicious: Array<{
  birthDate: string;
  birthTime: string;
  level: string;
  dayElement: string;
  primary: string;
  scores: Record<string, number>;
  scoreDetails: Record<string, unknown>;
}> = [];

for (
  let date = new Date(start);
  date <= end;
  date.setDate(date.getDate() + 1)
) {
  const birthDate = date.toISOString().slice(0, 10);

  for (const birthTime of testTimes) {
    const saju = getSaju(
      birthDate,
      birthTime,
      "양력",
      "평달",
      "남성"
    );

    const level = saju.strengthAnalysis.level;
    const dayElement = saju.strengthAnalysis.dayElement;
    const primary = saju.yongshinAnalysis.primary;
    const scores = saju.yongshinAnalysis.scores;

    const isWeak = level.includes("신약");
    const isStrong = level.includes("신강");

    const badForWeak =
      primary === generates[dayElement] ||
      primary === controls[dayElement] ||
      primary === controlledBy[dayElement];

    const badForStrong =
      primary === dayElement ||
      primary === generating[dayElement];

    if (
      (isWeak && badForWeak) ||
      (isStrong && badForStrong)
    ) {
      suspicious.push({
        birthDate,
        birthTime,
        level,
        dayElement,
        primary,
        scores,
        scoreDetails: saju.yongshinAnalysis.scoreDetails,
      });
    }
  }
}

console.log("=== 용신 방향 충돌 후보 건수 ===");
console.log(suspicious.length);

console.log("=== 신약 충돌 건수 ===");
console.log(
  suspicious.filter((item) => item.level.includes("신약")).length
);

console.log("=== 신강 충돌 건수 ===");
console.log(
  suspicious.filter((item) => item.level.includes("신강")).length
);

if (suspicious.length > 0) {
  console.log("=== 충돌 후보 샘플 ===");
  console.dir(suspicious.slice(0, 13), { depth: null });
}
const weakConflicts = suspicious.filter((item) =>
  item.level.includes("신약")
);

const weakOutputCount = weakConflicts.filter(
  (item) => item.primary === generates[item.dayElement]
).length;

const weakWealthCount = weakConflicts.filter(
  (item) => item.primary === controls[item.dayElement]
).length;

const weakOfficerCount = weakConflicts.filter(
  (item) => item.primary === controlledBy[item.dayElement]
).length;

console.log("=== 신약 충돌 상세 ===");
console.log("식상 선택:", weakOutputCount);
console.log("재성 선택:", weakWealthCount);
console.log("관성 선택:", weakOfficerCount);

console.log("=== 신약 충돌 점수차 분포 ===");

const weakGapResults = weakConflicts.map((item) => {
  const resourceElement = generating[item.dayElement];

  const bestSupportiveScore = Math.max(
    item.scores[item.dayElement],
    item.scores[resourceElement]
  );

  const primaryScore = item.scores[item.primary];
  const gap = primaryScore - bestSupportiveScore;

  return {
    birthDate: item.birthDate,
    birthTime: item.birthTime,
    level: item.level,
    dayElement: item.dayElement,
    primary: item.primary,
    primaryScore,
    bestSupportiveScore,
    gap: Math.round(gap * 10) / 10,
  };
});

const gapRanges = {
  "0 이하": weakGapResults.filter((item) => item.gap <= 0).length,
  "0~5": weakGapResults.filter(
    (item) => item.gap > 0 && item.gap <= 5
  ).length,
  "5~10": weakGapResults.filter(
    (item) => item.gap > 5 && item.gap <= 10
  ).length,
  "10~15": weakGapResults.filter(
    (item) => item.gap > 10 && item.gap <= 15
  ).length,
  "15~20": weakGapResults.filter(
    (item) => item.gap > 15 && item.gap <= 20
  ).length,
  "20 초과": weakGapResults.filter((item) => item.gap > 20).length,
};

console.log(gapRanges);

console.log("=== 점수차 큰 사례 TOP 10 ===");
console.table(
  [...weakGapResults]
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 10)
);

console.log("=== 최종 충돌 13건 요약 ===");

console.table(
  suspicious.map((item) => {
    const primaryDetail = item.scoreDetails[item.primary] as {
      strength: number;
      balance: number;
      season: number;
      climate: number;
      passage: number;
      excess: number;
      total: number;
    };

    return {
      birthDate: item.birthDate,
      birthTime: item.birthTime,
      level: item.level,
      dayElement: item.dayElement,
      primary: item.primary,
      primaryScore: item.scores[item.primary],
      strength: primaryDetail.strength,
      climate: primaryDetail.climate,
      passage: primaryDetail.passage,
      total: primaryDetail.total,
    };
  })
);