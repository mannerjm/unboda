import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { registerHooks } from 'node:module';
import {
  RESET_ACTOR_ID, RESET_TARGET_ID, RESET_TARGET_PROFILE_ID, RESET_TARGET_EMAIL,
  STAGING_PROJECT_URL, STAGING_BRANCH, RESET_API_PATH,
  getResetGrant, handleResetPost, requireResetTarget,
} from '../app/lib/staging/bPasswordReset.ts';

// Match the repository's extensionless TS imports under Node 24's native TS runner.
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (specifier.startsWith('./') && context.parentURL?.includes('/app/lib/staging/') && !specifier.endsWith('.ts')) {
      return nextResolve(specifier + '.ts', context);
    }
    throw error;
  }
} });
const { resetPage } = await import('../app/lib/staging/bPasswordResetHtml.ts');

const ORIGIN = 'https://unboda-git-test-staging-tenant-e2e-unboda.vercel.app';
const NOW = Date.parse('2026-10-19T11:00:00Z');
const TARGET_VERSION = '2026-08-21T11:33:37.546Z';
// Synthetic fixture only. No real credential is read, printed, or used in these tests.
const fixturePassword = () => randomBytes(18).toString('base64url');

function fixture() {
  const grant = {
    enabled: true, actorId: RESET_ACTOR_ID, targetId: RESET_TARGET_ID,
    startsAt: new Date(NOW - 60_000).toISOString(),
    expiresAt: new Date(NOW + 60 * 60_000).toISOString(), targetVersion: TARGET_VERSION,
  };
  const state = {
    now: NOW,
    env: {
      VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: STAGING_BRANCH,
      VERCEL_PROJECT_ID: 'prj_Am1CWhJCIoWbGBTvzH1X9FMYWMlS',
      VERCEL_URL: 'unboda-fixture-unboda.vercel.app',
      UNBODA_E2E_STAGING_ENABLED: 'true', NEXT_PUBLIC_SUPABASE_URL: STAGING_PROJECT_URL,
      SUPABASE_SERVICE_ROLE_KEY: 'synthetic-presence-marker',
      UNBODA_STAGING_B_RESET_GRANT: JSON.stringify(grant),
    },
    actor: { id: RESET_ACTOR_ID, email: 'mannerjm@naver.com', emailConfirmed: true, isAnonymous: false,
      lastSignInAt: new Date(NOW - 60_000).toISOString() },
    target: { id: RESET_TARGET_ID, email: RESET_TARGET_EMAIL, updatedAt: TARGET_VERSION,
      profileId: RESET_TARGET_PROFILE_ID, profileOwnerId: RESET_TARGET_ID },
    actorReads: 0, targetReads: 0, writes: [], signouts: 0,
  };
  const dependencies = {
    environment: () => state.env, now: () => state.now,
    async getActor() { state.actorReads++; return state.actor; },
    async getTarget() { state.targetReads++; return state.target; },
    async updatePassword(userId, password) {
      state.writes.push({ userId, password });
      state.target.updatedAt = new Date(state.now).toISOString();
      return true;
    },
    async signOutOperator() { state.signouts++; return true; },
  };
  return { state, dependencies, grant };
}

function request({ body, headers = {}, origin = ORIGIN, method = 'POST' } = {}) {
  const password = fixturePassword();
  return new Request(origin + RESET_API_PATH, {
    method,
    headers: { Origin: origin, 'Sec-Fetch-Site': 'same-origin', 'X-Unboda-Staging-B-Reset': '1',
      'Content-Type': 'application/json', ...headers },
    ...(method === 'POST' ? { body: body ?? JSON.stringify({ password, confirmation: password }) } : {}),
  });
}

