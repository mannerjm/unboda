// No credentials or browser authentication state belong in this module.
// Privileged adapters are injected only by bPasswordResetServer (server-only).
export const STAGING_PROJECT_URL = "https://xdiitqyysmhicjcytckm.supabase.co";
export const STAGING_BRANCH = "test/staging-tenant-e2e";
export const RESET_ACTOR_ID = "ac175773-086a-4775-aa46-1b9d4d26c975";
export const RESET_TARGET_ID = "1ad71eac-5884-467e-b3c1-e6b40589d7a5";
export const RESET_TARGET_PROFILE_ID = "9608f380-55f4-47c9-b447-f4c07f44d0e4";
export const RESET_TARGET_EMAIL = "staging-test@unboda.local";
export const RESET_PAGE_PATH = "/admin/staging-b-reset";
export const RESET_API_PATH = "/api/internal/staging-b-reset";
const BRANCH_ORIGIN = "https://unboda-git-test-staging-tenant-e2e-unboda.vercel.app";
const MAX_GRANT_MS = 2 * 60 * 60 * 1000;
const RECENT_LOGIN_MS = 30 * 60 * 1000;
const MAX_BODY_BYTES = 2048;

export type ResetEnvironment = Readonly<Record<string, string | undefined>>;
export type ResetGrant = { actorId: string; startsAt: number; expiresAt: number; targetVersion: number };
export type ResetActor = {
  id: string;
  email: string;
  emailConfirmed: boolean;
  isAnonymous: boolean;
  lastSignInAt: string | null;
};
export type ResetTarget = {
  id: string;
  email: string;
  updatedAt: string;
  profileId: string;
  profileOwnerId: string;
};
export type ResetDependencies = {
  environment: () => ResetEnvironment;
  now: () => number;
  getActor: () => Promise<ResetActor | null>;
  getTarget: () => Promise<ResetTarget | null>;
  updatePassword: (userId: string, password: string) => Promise<boolean>;
  signOutOperator: () => Promise<boolean>;
};

