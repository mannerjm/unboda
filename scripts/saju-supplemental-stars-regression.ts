import assert from "node:assert/strict";
import { getSaju } from "../app/lib/manse";
import { buildSajuResponse } from "../app/lib/buildSajuResponse";
import {
  getSupplementalPillarStars,
} from "../app/lib/sajuSupplementalStars";

function stars(dayStem: string, targetBranch: string, pillarHanja = "", isDayPillar = false) {
  return getSupplementalPillarStars({
    dayStem,
    targetStem: pillarHanja[0] ?? "",
    targetBranch,
    pillarHanja,
    isDayPillar,
  });
}

assert.ok(stars("甲", "巳").includes("문창귀인"), "甲 day stem should find 문창귀인 at 巳");
assert.ok(stars("甲", "亥").includes("문곡귀인"), "甲 day stem should find 문곡귀인 at 亥");
assert.ok(stars("甲", "亥").includes("학당귀인"), "甲 day stem should find 학당귀인 at 亥");
assert.ok(stars("癸", "申").includes("태극귀인"), "癸 day stem should find 태극귀인 at 申");
assert.ok(stars("癸", "亥").includes("협록"), "癸 day stem should find 협록 at 亥");
assert.ok(stars("癸", "丑").includes("암록"), "癸 day stem should find 암록 at 丑");
assert.ok(stars("癸", "寅").includes("금여"), "癸 day stem should find 금여 at 寅");
assert.ok(stars("癸", "申").includes("홍염살"), "癸 day stem should find 홍염살 at 申");
assert.ok(stars("甲", "卯").includes("양인살"), "甲 day stem should find 양인살 at 卯");
assert.ok(!stars("癸", "丑").includes("양인살"), "V1 should not assign 양인살 to yin day stems");
assert.ok(stars("甲", "辰", "甲辰").includes("백호대살"), "甲辰 pillar should find 백호대살");
assert.ok(stars("庚", "辰", "庚辰", true).includes("괴강살"), "庚辰 day pillar should find 괴강살");
assert.ok(!stars("庚", "辰", "庚辰", false).includes("괴강살"), "V1 괴강살 should remain a day-pillar rule");

// Production screenshot contract: 1987-02-03 22:30 (solar, male) currently renders
// 丙寅 / 辛丑 / 癸未 / 癸亥. The supplemental rules must enrich that existing chart
// without replacing its current 12신살 calculation.
const sample = buildSajuResponse(
  getSaju("1987-02-03", "22:30", "양력", "평달", "남성", "2026-09-11"),
);

assert.equal(sample.yearPillarHanja, "丙寅", "sample year pillar must stay stable");
assert.equal(sample.monthPillarHanja, "辛丑", "sample month pillar must stay stable");
assert.equal(sample.dayPillarHanja, "癸未", "sample day pillar must stay stable");
assert.equal(sample.hourPillarHanja, "癸亥", "sample hour pillar must stay stable");
assert.equal(sample.daySpirit, "화개살", "existing 12신살 result must remain intact");
assert.ok(sample.yearNobles.includes("금여"), "sample year pillar should add 금여");
assert.ok(sample.monthNobles.includes("협록") && sample.monthNobles.includes("암록"), "sample month pillar should add 협록 and 암록");
assert.ok(sample.hourNobles.includes("협록"), "sample hour pillar should add 협록");

console.log("saju supplemental stars regression passed ✓");
