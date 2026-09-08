import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const saju = read("app/saju/page.tsx");

assert(saju.includes("/api/free-analysis/${profile.id}"), "Saju page checks for a stored free analysis for the active profile");
assert(saju.includes("router.replace(`/result?profileId=${profile.id}`)"), "Stored active-profile analysis opens directly in result view");
assert(saju.includes("setActiveProfile(profile)"), "Saju page still preserves the active profile when no stored result exists");
assert(saju.includes("운보다 AI로 분석하기"), "Users without a stored result can still start a free analysis");

console.log("saju-direct-result-regression: ok");