export class ResetAccessError extends Error {
  readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export function getResetGrant(environment: ResetEnvironment, now: number): ResetGrant | null {
  if (environment.VERCEL_ENV !== "preview"
    || environment.VERCEL_GIT_COMMIT_REF !== STAGING_BRANCH
    || environment.VERCEL_PROJECT_ID !== "prj_Am1CWhJCIoWbGBTvzH1X9FMYWMlS"
    || environment.UNBODA_E2E_STAGING_ENABLED !== "true"
    || environment.NEXT_PUBLIC_SUPABASE_URL?.trim() !== STAGING_PROJECT_URL
    || !environment.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || environment.TOSS_LIVE_CHECKOUT_ENABLED === "true"
    || environment.TOSS_LIVE_PILOT_ENABLED === "true"
    || environment.TOSS_ALLOW_LIVE === "true"
    || environment.TOSS_ENVIRONMENT === "production") return null;

  try {
    const value = JSON.parse(environment.UNBODA_STAGING_B_RESET_GRANT ?? "null");
    if (!value || value.enabled !== true || value.actorId !== RESET_ACTOR_ID
      || value.targetId !== RESET_TARGET_ID
      || typeof value.startsAt !== "string" || typeof value.expiresAt !== "string"
      || typeof value.targetVersion !== "string") return null;
    const startsAt = Date.parse(value.startsAt);
    const expiresAt = Date.parse(value.expiresAt);
    const targetVersion = Date.parse(value.targetVersion);
    if (![startsAt, expiresAt, targetVersion, now].every(Number.isFinite)
      || expiresAt <= startsAt || expiresAt - startsAt > MAX_GRANT_MS
      || now < startsAt || now >= expiresAt || targetVersion > now) return null;
    return { actorId: RESET_ACTOR_ID, startsAt, expiresAt, targetVersion };
  } catch { return null; }
}

export function isResetOriginAllowed(request: Request, environment: ResetEnvironment): boolean {
  const origin = new URL(request.url).origin;
  if (origin === BRANCH_ORIGIN) return true;
  const host = environment.VERCEL_URL;
  return Boolean(host && /^unboda-[a-z0-9]+-unboda\.vercel\.app$/.test(host) && origin === `https://${host}`);
}

export function requireResetGrant(request: Request, dependencies: ResetDependencies): ResetGrant {
  const environment = dependencies.environment();
  const grant = getResetGrant(environment, dependencies.now());
  if (!grant || !isResetOriginAllowed(request, environment)) {
    throw new ResetAccessError(404, "찾을 수 없는 페이지입니다.");
  }
  return grant;
}

export async function requireResetActor(dependencies: ResetDependencies): Promise<void> {
  const actor = await dependencies.getActor();
  if (!actor) throw new ResetAccessError(401, "관리자 로그인이 필요합니다.");
  if (actor.id !== RESET_ACTOR_ID || actor.email.toLowerCase() !== "mannerjm@naver.com"
    || !actor.emailConfirmed || actor.isAnonymous) {
    throw new ResetAccessError(403, "이 재설정을 허용받은 관리자만 사용할 수 있습니다.");
  }
  const signInAt = actor.lastSignInAt ? Date.parse(actor.lastSignInAt) : NaN;
  const age = dependencies.now() - signInAt;
  if (!Number.isFinite(age) || age < -60_000 || age > RECENT_LOGIN_MS) {
    throw new ResetAccessError(401, "안전한 변경을 위해 관리자 계정으로 다시 로그인해 주세요.");
  }
}

export async function requireResetTarget(grant: ResetGrant, dependencies: ResetDependencies): Promise<void> {
  const target = await dependencies.getTarget();
  if (!target) throw new ResetAccessError(503, "B 계정을 확인하지 못했습니다. 비밀번호는 변경하지 않았습니다.");
  if (target.id !== RESET_TARGET_ID || target.email !== RESET_TARGET_EMAIL
    || target.profileId !== RESET_TARGET_PROFILE_ID || target.profileOwnerId !== RESET_TARGET_ID) {
    throw new ResetAccessError(409, "기존 B 계정과 프로필이 일치하지 않아 변경을 차단했습니다.");
  }
  if (Date.parse(target.updatedAt) !== grant.targetVersion) {
    throw new ResetAccessError(410, "B 계정이 이미 변경되어 이 재설정 화면은 종료되었습니다.");
  }
}

export function privateJson(value: object, status: number): Response {
  return new Response(JSON.stringify(value), {
    status, headers: { ...PRIVATE_HEADERS, "Content-Type": "application/json; charset=utf-8" },
  });
}

function failure(error: unknown): Response {
  if (error instanceof ResetAccessError) return privateJson({ error: error.message }, error.status);
  // Never serialize SDK errors: they can include request data or credentials.
  return privateJson({ error: "재설정을 완료하지 못했습니다. 관리자에게 상태 확인을 요청해 주세요." }, 503);
}

async function readPassword(request: Request): Promise<string> {
  if (!request.body) throw new ResetAccessError(400, "새 비밀번호와 확인 값을 입력해 주세요.");
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let body = "";
  let bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new ResetAccessError(413, "입력 길이를 확인해 주세요.");
      }
      body += decoder.decode(part.value, { stream: true });
    }
    body += decoder.decode();
    const value = JSON.parse(body);
    body = "";
    if (!value || typeof value !== "object" || Array.isArray(value)
      || Object.keys(value).length !== 2 || !Object.hasOwn(value, "password") || !Object.hasOwn(value, "confirmation")
      || typeof value.password !== "string" || typeof value.confirmation !== "string") {
      throw new ResetAccessError(400, "새 비밀번호와 확인 값만 입력해 주세요.");
    }
    if (value.password.length < 12 || new TextEncoder().encode(value.password).length > 72
      || value.password.includes("\u0000")) {
      throw new ResetAccessError(400, "비밀번호는 12자 이상으로 입력해 주세요. 너무 긴 값은 사용할 수 없습니다.");
    }
    if (value.password !== value.confirmation) throw new ResetAccessError(400, "두 비밀번호가 일치하지 않습니다.");
    return value.password;
  } catch (error) {
    if (error instanceof ResetAccessError) throw error;
    throw new ResetAccessError(400, "입력 내용을 확인해 주세요.");
  } finally { reader.releaseLock(); }
}

export async function handleResetPost(request: Request, dependencies: ResetDependencies): Promise<Response> {
  try {
    const grant = requireResetGrant(request, dependencies);
    if (request.method !== "POST") throw new ResetAccessError(405, "허용하지 않는 요청입니다.");
    if (request.headers.get("origin") !== new URL(request.url).origin
      || request.headers.get("sec-fetch-site") !== "same-origin"
      || request.headers.get("x-unboda-staging-b-reset") !== "1") {
      throw new ResetAccessError(403, "재설정 화면에서 다시 요청해 주세요.");
    }
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
      throw new ResetAccessError(415, "허용하지 않는 입력 형식입니다.");
    }
    const length = request.headers.get("content-length");
    if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) {
      throw new ResetAccessError(413, "입력 길이를 확인해 주세요.");
    }
    await requireResetActor(dependencies);
    let password = await readPassword(request);
    await requireResetTarget(grant, dependencies);
    // Recheck the expiry after upstream authentication and target checks.
    requireResetGrant(request, dependencies);
    let changed = false;
    try { changed = await dependencies.updatePassword(RESET_TARGET_ID, password); }
    finally { password = ""; }
    if (!changed) throw new ResetAccessError(503, "비밀번호 변경을 확인하지 못했습니다. 관리자에게 상태 확인을 요청해 주세요.");
    // Only the operator session on this host is signed out; other A sessions survive.
    let operatorSignedOut = false;
    try { operatorSignedOut = await dependencies.signOutOperator(); } catch { /* password change already succeeded */ }
    return privateJson({ changed: true, operatorSignedOut }, 200);
  } catch (error) { return failure(error); }
}
