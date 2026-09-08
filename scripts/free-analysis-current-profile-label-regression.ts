import { readFileSync } from "node:fs";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const route = readFileSync("app/api/free-analysis/[profileId]/route.ts", "utf8");

assert(
  route.includes("function withCurrentProfile") &&
    route.includes("label: profile.label") &&
    route.includes("birthDate: profile.birthDate") &&
    route.includes("birthTime: profile.birthTime") &&
    route.includes("gender: profile.gender") &&
    route.includes("calendarType: profile.calendarType") &&
    route.includes("isLeapMonth: profile.isLeapMonth"),
  "restored free analysis must expose the current authenticated profile metadata",
);

assert(
  route.includes("const analysis = withCurrentProfile(cached.content, profile);") &&
    route.includes("return NextResponse.json({ analysis });"),
  "all completed restored results must return the refreshed profile metadata",
);

assert(
  route.includes("cached.profileFingerprint !== getProfileFingerprint(profile)"),
  "profile fingerprint safety check must remain unchanged",
);

console.log("free-analysis current profile label regression: ok");
