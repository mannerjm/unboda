import { readFileSync } from "node:fs";
import {
  getPremiumAnalysisHref,
  toPremiumAnalysisProductState,
} from "../app/lib/premiumAnalysisNavigation";

const appShellSource = readFileSync("app/components/AppShell.tsx", "utf8");
const deepAnalysisSource = readFileSync("app/deep-analysis/page.tsx", "utf8");
const recommendationSource = readFileSync("app/components/RecommendationTop3.tsx", "utf8");

function assertEqual(actual: string | null, expected: string | null, message: string): void {
  if (actual !== expected) throw new Error(`${message}: ${actual} !== ${expected}`);
}

const profileId = "profile-a";
assertEqual(
  getPremiumAnalysisHref("money-leak-risk", toPremiumAnalysisProductState(undefined), profileId),
  "/checkout/money-leak-risk?profileId=profile-a",
  "unowned product route",
);
assertEqual(
  getPremiumAnalysisHref("money-leak-risk", "none", profileId),
  null,
  "preparing product route",
);
assertEqual(
  getPremiumAnalysisHref("money-leak-risk", "completed", profileId),
  "/paid-analysis/money-leak-risk/report?profileId=profile-a",
  "completed product route",
);
assertEqual(
  getPremiumAnalysisHref("money-leak-risk", "generating", profileId),
  null,
  "generating product route",
);

for (const required of ["useSearchParams", "activeProfileId", "recommendationHref", "/recommendations", "/deep-analysis"]) {
  if (!appShellSource.includes(required)) throw new Error(`shell navigation contract missing: ${required}`);
}
if (!recommendationSource.includes("getPremiumAnalysisHref") || !recommendationSource.includes("href={href}")) {
  throw new Error("recommendation Top 3 does not use the canonical paid product destination");
}

console.log("navigation-contract-regression: OK");
