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
  갑: "寅",
  을: "卯",
  병: "巳",
  정: "午",
  무: "巳",
  기: "午",
  경: "申",
  신: "酉",
  임: "亥",
  계: "子",
};

const yanginBranchByDayStem: Record<string, string> = {
  갑: "卯",
  을: "寅",
  병: "午",
  정: "巳",
  무: "午",
  기: "巳",
  경: "酉",
  신: "申",
  임: "子",
  계: "亥",
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

const exposedHiddenStem =
  mainHiddenStem && exposedHiddenStems.includes(mainHiddenStem)
    ? mainHiddenStem
    : exposedHiddenStems[0] ?? "";



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

const fallbackGyeokguk =
  !hasDirectExposure && mainGyeokguk
    ? `${mainGyeokguk} 후보`
    : "";

const detectedSpecialCandidate =
  specialCandidates[0] ?? "";

const primary =
  exposedGyeokguk ||
  specialGyeokguk ||
  detectedSpecialCandidate ||
  fallbackGyeokguk ||
  "특수격 검토 필요";

const candidates = Array.from(
  new Set([
    ...monthHiddenStems
      .map(toGyeokgukName)
      .filter((name) => name !== ""),
    ...specialCandidates,
  ])
);

const reason = exposedGyeokguk
  ? `월지 ${monthBranch}의 지장간 ${monthHiddenStems.join(
      ", "
    )} 중 ${exposedHiddenStem}이 월간 ${monthStem}으로 투출되었습니다. ` +
    `일간 ${dayStem} 기준 ${getTenGod(
      dayStem,
       exposedHiddenStem ?? ""
    )} 관계이므로 ${exposedGyeokguk}을 1차 격국으로 판단했습니다.`
  : fallbackGyeokguk
? `월지 ${monthBranch}에서 직접 투출된 8격 성분이 없어 본기 ${mainHiddenStem}을 우선 검토했습니다. 일간 ${dayStem} 기준 ${getTenGod(
    dayStem,
    mainHiddenStem
  )} 관계이므로 ${mainGyeokguk}을 확정하지 않고 ${fallbackGyeokguk}로 분류했습니다.`
  : specialGyeokguk
? `월지 ${monthBranch}가 일간 ${dayStem} 기준 ${specialGyeokguk} 조건에 해당하여 ${specialGyeokguk}으로 판단했습니다.`
: detectedSpecialCandidate
? `일반 8격과 건록·양인 조건으로 바로 확정되지 않았습니다. 천간의 십신 분포를 검토한 결과 생조 계열 ${supportingCount}개, 설기·재관 계열 ${drainingCount}개가 확인되어 ${detectedSpecialCandidate}로 분류했습니다. 다만 현재 단계에서는 특수격 확정이 아닌 후보 판정입니다.`
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