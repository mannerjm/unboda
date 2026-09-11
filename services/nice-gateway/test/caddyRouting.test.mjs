import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const caddyfile = readFileSync(new URL("../deploy/Caddyfile.snippet", import.meta.url), "utf8");

test("Caddy routes NICE API before fallback 404", () => {
  assert.match(caddyfile, /handle \/v1\/nice\/\* \{[\s\S]*reverse_proxy 127\.0\.0\.1:8787[\s\S]*\}/);
  assert.match(caddyfile, /handle \{\s*respond "Not Found" 404\s*\}/);
  assert.ok(!caddyfile.includes('@niceApi path /v1/nice/*'), "legacy matcher form can be shadowed by fallback respond ordering");
});
