import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const romantic = readFileSync("app/components/PaidCompatibilityAnalysisClient.tsx", "utf8");
const parentChild = readFileSync("app/components/PaidFamilyParentChildAnalysisClient.tsx", "utf8");
const extended = readFileSync("app/components/PaidFamilyExtendedAnalysisClient.tsx", "utf8");

for (const [name, source] of [
  ["romantic", romantic],
  ["parent-child", parentChild],
] as const) {
  assert(
    !source.includes('absolute -right-12 -top-16 h-40 w-40 rounded-full'),
    `${name} compatibility hero must not restore the clipped top-right orb`,
  );
  assert(
    source.includes('absolute -bottom-14 right-20 h-24 w-24 rounded-full bg-[#ddd8ff]/45 blur-2xl'),
    `${name} compatibility hero should keep only the soft ambient blur accent`,
  );
}

assert(
  !extended.includes('absolute -right-12 -top-16 h-40 w-40 rounded-full'),
  "extended-family hero should remain free of the clipped top-right orb",
);

console.log("Compatibility input hero decoration regression passed ✓");
