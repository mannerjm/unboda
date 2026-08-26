import { assertR6DisposableSupabaseUrl } from "./lib/disposable-supabase-target";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

assert(assertR6DisposableSupabaseUrl("http://127.0.0.1:55321").origin === "http://127.0.0.1:55321", "disposable target must pass");
for (const target of ["http://127.0.0.1:54321", "https://xdiitqyysmhicjcytckm.supabase.co", "http://localhost:55321"]) {
  let rejected = false;
  try { assertR6DisposableSupabaseUrl(target); } catch { rejected = true; }
  assert(rejected, `unsafe target must be rejected: ${target}`);
}
console.log("R6A disposable target guard regression passed");