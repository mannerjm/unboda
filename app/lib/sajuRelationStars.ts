export type SajuPillarPosition = "year" | "month" | "day" | "hour";

export type SajuRelationStar = {
  name: "원진살" | "귀문관살" | "공망";
  kind: "pair" | "void";
  positions: SajuPillarPosition[];
  branches: string[];
  basis: string;
};

type RelationCarrier = {
  yearBranch: string;
  monthBranch: string;
  dayBranch: string;
  hourBranch: string;
  dayPillarHanja: string;
  relationStars?: SajuRelationStar[];
};

const branchOrder = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
const stemOrder = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;

// 운보다 관계형 신살 V1 정책:
// - 원진살: 子未·丑午·寅酉·卯申·辰亥·巳戌
// - 귀문관살: 子酉·丑午·寅未·卯申·辰亥·巳戌
// - 공망: 일주가 속한 旬의 두 공망 지지를 항상 계산하고,
//   원국 네 지지에서 실제 해당 위치가 있으면 함께 표시한다.
// 관계형 신살은 단일 기둥 배지에 섞지 않고 별도 영역으로 노출한다.
const wonjinPairs = new Set(["子未", "丑午", "寅酉", "卯申", "辰亥", "巳戌"]);
const gwimunPairs = new Set(["子酉", "丑午", "寅未", "卯申", "辰亥", "巳戌"]);

function pairMatches(pairSet: Set<string>, first: string, second: string): boolean {
  return pairSet.has(`${first}${second}`) || pairSet.has(`${second}${first}`);
}

export function getDayPillarVoidBranches(dayPillarHanja: string): string[] {
  const stem = dayPillarHanja?.[0] ?? "";
  const branch = dayPillarHanja?.[1] ?? "";
  const stemIndex = stemOrder.indexOf(stem as (typeof stemOrder)[number]);
  const branchIndex = branchOrder.indexOf(branch as (typeof branchOrder)[number]);
  if (stemIndex < 0 || branchIndex < 0) return [];

  const xunStartBranchIndex = (branchIndex - stemIndex + 12) % 12;
  return [
    branchOrder[(xunStartBranchIndex + 10) % 12],
    branchOrder[(xunStartBranchIndex + 11) % 12],
  ];
}

export function calculateSajuRelationStars(value: RelationCarrier): SajuRelationStar[] {
  const pillars: Array<{ position: SajuPillarPosition; branch: string }> = [
    { position: "year", branch: value.yearBranch },
    { position: "month", branch: value.monthBranch },
    { position: "day", branch: value.dayBranch },
    { position: "hour", branch: value.hourBranch },
  ];
  const results: SajuRelationStar[] = [];

  for (let left = 0; left < pillars.length; left += 1) {
    for (let right = left + 1; right < pillars.length; right += 1) {
      const first = pillars[left];
      const second = pillars[right];
      if (!first.branch || !second.branch) continue;

      if (pairMatches(wonjinPairs, first.branch, second.branch)) {
        results.push({
          name: "원진살",
          kind: "pair",
          positions: [first.position, second.position],
          branches: [first.branch, second.branch],
          basis: `${first.branch}·${second.branch}`,
        });
      }

      if (pairMatches(gwimunPairs, first.branch, second.branch)) {
        results.push({
          name: "귀문관살",
          kind: "pair",
          positions: [first.position, second.position],
          branches: [first.branch, second.branch],
          basis: `${first.branch}·${second.branch}`,
        });
      }
    }
  }

  const voidBranches = getDayPillarVoidBranches(value.dayPillarHanja);
  if (voidBranches.length === 2) {
    const matchedPillars = pillars.filter((pillar) => voidBranches.includes(pillar.branch));
    results.push({
      name: "공망",
      kind: "void",
      positions: matchedPillars.map((pillar) => pillar.position),
      branches: matchedPillars.map((pillar) => pillar.branch),
      basis: voidBranches.join("·"),
    });
  }

  return results;
}

export function enrichSajuRelationStars<T extends RelationCarrier>(value: T): T & { relationStars: SajuRelationStar[] } {
  return {
    ...value,
    relationStars: calculateSajuRelationStars(value),
  };
}
