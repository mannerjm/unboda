import { createBrowserClient } from "@supabase/ssr";

// singleton via createBrowserClient's internal pattern
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
