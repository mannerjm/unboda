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
  'source: "/api/:path*"',
  'key: "Cache-Control", value: "private, no-store, max-age=0"',
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

const authCaptcha = read("app/auth/AuthCaptcha.tsx");
const loginPage = read("app/auth/login/page.tsx");
const signupPage = read("app/auth/signup/page.tsx");
const signupRoute = read("app/api/auth/signup/route.ts");
const forgotPasswordPage = read("app/auth/forgot-password/page.tsx");

assert.ok(
  authCaptcha.includes("NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED")
    && authCaptcha.includes("NEXT_PUBLIC_TURNSTILE_SITE_KEY")
    && authCaptcha.includes("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit")
    && authCaptcha.includes("api.render("),
  "Auth CAPTCHA must remain feature-gated and use explicit Cloudflare Turnstile rendering",
);
for (const [label, source] of [
  ["login", loginPage],
  ["signup", signupPage],
  ["password recovery", forgotPasswordPage],
] as const) {
  assert.ok(
    source.includes("AUTH_CAPTCHA_ENABLED") && source.includes("captchaToken") && source.includes("AuthCaptcha"),
    `${label} must remain wired to the shared CAPTCHA boundary`,
  );
}
assert.ok(
  signupRoute.includes('process.env.NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED === "true"')
    && signupRoute.includes("captchaToken: captchaRequired"),
  "server signup boundary must forward CAPTCHA tokens to Supabase Auth when enforcement is enabled",
);

const gitignore = read(".gitignore");
assert.ok(gitignore.includes(".env*"), "environment files must stay ignored by default");
assert.ok(gitignore.includes("*.pem"), "private key material must stay ignored by default");

const forbiddenClientSecrets = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "TOSS_SECRET_KEY",
  "OPENAI_API_KEY",
  "PAYMENT_RECONCILIATION_SECRET",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "TURNSTILE_SECRET_KEY",
  "CLOUDFLARE_TURNSTILE_SECRET_KEY",
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
