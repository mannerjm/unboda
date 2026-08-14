import { readFileSync } from "fs";
import { join } from "path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const source = readFileSync(
  join(process.cwd(), "app/result/page.tsx"),
  "utf-8",
);

assert(source.includes('stem: freeAnalysis?.hourStem ?? sajuData.hourStem'), "hour stem calculation binding must remain");
assert(source.includes('tenGod: freeAnalysis?.dayTenGod ?? sajuData.dayTenGod'), "day ten-god calculation binding must remain");
assert(source.includes('branchTenGod:'), "branch ten-god calculation binding must remain");
console.log("1. stem and branch ten-god data bindings preserved ✓");

const headerStart = source.indexOf('<p className="text-sm font-semibold">{pillar.label}</p>');
const stemLabelStart = source.indexOf("천간", headerStart);
const headerSlice = source.slice(headerStart, stemLabelStart);
assert(!headerSlice.includes("pillar.tenGod"), "stem ten-god must not render in the pillar header");
console.log("2. stem ten-god removed from pillar header ✓");

const stemSlice = source.slice(stemLabelStart, source.indexOf("지지", stemLabelStart));
assert(stemSlice.includes("{pillar.tenGod || \"\"}"), "stem ten-god must render inside the stem section");
assert(stemSlice.includes("mb-1 text-xs"), "stem ten-god must use symmetric ten-god spacing");
assert(stemSlice.indexOf("{pillar.tenGod || \"\"}") < stemSlice.indexOf("{pillar.stem || \"-\"}"), "stem ten-god must appear before stem character");
console.log("3. stem ten-god renders inside stem area before stem character ✓");

const branchSlice = source.slice(source.indexOf("지지", stemLabelStart), source.indexOf("{pillar.hiddenStems.map", stemLabelStart));
assert(branchSlice.includes("{pillar.branchTenGod || \"\"}"), "branch ten-god must remain in branch section");
assert(branchSlice.indexOf("{pillar.branchTenGod || \"\"}") < branchSlice.indexOf("{pillar.branch || \"-\"}"), "branch ten-god must remain before branch character");
console.log("4. branch ten-god placement preserved ✓");

console.log("\nfour-pillars-ten-god-layout-regression passed ✓");
