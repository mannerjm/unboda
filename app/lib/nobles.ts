const heavenlyNobleBranches: Record<string, string[]> = {
  甲: ["丑", "未"],
  乙: ["子", "申"],
  丙: ["亥", "酉"],
  丁: ["酉", "亥"],
  戊: ["丑", "未"],
  己: ["子", "申"],
  庚: ["丑", "未"],
  辛: ["寅", "午"],
  壬: ["卯", "巳"],
  癸: ["卯", "巳"],
};

const heavenlyVirtueMap: Record<
  string,
  { type: "stem" | "branch"; value: string }
> = {
  寅: { type: "stem", value: "丁" },
  卯: { type: "branch", value: "申" },
  辰: { type: "stem", value: "壬" },
  巳: { type: "stem", value: "辛" },
  午: { type: "branch", value: "亥" },
  未: { type: "stem", value: "甲" },
  申: { type: "stem", value: "癸" },
  酉: { type: "branch", value: "寅" },
  戌: { type: "stem", value: "丙" },
  亥: { type: "stem", value: "乙" },
  子: { type: "branch", value: "巳" },
  丑: { type: "stem", value: "庚" },
};

const monthlyVirtueStemMap: Record<string, string> = {
  寅: "丙",
  午: "丙",
  戌: "丙",

  亥: "甲",
  卯: "甲",
  未: "甲",

  申: "壬",
  子: "壬",
  辰: "壬",

  巳: "庚",
  酉: "庚",
  丑: "庚",
};

const literaryNobleBranchMap: Record<string, string[]> = {
  甲: ["巳"],
  乙: ["午"],
  丙: ["申"],
  丁: ["酉"],
  戊: ["申"],
  己: ["酉"],
  庚: ["亥"],
  辛: ["子"],
  壬: ["寅"],
  癸: ["卯"],
};

const schoolNobleBranchMap: Record<string, string[]> = {
  甲: ["亥"],
  乙: ["午"],
  丙: ["寅"],
  丁: ["酉"],
  戊: ["寅"],
  己: ["酉"],
  庚: ["巳"],
  辛: ["子"],
  壬: ["申"],
  癸: ["卯"],
};

const taegeukNobleBranchMap: Record<string, string[]> = {
  甲: ["子", "午"],
  乙: ["子", "午"],
  丙: ["卯", "酉"],
  丁: ["卯", "酉"],
  戊: ["辰", "戌", "丑", "未"],
  己: ["辰", "戌", "丑", "未"],
  庚: ["寅", "亥"],
  辛: ["寅", "亥"],
  壬: ["巳", "申"],
  癸: ["巳", "申"],
};

function hasHeavenlyNoble(
  dayStem: string,
  targetBranch: string
): boolean {
  const nobleBranches = heavenlyNobleBranches[dayStem];

  if (!nobleBranches || !targetBranch) {
    return false;
  }

  return nobleBranches.includes(targetBranch);
}

function hasHeavenlyVirtue(
  monthBranch: string,
  targetStem: string,
  targetBranch: string
): boolean {
  const condition = heavenlyVirtueMap[monthBranch];

  if (!condition) {
    return false;
  }

  return condition.type === "stem"
    ? targetStem === condition.value
    : targetBranch === condition.value;
}

function hasMonthlyVirtue(
  monthBranch: string,
  targetStem: string
): boolean {
  const virtueStem = monthlyVirtueStemMap[monthBranch];

  if (!virtueStem) {
    return false;
  }

  return targetStem === virtueStem;
}
function matchesBranchMap(
  map: Record<string, string[]>,
  dayStem: string,
  targetBranch: string
): boolean {
  const branches = map[dayStem];

  if (!branches || !targetBranch) {
    return false;
  }

  return branches.includes(targetBranch);
}

export function getNobleList(
  dayStem: string,
  monthBranch: string,
  targetStem: string,
  targetBranch: string
): string[] {
  const nobles: string[] = [];

  if (hasHeavenlyNoble(dayStem, targetBranch)) {
    nobles.push("천을귀인");
  }

  if (
    hasHeavenlyVirtue(
      monthBranch,
      targetStem,
      targetBranch
    )
  ) {
    nobles.push("천덕귀인");
  }

  if (hasMonthlyVirtue(monthBranch, targetStem)) {
    nobles.push("월덕귀인");
  }

   if (
    matchesBranchMap(
      literaryNobleBranchMap,
      dayStem,
      targetBranch
    )
  ) {
    nobles.push("문창귀인");
  }

  if (
    matchesBranchMap(
      schoolNobleBranchMap,
      dayStem,
      targetBranch
    )
  ) {
    nobles.push("학당귀인");
  }

  if (
    matchesBranchMap(
      taegeukNobleBranchMap,
      dayStem,
      targetBranch
    )
  ) {
    nobles.push("태극귀인");
  }
  return nobles;
}