// Fail-closed guard for staging-only diagnostic/integration scripts.
// Must be imported/called before any Supabase admin client is constructed.
// Never used from production/runtime code (app/lib/supabase/admin.ts, API routes, etc.).

const SUPABASE_URL_PATTERN = /^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/i;

export function extractSupabaseProjectRef(url: string): string {
  const match = url.trim().match(SUPABASE_URL_PATTERN);

  if (!match) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL에서 Supabase project ref를 추출하지 못했습니다: ${url}`,
    );
  }

  return match[1];
}

export function assertStagingSupabaseProject(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const expectedRef = process.env.STAGING_SUPABASE_PROJECT_REF;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL 환경 변수가 설정되어 있지 않습니다.");
  }

  if (!expectedRef) {
    throw new Error(
      "STAGING_SUPABASE_PROJECT_REF 환경 변수가 설정되어 있지 않습니다. staging 전용 스크립트는 이 값 없이 실행할 수 없습니다.",
    );
  }

  const actualRef = extractSupabaseProjectRef(url);

  if (actualRef !== expectedRef) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL의 project ref가 STAGING_SUPABASE_PROJECT_REF와 일치하지 않습니다. production 오접속을 막기 위해 중단합니다.",
    );
  }

  console.info("[assertStagingSupabaseProject] verified staging project ref", {
    projectRef: actualRef,
  });

  return actualRef;
}
