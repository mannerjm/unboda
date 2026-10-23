import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getNicePublicOrigin, NICE_PUBLIC_ORIGIN, NiceGatewayError } from "../app/lib/identity/niceGateway";

const stageOrigin = "https://unboda-e2efixture-unboda.vercel.app";
const branchOrigin = "https://unboda-git-test-staging-tenant-e2e-unboda.vercel.app";
const fixtureEnvironment = {
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "test/staging-tenant-e2e",
  VERCEL_URL: new URL(stageOrigin).host,
  VERCEL_BRANCH_URL: new URL(branchOrigin).host,
  UNBODA_E2E_STAGING_ENABLED: "true",
  NEXT_PUBLIC_SUPABASE_URL: "https://xdiitqyysmhicjcytckm.supabase.co",
  TOSS_ENVIRONMENT: "sandbox",
  TOSS_ALLOW_LIVE: "false",
  TOSS_LIVE_PILOT_ENABLED: "false",
  TOSS_LIVE_CHECKOUT_ENABLED: "false",
};
const savedEnvironment = Object.fromEntries(Object.keys(fixtureEnvironment).map(key => [key, process.env[key]]));
let checks = 0;

function rejectsOrigin(url: string, overrides: Record<string, string | undefined> = {}) {
  Object.assign(process.env, fixtureEnvironment);
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  assert.throws(() => getNicePublicOrigin(url), error => error instanceof NiceGatewayError
    && error.code === "IDENTITY_ORIGIN_NOT_CONFIGURED");
  checks += 1;
}

try {
  Object.assign(process.env, fixtureEnvironment);
  assert.equal(getNicePublicOrigin(`${stageOrigin}/api/identity/nice/start`), stageOrigin);
  assert.equal(getNicePublicOrigin(`${branchOrigin}/api/identity/nice/callback?state=fixture`), branchOrigin);
  checks += 2;

  rejectsOrigin("https://unboda.kr/api/identity/nice/callback");
  rejectsOrigin("https://unboda-other-unboda.vercel.app/api/identity/nice/start");
  rejectsOrigin(`${stageOrigin}/api/identity/nice/start`, { VERCEL_GIT_COMMIT_REF: "feature/unrelated" });
  rejectsOrigin(`${stageOrigin}/api/identity/nice/start`, { NEXT_PUBLIC_SUPABASE_URL: "https://eiyvdmorqclirvidihlm.supabase.co" });
  rejectsOrigin(`${stageOrigin}/api/identity/nice/start`, { UNBODA_E2E_STAGING_ENABLED: "false" });
  for (const key of ["TOSS_ALLOW_LIVE", "TOSS_LIVE_PILOT_ENABLED", "TOSS_LIVE_CHECKOUT_ENABLED"]) {
    rejectsOrigin(`${stageOrigin}/api/identity/nice/start`, { [key]: "true" });
  }
  rejectsOrigin(`${stageOrigin}/api/identity/nice/start`, { TOSS_ENVIRONMENT: "production" });
  rejectsOrigin(stageOrigin.replace("https:", "http:") + "/api/identity/nice/start");
  rejectsOrigin("https://user:fixture@unboda-e2efixture-unboda.vercel.app/api/identity/nice/start");
  rejectsOrigin("https://unboda-e2efixture-unboda.vercel.app:444/api/identity/nice/start");
  rejectsOrigin("https://unboda-e2efixture-unboda.vercel.app.evil.example/api/identity/nice/start", {
    VERCEL_URL: "unboda-e2efixture-unboda.vercel.app.evil.example",
  });
  rejectsOrigin(`${stageOrigin}/api/identity/nice/start`, { VERCEL_URL: undefined, VERCEL_BRANCH_URL: undefined });
  rejectsOrigin("not a URL");

  Object.assign(process.env, fixtureEnvironment, { VERCEL_ENV: "production" });
  assert.equal(getNicePublicOrigin("https://unboda.kr/api/identity/nice/start"), NICE_PUBLIC_ORIGIN);
  assert.equal(getNicePublicOrigin(`${stageOrigin}/api/identity/nice/start`), NICE_PUBLIC_ORIGIN);
  checks += 2;

  for (const route of ["start", "callback", "close"]) {
    const source = readFileSync(`app/api/identity/nice/${route}/route.ts`, "utf8");
    assert.match(source, /getNicePublicOrigin\(request\.url\)/);
    assert.doesNotMatch(source, /\$\{NICE_PUBLIC_ORIGIN\}/);
    checks += 1;
  }
} finally {
  for (const [key, value] of Object.entries(savedEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

console.log(`nice-staging-origin-regression: PASS (${checks} checks; no provider or database calls)`);
