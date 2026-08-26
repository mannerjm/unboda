export function assertDisposableSupabaseUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);

  if (url.protocol !== "http:") {
    throw new Error("Disposable Supabase target must use local HTTP.");
  }

  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error(
      `Unsafe Supabase target rejected: ${url.hostname}. Only localhost is allowed.`,
    );
  }

  return url;
}

export function assertDisposableSupabaseDatabaseUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);

  if (url.protocol !== "postgresql:") {
    throw new Error("Disposable Supabase database target must use PostgreSQL.");
  }

  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error(
      `Unsafe database target rejected: ${url.hostname}. Only localhost is allowed.`,
    );
  }

  return url;
}

export function assertR6DisposableSupabaseUrl(rawUrl: string): URL {
  const url = assertDisposableSupabaseUrl(rawUrl);
  if (url.origin !== "http://127.0.0.1:55321") {
    throw new Error("R6 disposable target must be http://127.0.0.1:55321.");
  }
  return url;
}