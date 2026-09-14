import { createClient } from "@supabase/supabase-js";
import { assertSupabaseConfigured, getSupabaseUrl } from "./env";

let cachedClient = null;

export function getSupabaseServerClient() {
  assertSupabaseConfigured();
  if (cachedClient) return cachedClient;

  cachedClient = createClient(
    getSupabaseUrl(),
    process.env.SUBPAR_SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          "X-Subpar-Service": "subpar-os",
        },
      },
    }
  );

  return cachedClient;
}

export function getSupabasePublicConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_URL || process.env.SUBPAR_SUPABASE_URL || "",
    anonKeyConfigured: Boolean(process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_ANON_KEY),
  };
}