for (const [label, key, value] of [
  ['production', 'VERCEL_ENV', 'production'],
  ['another branch', 'VERCEL_GIT_COMMIT_REF', 'main'],
  ['another Vercel project', 'VERCEL_PROJECT_ID', 'another-project'],
  ['production Supabase', 'NEXT_PUBLIC_SUPABASE_URL', 'https://eiyvdmorqclirvidihlm.supabase.co'],
  ['missing server credential', 'SUPABASE_SERVICE_ROLE_KEY', undefined],
  ['disabled staging', 'UNBODA_E2E_STAGING_ENABLED', 'false'],
  ['live checkout', 'TOSS_LIVE_CHECKOUT_ENABLED', 'true'],
  ['live pilot', 'TOSS_LIVE_PILOT_ENABLED', 'true'],
  ['live payments', 'TOSS_ALLOW_LIVE', 'true'],
  ['production payments', 'TOSS_ENVIRONMENT', 'production'],
  ['absent reset grant', 'UNBODA_STAGING_B_RESET_GRANT', undefined],
  ['malformed grant', 'UNBODA_STAGING_B_RESET_GRANT', '{'],
]) {
  test(`fails closed before authentication or mutation: ${label}`, async () => {
    const { state, dependencies } = fixture(); state.env[key] = value;
    const response = await handleResetPost(request(), dependencies);
    assert.equal(response.status, 404); assert.equal(state.actorReads, 0); assert.equal(state.targetReads, 0);
    assert.equal(state.writes.length, 0); assert.match(response.headers.get('cache-control'), /no-store/);
  });
}

for (const [label, change] of [
  ['expired grant', g => { g.expiresAt = new Date(NOW).toISOString(); }],
  ['future grant', g => { g.startsAt = new Date(NOW + 60_000).toISOString(); }],
  ['overlong grant', g => { g.expiresAt = new Date(NOW + 3 * 60 * 60_000).toISOString(); }],
  ['other actor grant', g => { g.actorId = RESET_TARGET_ID; }],
  ['other target grant', g => { g.targetId = RESET_ACTOR_ID; }],
]) {
  test(`rejects invalid scope: ${label}`, async () => {
    const { state, dependencies, grant } = fixture(); change(grant);
    state.env.UNBODA_STAGING_B_RESET_GRANT = JSON.stringify(grant);
    const response = await handleResetPost(request(), dependencies);
    assert.equal(response.status, 404); assert.equal(state.writes.length, 0);
  });
}

test('rejects an operating domain even if the environment is misconfigured to allow staging', async () => {
  const { state, dependencies } = fixture();
  assert.equal((await handleResetPost(request({ origin: 'https://unboda.kr' }), dependencies)).status, 404);
  assert.equal(state.actorReads, 0); assert.equal(state.writes.length, 0);
});

for (const [label, headers, status] of [
  ['foreign origin', { Origin: 'https://attacker.example' }, 403],
  ['missing origin', { Origin: '' }, 403],
  ['cross-site metadata', { 'Sec-Fetch-Site': 'cross-site' }, 403],
  ['missing custom header', { 'X-Unboda-Staging-B-Reset': '' }, 403],
  ['form submission', { 'Content-Type': 'application/x-www-form-urlencoded' }, 415],
  ['oversized declared body', { 'Content-Length': '5000' }, 413],
]) {
  test(`rejects request before credentials are parsed: ${label}`, async () => {
    const { state, dependencies } = fixture();
    assert.equal((await handleResetPost(request({ headers }), dependencies)).status, status);
    assert.equal(state.actorReads, 0); assert.equal(state.writes.length, 0);
  });
}

test('never mutates through a GET request', async () => {
  const { state, dependencies } = fixture();
  assert.equal((await handleResetPost(request({ method: 'GET' }), dependencies)).status, 405);
  assert.equal(state.writes.length, 0);
});

for (const [label, mutate, status] of [
  ['anonymous request', s => { s.actor = null; }, 401],
  ['account B session', s => { s.actor.id = RESET_TARGET_ID; }, 403],
  ['wrong account email', s => { s.actor.email = RESET_TARGET_EMAIL; }, 403],
  ['unconfirmed account', s => { s.actor.emailConfirmed = false; }, 403],
  ['anonymous Supabase identity', s => { s.actor.isAnonymous = true; }, 403],
  ['old operator sign-in', s => { s.actor.lastSignInAt = new Date(NOW - 31 * 60_000).toISOString(); }, 401],
]) {
  test(`requires the recent, verified, explicitly authorized operator: ${label}`, async () => {
    const { state, dependencies } = fixture(); mutate(state);
    assert.equal((await handleResetPost(request(), dependencies)).status, status);
    assert.equal(state.targetReads, 0); assert.equal(state.writes.length, 0);
  });
}

