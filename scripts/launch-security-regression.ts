import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function parseVersion(value: string): [number, number, number] {
  const match = value.match(/(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, `expected an exact semver-like version, received ${value}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function atLeast(value: string, minimum: [number, number, number]): boolean {
  const current = parseVersion(value);
  for (let index = 0; index < 3; index += 1) {
    if (current[index] > minimum[index]) return true;
    if (current[index] < minimum[index]) return false;
  }
  return true;
}

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...walk(path));
    else if (/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry)) files.push(path);
  }
  return files;
}

const packageJson = JSON.parse(read("package.json")) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

assert.ok(
  atLeast(packageJson.dependencies.next, [16, 3, 4]),
  "Next.js must stay on the patched 16.3.4+ security line",
);
assert.equal(
  packageJson.devDependencies["eslint-config-next"],
  packageJson.dependencies.next,
  "eslint-config-next must track the installed Next.js version",
);

const nextConfig = read("next.config.ts");
for (const required of [
  "poweredByHeader: false",
  'key: "Strict-Transport-Security", value: "max-age=31536000"',
  'key: "X-Content-Type-Options", value: "nosniff"',
  'key: "X-Frame-Options", value: "DENY"',
  'key: "Referrer-Policy", value: "strict-origin-when-cross-origin"',
  'key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()"',
  'key: "X-DNS-Prefetch-Control", value: "off"',
  'source: "/:path*"',
]) {
  assert.ok(nextConfig.includes(required), `missing baseline browser hardening: ${required}`);
}

const mockConfirm = read("app/api/orders/[orderId]/mock-confirm/route.ts");
assert.ok(
  mockConfirm.includes('process.env.NODE_ENV === "production"') && mockConfirm.includes("status: 403"),
  "mock payment confirmation must remain fail-closed in Production",
);

const tossConfig = read("app/lib/toss/config.ts");
assert.ok(
  tossConfig.includes('clientKey.startsWith("live_ck_")')
    && tossConfig.includes('secretKey.startsWith("live_sk_")')
    && tossConfig.includes("if (!isLivePair)"),
  "Production Toss must require a matching live client/secret pair",
);

const gitignore = read(".gitignore");
assert.ok(gitignore.includes(".env*"), "environment files must stay ignored by default");
assert.ok(gitignore.includes("*.pem"), "private key material must stay ignored by default");

const forbiddenClientSecrets = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "TOSS_SECRET_KEY",
  "OPENAI_API_KEY",
  "PAYMENT_RECONCILIATION_SECRET",
];

for (const path of walk(join(process.cwd(), "app"))) {
  const source = readFileSync(path, "utf8");
  const isClient = /^\s*["']use client["'];/m.test(source);
  if (!isClient) continue;
  for (const secretName of forbiddenClientSecrets) {
    assert.ok(
      !source.includes(secretName),
      `${secretName} must never be referenced from a client component: ${path}`,
    );
  }
}

console.log("launch security regression guard passed");
