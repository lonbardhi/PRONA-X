import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "@/lib/env";

export function createClient() {
  const { url, anonKey } = getSupabaseEnv();

  return createBrowserClient(url, anonKey);
}

