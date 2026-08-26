import { getTossConfig } from "../app/lib/toss/config";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const env = process.env as Record<string, string | undefined>;
const original = {
  node: env.NODE_ENV,
  environment: env.TOSS_ENVIRONMENT,
  allowLive: env.TOSS_ALLOW_LIVE,
  client: env.NEXT_PUBLIC_TOSS_CLIENT_KEY,
  secret: env.TOSS_SECRET_KEY,
};

function configure(client: string | undefined, secret: string | undefined, production = false): void {
  env.NODE_ENV = production ? "production" : "test";
  delete env.TOSS_ENVIRONMENT;
  delete env.TOSS_ALLOW_LIVE;
  env.NEXT_PUBLIC_TOSS_CLIENT_KEY = client;
  env.TOSS_SECRET_KEY = secret;
}

function expectFailure(message: string): void {
  let failed = false;
  try {
    getTossConfig();
  } catch {
    failed = true;
  }
  assert(failed, message);
}

try {
  configure("test_ck_contract", "test_sk_contract");
  const sandbox = getTossConfig();
  assert(sandbox.environment === "sandbox" && !sandbox.isProduction, "matching TEST pair must pass in non-production");

  configure("test_ck_contract", "test_gsk_contract");
  expectFailure("test_ck_ with test_gsk_ must fail");

  configure("test_gck_contract", "test_sk_contract");
  expectFailure("test_gck_ with test_sk_ must fail");

  configure("live_ck_contract", "test_sk_contract");
  expectFailure("live/test mixed pair must fail");

  configure("test_ck_contract", undefined);
  expectFailure("missing secret must fail");

  configure("test_ck_contract", "unknown_contract");
  expectFailure("unknown secret prefix must fail");

  configure("live_ck_contract", "live_sk_contract", true);
  const production = getTossConfig();
  assert(production.environment === "production" && production.isProduction, "matching LIVE pair must pass only in production");

  configure("test_ck_contract", "test_sk_contract", true);
  expectFailure("TEST pair must fail in production");

  console.log("toss credential contract regression passed");
} finally {
  env.NODE_ENV = original.node;
  env.TOSS_ENVIRONMENT = original.environment;
  env.TOSS_ALLOW_LIVE = original.allowLive;
  env.NEXT_PUBLIC_TOSS_CLIENT_KEY = original.client;
  env.TOSS_SECRET_KEY = original.secret;
}
