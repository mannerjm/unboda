import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const route=await readFile(new URL("../../app/api/internal/social/buffer-preview-status/route.ts",import.meta.url),"utf8");
test("server-only Buffer status GET must fail closed on production and unrelated previews",()=>{
 assert.match(route,/process\.env\.VERCEL_ENV\s*!==\s*"preview"/);
 assert.match(route,/process\.env\.VERCEL_GIT_COMMIT_REF\s*!==\s*AUDITED_BRANCH/);
 assert.match(route,/NOT_AVAILABLE_OUTSIDE_ISOLATED_PREVIEW/);
 assert.match(route,/BUFFER_KEY_MISSING_IN_PREVIEW_RUNTIME/);
});
test("status route uses read-only GraphQL operation and does not mutate social platforms",()=>{
 assert.match(route,/query GetOrganizations/);
 assert.match(route,/query GetChannels/);
 assert.doesNotMatch(route,/\bmutation\s+CreatePost\b|\bcreatePost\s*\(/);
 assert.doesNotMatch(route,/await\s+.*(?:insert|update|delete)\s*\(/);
 assert.match(route,/postsCreated:\s*0/);
 assert.match(route,/autopublishingActivated:\s*false/);
});
test("status route does not return or log API secret",()=>{
 assert.match(route,/process\.env\.BUFFER_API_KEY/);
 assert.doesNotMatch(route,/console\./);
 assert.doesNotMatch(route,/apiKey:\s*token/);
 assert.match(route,/apiKeyPresent:\s*true/);
 assert.match(route,/Cache-Control/);
});

test("middleware keeps all production and non-diagnostic requests on Supabase authentication flow",async()=>{
 const middleware=await readFile(new URL("../../middleware.ts",import.meta.url),"utf8");
 assert.match(middleware,/process\.env\.VERCEL_ENV\s*===\s*"preview"/);
 assert.match(middleware,/request\.nextUrl\.pathname\s*===\s*"\/api\/internal\/social\/buffer-preview-status"/);
 assert.match(middleware,/await supabase\.auth\.getClaims\(\)/);
 assert.doesNotMatch(middleware,/VERCEL_ENV\s*!==\s*"production"/);
});
