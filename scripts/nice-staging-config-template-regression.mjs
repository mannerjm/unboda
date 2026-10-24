import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
test("separate service only binds local 8788 and separate secrets",()=>{
 const text=read("services/nice-gateway/deploy/unboda-nice-gateway-staging.service");
 assert.match(text,/EnvironmentFile=\/etc\/unboda-nice-gateway-staging\.env/);
 assert.match(text,/NICE_GATEWAY_HOST=127\.0\.0\.1/);
 assert.match(text,/NICE_GATEWAY_PORT=8788/);
 assert.doesNotMatch(text,/NICE_GATEWAY_PORT=8787/);
 assert.match(text,/NICE_PUBLIC_ORIGIN=https:\/\/unboda-git-test-staging-tenant-e2e-unboda\.vercel\.app/);
});
test("separate Caddy host does not replace production",()=>{
 const text=read("services/nice-gateway/deploy/Caddyfile.staging.snippet");
 assert.match(text,/nice-staging-gateway\.unboda\.kr/);
 assert.match(text,/reverse_proxy 127\.0\.0\.1:8788/);
 assert.doesNotMatch(text,/^nice-gateway\.unboda\.kr\s*\{/m);
});
test("explicit preflight requires unique staging secret and approved callback",()=>{
 const text=read("docs/nice-staging-identity-e2e-preparation-20261024.md");
 assert.match(text,/independent/);
 assert.match(text,/callback\/merchant approval/);
 assert.match(text,/Preview/);
 assert.match(text,/production DB remained unchanged/);
});
