import assert from "node:assert/strict";
import { getSaju } from "../app/lib/manse";
import { buildSajuResponse } from "../app/lib/buildSajuResponse";
import {
  enrichSupplementalPillarStars,
  getSupplementalPillarStars,
} from "../app/lib/sajuSupplementalStars";
import {
  calculateSajuRelationStars,
  getDayPillarVoidBranches,
} from "../app/lib/sajuRelationStars";

function stars(dayStem: string, targetBranch: string, pillarHanja = "", isDayPillar = false) {
  return getSupplementalPillarStars({
    dayStem,
    targetStem: pillarHanja[0] ?? "",
    targetBranch,
    pillarHanja,
    isDayPillar,
  });
}

assert.ok(stars("甲", "巳").beneficStars.includes("문창귀인"), "甲 day stem should find 문창귀인 at 巳");
assert.ok(stars("甲", "亥").beneficStars.includes("문곡귀인"), "甲 day stem should find 문곡귀인 at 亥");
assert.ok(stars("甲", "亥").beneficStars.includes("학당귀인"), "甲 day stem should find 학당귀인 at 亥");
assert.ok(stars("癸", "申").beneficStars.includes("태극귀인"), "癸 day stem should find 태극귀인 at 申");
assert.ok(stars("癸", "亥").beneficStars.includes("협록"), "癸 day stem should find 협록 at 亥");
assert.ok(stars("癸", "丑").beneficStars.includes("암록"), "癸 day stem should find 암록 at 丑");
assert.ok(stars("癸", "寅").beneficStars.includes("금여"), "癸 day stem should find 금여 at 寅");
assert.ok(stars("癸", "申").specialStars.includes("홍염살"), "癸 day stem should classify 홍염살 as a special star");
assert.ok(stars("甲", "卯").specialStars.includes("양인살"), "甲 day stem should classify 양인살 as a special star");
assert.ok(!stars("癸", "丑").specialStars.includes("양인살"), "V2 should not assign 양인살 to yin day stems");
assert.ok(stars("甲", "辰", "甲辰").specialStars.includes("백호대살"), "甲辰 pillar should classify 백호대살 as a special star");
assert.ok(stars("庚", "辰", "庚辰", true).specialStars.includes("괴강살"), "庚辰 day pillar should classify 괴강살 as a special star");
assert.ok(!stars("庚", "辰", "庚辰", false).specialStars.includes("괴강살"), "V2 괴강살 should remain a day-pillar rule");

const legacy = enrichSupplementalPillarStars({
  dayStem: "甲",
  yearStem: "甲",
  yearBranch: "午",
  yearPillarHanja: "甲午",
  yearSpirit: "망신살",
  yearNobles: ["천을귀인", "홍염살"],
  monthStem: "乙",
  monthBranch: "丑",
  monthPillarHanja: "乙丑",
  monthSpirit: "반안살",
  monthNobles: [],
  dayBranch: "卯",
  dayPillarHanja: "甲卯",
  daySpirit: "년살",
  dayNobles: [],
  hourStem: "丙",
  hourBranch: "辰",
  hourPillarHanja: "丙辰",
  hourSpirit: "월살",
  hourNobles: [],
});

assert.ok(!legacy.yearNobles.includes("홍염살"), "legacy special stars must be removed from the gold benefic list");
assert.ok(legacy.yearSpecialStars.includes("홍염살"), "legacy 홍염살 must move into the special-star category");
assert.equal(legacy.yearSpirit, "망신살 · 홍염살", "special stars must render with the neutral spirit badge");
assert.ok(legacy.daySpecialStars.includes("양인살"), "day-pillar special stars must remain independently classified");
assert.equal(legacy.daySpirit, "년살 · 양인살", "12신살 and special stars must share neutral visual treatment without losing either value");

assert.deepEqual(getDayPillarVoidBranches("甲子"), ["戌", "亥"], "甲子旬 공망 must be 戌亥");
assert.deepEqual(getDayPillarVoidBranches("癸未"), ["申", "酉"], "癸未 in 甲戌旬 must use 申酉 공망");

