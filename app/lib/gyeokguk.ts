import type { StrengthAnalysis } from "./strength";
import { getTenGod } from "./tenGod";


export type GyeokgukResult = {
  primary: string;
  candidates: string[];
  reason: string;
};

type GyeokgukInput = {
  dayStem: string;

  yearStem: string;
  monthStem: string;
  hourStem: string;

  yearBranch: string;
  monthBranch: string;
  dayBranch: string;
  hourBranch: string;

  monthHiddenStems: string[];

  strengthAnalysis: StrengthAnalysis;
};

export function analyzeGyeokguk({
  dayStem,
  yearStem,
  monthStem,
  hourStem,
  yearBranch,
  monthBranch,
  dayBranch,
  hourBranch,
  monthHiddenStems,
  strengthAnalysis,
}: GyeokgukInput): GyeokgukResult {

const toGyeokgukName = (stem: string) => {
  const tenGod = getTenGod(dayStem, stem);

  const map: Record<string, string> = {
    정관: "정관격",
    편관: "편관격",
    정재: "정재격",
    편재: "편재격",
    정인: "정인격",
    편인: "편인격",
    식신: "식신격",
    상관: "상관격",
  };

  return map[tenGod] ?? "";
};
const otherStems = [
  yearStem,
  monthStem,
  hourStem,
].filter(Boolean);

const allBranches = [
  yearBranch,
  monthBranch,
  dayBranch,
  hourBranch,
].filter(Boolean);

const branchMainStemMap: Record<string, string> = {
  子: "癸",
  丑: "己",
  寅: "甲",
  卯: "乙",
  辰: "戊",
  巳: "丙",
  午: "丁",
  未: "己",
  申: "庚",
  酉: "辛",
  戌: "戊",
  亥: "壬",
};

const branchMainStems = allBranches
  .map((branch) => branchMainStemMap[branch])
  .filter(Boolean);

const tenGods = [
  ...otherStems.map((stem) => getTenGod(dayStem, stem)),
  ...branchMainStems.map((stem) => getTenGod(dayStem, stem)),
];

const supportingCount = tenGods.filter(
  (tenGod) =>
    tenGod === "비견" ||
    tenGod === "겁재" ||
    tenGod === "정인" ||
    tenGod === "편인"
).length;

const drainingCount = tenGods.filter(
  (tenGod) =>
    tenGod === "식신" ||
    tenGod === "상관" ||
    tenGod === "정재" ||
    tenGod === "편재" ||
    tenGod === "정관" ||
    tenGod === "편관"
).length;

const specialCandidates: string[] = [];

const isVeryStrong =
  strengthAnalysis.level === "매우 신강";

const isVeryWeak =
  strengthAnalysis.level === "매우 신약";

const hasMeaningfulSupport =
  supportingCount >= 2;

if (
  isVeryStrong &&
  supportingCount >= 4 &&
  supportingCount > drainingCount
) {
  specialCandidates.push("전왕격 후보");
}

if (
  isVeryWeak &&
  !hasMeaningfulSupport &&
  drainingCount >= 5 &&
  drainingCount > supportingCount
) {
  specialCandidates.push("종격 후보");
}


const geonrokBranchByDayStem: Record<string, string> = {
  甲: "寅",
  乙: "卯",
  丙: "巳",
  丁: "午",
  戊: "巳",
  己: "午",
  庚: "申",
  辛: "酉",
  壬: "亥",
  癸: "子",
};

const yanginBranchByDayStem: Record<string, string> = {
  甲: "卯",
  乙: "寅",
  丙: "午",
  丁: "巳",
  戊: "午",
  己: "巳",
  庚: "酉",
  辛: "申",
  壬: "子",
  癸: "亥",
};

const specialGyeokguk =
  geonrokBranchByDayStem[dayStem] === monthBranch
    ? "건록격"
    : yanginBranchByDayStem[dayStem] === monthBranch
    ? "양인격"
    : "";


// 월지 지장간 중 월간에 실제로 투출된 글자
const visibleStems = [
  yearStem,
  monthStem,
  hourStem,
].filter(Boolean);

// 지장간 첫 번째 값을 본기로 사용
const mainHiddenStem = monthHiddenStems[0] ?? "";

const exposedHiddenStems = monthHiddenStems.filter(
  (hiddenStem) => visibleStems.includes(hiddenStem)
);
const hiddenStemPriority = [
  mainHiddenStem,
  ...monthHiddenStems.filter((stem) => stem !== mainHiddenStem),
].filter(Boolean);

const exposedHiddenStem =
  hiddenStemPriority.find((stem) =>
    exposedHiddenStems.includes(stem)
  ) ?? "";

const exposedStemPosition =
  exposedHiddenStem === yearStem
    ? "연간"
    : exposedHiddenStem === monthStem
    ? "월간"
    : exposedHiddenStem === hourStem
    ? "시간"
    : "";

    const exposedStemDetails = exposedHiddenStems
  .map((stem) => {
    const position =
      stem === yearStem
        ? "년간"
        : stem === monthStem
        ? "월간"
        : stem === hourStem
        ? "시간"
        : "";

    return position ? `${stem}은 ${position}` : "";
  })
  .filter(Boolean);




// 투간된 글자가 8격에 해당하면 최우선
const exposedGyeokguk = exposedHiddenStem
  ? toGyeokgukName(exposedHiddenStem)
  : "";

// 투간이 없거나 비견·겁재라면 본기 기준으로 보조 판정
const mainGyeokguk = mainHiddenStem
  ? toGyeokgukName(mainHiddenStem)
  : "";

const hasDirectExposure =
  exposedGyeokguk !== "";

const fallbackCandidate =
  !hasDirectExposure && mainGyeokguk
    ? `${mainGyeokguk} 후보`
    : "";

const detectedSpecialCandidate =
  specialCandidates[0] ?? "";

const primary =
  specialGyeokguk ||
  exposedGyeokguk ||
  detectedSpecialCandidate ||
  "격국 미확정";


const candidates = Array.from(
  new Set([
    ...exposedHiddenStems
      .map(toGyeokgukName)
      .filter((name) => name !== ""),
    ...(fallbackCandidate ? [fallbackCandidate] : []),
    ...specialCandidates,
  ])
);

const reason = specialGyeokguk
  ? exposedGyeokguk
    ? `월지 ${monthBranch}가 일간 ${dayStem} 기준 ${specialGyeokguk} 조건에 해당합니다. 또한 월지 지장간 중 ${exposedHiddenStem}이 ${exposedStemPosition}으로 투출되어 ${exposedGyeokguk} 조건도 확인되지만, 월지 기반 ${specialGyeokguk}을 우선하여 주 격국으로 판단했습니다.`
    : `월지 ${monthBranch}가 일간 ${dayStem} 기준 ${specialGyeokguk} 조건에 해당하여 ${specialGyeokguk}으로 판단했습니다.`
  : exposedGyeokguk
  ? `월지 ${monthBranch}의 지장간 ${monthHiddenStems.join(
      ", "
    )} 중 ${exposedStemDetails.join(", ")}에 투출되었습니다. ` +
    `이 중 ${exposedHiddenStem}을 우선 선택했습니다. ` +
    `일간 ${dayStem} 기준 ${getTenGod(
      dayStem,
      exposedHiddenStem ?? ""
    )} 관계이므로 ${exposedGyeokguk}을 1차 격국으로 판단했습니다.`
  : fallbackCandidate
  ? `월지 ${monthBranch}에 직접 투출된 8격 성분이 없어 본기 ${mainHiddenStem}을 우선 검토했습니다. 일간 ${dayStem} 기준 ${getTenGod(
      dayStem,
      mainHiddenStem
    )} 관계이므로 ${mainGyeokguk}을 확정하지 않고 ${fallbackCandidate}로 분류했습니다.`
  : detectedSpecialCandidate
  ? `일반 8격과 건록·양인 조건으로 바로 확정되지 않았습니다. 천간의 십신 분포를 검토한 결과 생조 계열 ${supportingCount}개, 설기·재관 계열 ${drainingCount}개가 확인되어 ${detectedSpecialCandidate} 후보로 분류했습니다.`
  : `월지 ${monthBranch}의 지장간 ${monthHiddenStems.join(
      ", "
    )}에서 일반 8격이나 건록·양인, 특수격 후보 조건으로 확정하기 어려워 추가 검토가 필요합니다.`;

const filteredCandidates = candidates.filter(
  (candidate) => candidate !== primary
);

return {
  primary,
  candidates: filteredCandidates,
  reason,
};

}