/* Synthetic financial MFA gate tests. Never connects to real user sessions or payments. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

const input = fs.readFileSync("app/lib/operators/financialMfa.ts", "utf8");
const transpiled = ts.transpileModule(input, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

let aal = { currentLevel: "aal1", nextLevel: "aal1" };
let error = null;
let throwDuringCheck = false;
const mocks = {
  "server-only": {},
  "@/app/lib/supabase/server": {
    createClient: async () => ({
      auth: { mfa: {
        getAuthenticatorAssuranceLevel: async () => {
          if (throwDuringCheck) throw Error("Synthetic auth service outage");
          return { data: aal, error };
        },
      } },
    }),
  },
};

const moduleObject = { exports: {} };
new Function("require", "module", "exports", transpiled)(
  (specifier) => {
    if (!(specifier in mocks)) throw Error("Unexpected dependency: " + specifier);
    return mocks[specifier];
  }, moduleObject, moduleObject.exports,
);
const { isFinancialMfaVerified } = moduleObject.exports;
(async () => {
  const variants = [
    [{ currentLevel: "aal1", nextLevel: "aal1" }, false],
    [{ currentLevel: "aal1", nextLevel: "aal2" }, false],
    [{ currentLevel: "aal2", nextLevel: "aal1" }, false],
    [{ currentLevel: "aal2", nextLevel: "aal2" }, true],
  ];
  for (const [levels, allowed] of variants) {
    aal = levels;
    assert.equal(await isFinancialMfaVerified(), allowed, JSON.stringify(levels));
  }
  error = Error("Synthetic MFA error");
  assert.equal(await isFinancialMfaVerified(), false, "MFA API failures fail closed");
  error = null;
  throwDuringCheck = true;
  assert.equal(await isFinancialMfaVerified(), false, "MFA service exceptions fail closed");

  const handler = fs.readFileSync("app/api/internal/admin/report-refunds/route.ts", "utf8");
  assert.equal((handler.match(/await isFinancialMfaVerified\(\)/g) || []).length, 2, "Both GET and POST require MFA");
  assert(handler.includes('mfaHref: "/admin/mfa"'));
  const screen = fs.readFileSync("app/admin/mfa/AdminMfaSetup.tsx", "utf8");
  assert(screen.includes('factorType: "totp"'));
  assert(screen.includes("challengeAndVerify"));
  assert(screen.includes("currentLevel === \"aal2\"") && screen.includes("nextLevel === \"aal2\""));
  assert(!screen.includes("localStorage"));
  console.log("admin-financial-mfa-regression: PASS (AAL states, stale JWT, errors, GET/POST gates, no money)");
})().catch((e) => { console.error(e); process.exitCode = 1; });
