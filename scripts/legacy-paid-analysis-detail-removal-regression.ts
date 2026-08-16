import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

function listFiles(relativeDir: string): string[] {
  const absoluteDir = join(process.cwd(), relativeDir);
  return readdirSync(absoluteDir).flatMap((entry) => {
    const relativePath = join(relativeDir, entry);
    return statSync(join(process.cwd(), relativePath)).isDirectory()
      ? listFiles(relativePath)
      : [relativePath];
  });
}

assert(!existsSync(join(process.cwd(), "app/api/paid-analysis-detail")), "the unauthenticated legacy v1 paid-analysis-detail route must not exist");
assert(!existsSync(join(process.cwd(), "app/paid-analysis/[productId]/PaidAnalysisDetailClient.tsx")), "the dead v1 paid analysis client must not exist");
console.log("1. legacy v1 route and client are absent ✓");

// Matches the v1 endpoint only: "/api/paid-analysis-detail" not followed by "-v2".
const legacyEndpoint = /["'`]\/api\/paid-analysis-detail(?!-v2)/;
const offenders = listFiles("app").filter((file) => legacyEndpoint.test(read(file)));
assert(offenders.length === 0, `no app code may call the legacy v1 endpoint: ${offenders.join(", ")}`);
console.log("2. no production code calls the legacy v1 endpoint ✓");

const detailRoute = read("app/api/paid-analysis-detail-v2/route.ts");
const generateIndex = detailRoute.indexOf("generatePaidAnalysisDetailV2(");
assert(generateIndex > 0, "v2 route must still generate the paid report");
for (const guard of ["getCurrentUser()", "getUserProfile(input.profileId, user.id)", "getActiveEntitlementForProfile(", "claimPaidReport("]) {
  const guardIndex = detailRoute.indexOf(guard);
  assert(guardIndex > 0 && guardIndex < generateIndex, `v2 route must run ${guard} before any OpenAI call`);
}
console.log("3. v2 route keeps auth, ownership, entitlement and claim before OpenAI ✓");

console.log("legacy paid-analysis-detail removal regression passed");