for (const [label, body, status] of [
  ['malformed JSON', '{', 400],
  ['wrong value types', JSON.stringify({ password: 123, confirmation: 123 }), 400],
  ['short input', JSON.stringify({ password: 'fixture', confirmation: 'fixture' }), 400],
  ['mismatched confirmation', JSON.stringify({ password: 'synthetic-fixture-1', confirmation: 'synthetic-fixture-2' }), 400],
  ['long multibyte input', JSON.stringify({ password: '가'.repeat(25), confirmation: '가'.repeat(25) }), 400],
  ['null byte', JSON.stringify({ password: 'synthetic\0fixture', confirmation: 'synthetic\0fixture' }), 400],
  ['caller-provided target', JSON.stringify({ password: 'synthetic-fixture', confirmation: 'synthetic-fixture', userId: RESET_ACTOR_ID }), 400],
  ['oversized streamed body', 'x'.repeat(3000), 413],
]) {
  test(`validates input without any privileged mutation: ${label}`, async () => {
    const { state, dependencies } = fixture();
    assert.equal((await handleResetPost(request({ body }), dependencies)).status, status);
    assert.equal(state.targetReads, 0); assert.equal(state.writes.length, 0);
  });
}

for (const [label, mutate, status] of [
  ['missing B', s => { s.target = null; }, 503],
  ['different user ID', s => { s.target.id = RESET_ACTOR_ID; }, 409],
  ['different email', s => { s.target.email = 'other@example.invalid'; }, 409],
  ['different profile', s => { s.target.profileId = RESET_ACTOR_ID; }, 409],
  ['different profile owner', s => { s.target.profileOwnerId = RESET_ACTOR_ID; }, 409],
  ['already modified B', s => { s.target.updatedAt = new Date(NOW).toISOString(); }, 410],
]) {
  test(`preserves the original B identity and profile: ${label}`, async () => {
    const { state, dependencies } = fixture(); mutate(state);
    assert.equal((await handleResetPost(request(), dependencies)).status, status);
    assert.equal(state.writes.length, 0); assert.equal(state.signouts, 0);
  });
}

test('expiry during upstream checks prevents the update', async () => {
  const { state, dependencies, grant } = fixture();
  dependencies.getTarget = async () => { state.now = Date.parse(grant.expiresAt); return state.target; };
  assert.equal((await handleResetPost(request(), dependencies)).status, 404);
  assert.equal(state.writes.length, 0);
});

test('valid submission updates only fixed B, returns no credential, then signs out only the current operator session', async () => {
  const { state, dependencies } = fixture(); const password = fixturePassword();
  const response = await handleResetPost(request({ body: JSON.stringify({ password, confirmation: password }) }), dependencies);
  assert.equal(response.status, 200); assert.equal(state.writes.length, 1);
  assert.equal(state.writes[0].userId, RESET_TARGET_ID); assert.equal(state.writes[0].password, password);
  const result = await response.text(); assert.equal(result.includes(password), false);
  assert.deepEqual(JSON.parse(result), { changed: true, operatorSignedOut: true }); assert.equal(state.signouts, 1);
  const grant = getResetGrant(state.env, state.now);
  await assert.rejects(() => requireResetTarget(grant, dependencies), error => error.status === 410);
});

test('SDK failure never leaks upstream data or signs the operator out', async () => {
  const { state, dependencies } = fixture(); const marker = fixturePassword();
  dependencies.updatePassword = async () => { throw new Error(marker); };
  const response = await handleResetPost(request(), dependencies);
  assert.equal(response.status, 503); assert.equal((await response.text()).includes(marker), false);
  assert.equal(state.signouts, 0);
});

test('a successful password update remains reported as success if local operator sign-out fails', async () => {
  const { dependencies } = fixture(); dependencies.signOutOperator = async () => { throw new Error('synthetic failure'); };
  const response = await handleResetPost(request(), dependencies);
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { changed: true, operatorSignedOut: false });
});

test('the standalone input document has masked new-password fields, no analytics, no storage, and a strict nonce CSP', async () => {
  const { grant: raw } = fixture();
  const response = resetPage({ actorId: RESET_ACTOR_ID, startsAt: Date.parse(raw.startsAt), expiresAt: Date.parse(raw.expiresAt), targetVersion: Date.parse(raw.targetVersion) }, 'synthetic-nonce');
  const html = await response.text();
  assert.match(response.headers.get('cache-control'), /private, no-store/);
  assert.match(response.headers.get('content-security-policy'), /default-src 'none'/);
  assert.match(response.headers.get('content-security-policy'), /form-action 'none'/);
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal((html.match(/type="password" autocomplete="new-password"/g) ?? []).length, 2);
  assert.equal(/localStorage|sessionStorage|console\.|analytics|serviceWorker|<script src=/.test(html), false);
  const script = html.match(/<script nonce="synthetic-nonce">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script); assert.doesNotThrow(() => new Function(script));
});
