import {
  assertStagingSupabaseProject,
  extractSupabaseProjectRef,
} from "./lib/assertStagingSupabaseProject";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function withEnv(
  values: Record<string, string | undefined>,
  run: () => void,
): void {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    if (values[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = values[key];
    }
  }

  try {
    run();
  } finally {
    for (const key of Object.keys(previous)) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  }
}

assert(
  extractSupabaseProjectRef("https://abcxyz123.supabase.co") === "abcxyz123",
  "project ref must be extracted from a well-formed Supabase URL",
);

let threwOnBadUrl = false;
try {
  extractSupabaseProjectRef("https://example.com");
} catch {
  threwOnBadUrl = true;
}
assert(threwOnBadUrl, "malformed Supabase URL must throw instead of silently passing");
console.log("1. project ref extraction succeeds/fails as expected \u2713");

withEnv(
  { NEXT_PUBLIC_SUPABASE_URL: undefined, STAGING_SUPABASE_PROJECT_REF: "stagingref" },
  () => {
    let threw = false;
    try {
      assertStagingSupabaseProject();
    } catch {
      threw = true;
    }
    assert(threw, "missing NEXT_PUBLIC_SUPABASE_URL must fail closed");
  },
);
console.log("2. missing NEXT_PUBLIC_SUPABASE_URL fails closed \u2713");

withEnv(
  { NEXT_PUBLIC_SUPABASE_URL: "https://stagingref.supabase.co", STAGING_SUPABASE_PROJECT_REF: undefined },
  () => {
    let threw = false;
    try {
      assertStagingSupabaseProject();
    } catch {
      threw = true;
    }
    assert(threw, "missing STAGING_SUPABASE_PROJECT_REF must fail closed");
  },
);
console.log("3. missing STAGING_SUPABASE_PROJECT_REF fails closed \u2713");

withEnv(
  { NEXT_PUBLIC_SUPABASE_URL: "https://prodref.supabase.co", STAGING_SUPABASE_PROJECT_REF: "stagingref" },
  () => {
    let threw = false;
    try {
      assertStagingSupabaseProject();
    } catch {
      threw = true;
    }
    assert(threw, "mismatched project ref must fail closed");
  },
);
console.log("4. mismatched project ref fails closed \u2713");

withEnv(
  { NEXT_PUBLIC_SUPABASE_URL: "https://stagingref.supabase.co", STAGING_SUPABASE_PROJECT_REF: "stagingref" },
  () => {
    const ref = assertStagingSupabaseProject();
    assert(ref === "stagingref", "matching project ref must pass and return the ref");
  },
);
console.log("5. matching project ref passes \u2713");

console.log("staging-supabase-guard-regression passed");
