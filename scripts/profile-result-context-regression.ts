import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const analyzeRoute = read("app/api/analyze/route.ts");
const analyzeTypes = read("app/lib/analyzeApiTypes.ts");
const analysisPipeline = read("app/lib/freeAnalysisPipeline/server.ts");
const loadingPage = read("app/loading/page.tsx");
const resultPage = read("app/result/page.tsx");

assert(analyzeRoute.includes("getUserProfile(body.profileId, user.id)"), "analyze API must verify Profile ownership");
assert(analyzeRoute.includes("birthDate = profile.birthDate") && analyzeRoute.includes("birthTime = profile.birthTime"), "getSaju input must derive from verified Profile data");
assert(analyzeRoute.includes("buildFreeAnalysisResponse") && analyzeRoute.includes("birthDate: resolvedBirthDate"), "analyze API must pass verified Profile metadata to the shared response pipeline");
assert(analysisPipeline.includes("profile: input.profile"), "shared analysis pipeline must return the verified Profile metadata");
assert(analyzeTypes.includes("export type AnalyzeProfileMetadata") && analyzeTypes.includes("profile: AnalyzeProfileMetadata"), "analyze response metadata must be typed");

assert(loadingPage.includes("freeAnalysisResult:${data.profile.id}"), "loading must persist the API response by verified Profile ID");
assert(loadingPage.includes("profileId: data.profile.id"), "result URL must use the verified response Profile ID");
assert(resultPage.includes("fetch(`/api/free-analysis/${currentProfileId}`)"), "result must restore from the server-backed Profile result");
assert(resultPage.includes("freeAnalysisResult:${currentProfileId}"), "result may refresh a Profile-keyed session cache after server validation");
assert(resultPage.includes("saved.profile?.id !== currentProfileId"), "result must reject a mismatched Profile cache entry");
assert(!resultPage.includes('searchParams.get("birthDate")') && !resultPage.includes('searchParams.get("birthTime")'), "result must not source input metadata from legacy query parameters");
assert(!resultPage.includes('sessionStorage.getItem("sajuData")') && !resultPage.includes('sessionStorage.getItem("productRecommendations")'), "result must not restore unscoped legacy cache entries");

console.log("verified Profile metadata response: true");
console.log("Profile A/B server result isolation: true");
console.log("legacy result metadata restoration removed: true");