const relationFixture = calculateSajuRelationStars({
  yearBranch: "子",
  monthBranch: "未",
  dayBranch: "酉",
  hourBranch: "亥",
  dayPillarHanja: "甲子",
});
assert.ok(
  relationFixture.some((item) => item.name === "원진살" && item.positions.join("-") === "year-month"),
  "子未 must be detected as 원진살",
);
assert.ok(
  relationFixture.some((item) => item.name === "귀문관살" && item.positions.join("-") === "year-day"),
  "子酉 must be detected as 귀문관살",
);
assert.ok(
  relationFixture.some((item) => item.name === "공망" && item.positions.includes("hour") && item.basis === "戌·亥"),
  "甲子旬 must mark an original-chart 亥 branch as 공망",
);

const noMatchedVoidFixture = calculateSajuRelationStars({
  yearBranch: "寅",
  monthBranch: "丑",
  dayBranch: "未",
  hourBranch: "亥",
  dayPillarHanja: "癸未",
});
const noMatchedVoid = noMatchedVoidFixture.find((item) => item.kind === "void");
assert.ok(noMatchedVoid, "valid day pillars must expose day-pillar void information even without an original-chart match");
assert.equal(noMatchedVoid?.basis, "申·酉", "癸未 day-pillar void information must expose 申酉");
assert.deepEqual(noMatchedVoid?.positions, [], "unmatched day-pillar void information must report no original-chart position");
assert.deepEqual(noMatchedVoid?.branches, [], "unmatched day-pillar void information must report no matched branch");

// Production screenshot contract: 1987-02-03 22:30 (solar, male) currently renders
// 丙寅 / 辛丑 / 癸未 / 癸亥. The benefic rules must enrich that existing chart
// without replacing its current 12신살 calculation. Relation V1 should additionally
// detect the 寅未 귀문관살 and always expose the 癸未 day-pillar void basis 申酉,
// while reporting that neither void branch occurs in the original chart.
const sample = buildSajuResponse(
  getSaju("1987-02-03", "22:30", "양력", "평달", "남성", "2026-09-11"),
);

assert.equal(sample.yearPillarHanja, "丙寅", "sample year pillar must stay stable");
assert.equal(sample.monthPillarHanja, "辛丑", "sample month pillar must stay stable");
assert.equal(sample.dayPillarHanja, "癸未", "sample day pillar must stay stable");
assert.equal(sample.hourPillarHanja, "癸亥", "sample hour pillar must stay stable");
assert.equal(sample.daySpirit, "화개살", "existing 12신살 result must remain intact when no special star applies");
assert.ok(sample.yearNobles.includes("금여"), "sample year pillar should add 금여 as a benefic star");
assert.ok(sample.monthNobles.includes("협록") && sample.monthNobles.includes("암록"), "sample month pillar should add 협록 and 암록 as benefic stars");
assert.ok(sample.hourNobles.includes("협록"), "sample hour pillar should add 협록 as a benefic star");
assert.deepEqual(sample.yearSpecialStars, [], "sample year pillar should not invent a special star");
assert.deepEqual(sample.monthSpecialStars, [], "sample month pillar should not invent a special star");
assert.deepEqual(sample.daySpecialStars, [], "sample day pillar should not invent a special star");
assert.deepEqual(sample.hourSpecialStars, [], "sample hour pillar should not invent a special star");
assert.deepEqual(
  sample.relationStars,
  [
    {
      name: "귀문관살",
      kind: "pair",
      positions: ["year", "day"],
      branches: ["寅", "未"],
      basis: "寅·未",
    },
    {
      name: "공망",
      kind: "void",
      positions: [],
      branches: [],
      basis: "申·酉",
    },
  ],
  "sample chart should expose 寅未 귀문관살 plus day-pillar void basis 申酉 with no original-chart match",
);

console.log("saju supplemental and relation star regression passed ✓");
