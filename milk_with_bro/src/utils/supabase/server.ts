import { createServerClient, type CookieOptions } from "@supabase/ssr";

function getEnv(key: string): string | undefined {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[key];
}

const supabaseUrl =
  getEnv("NEXT_PUBLIC_SUPABASE_URL") ||
  getEnv("VITE_SUPABASE_URL") ||
  "https://dwovmrrvizhumnwthbcz.supabase.co";

const supabaseKey =
  getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
  getEnv("VITE_SUPABASE_ANON_KEY") ||
  "sb_publishable_AX8ZJ49rZjs4BcNcrcNtZA_1KN0-5FL";

export interface CookieStoreLike {
  getAll(): { name: string; value: string }[];
  set?(name: string, value: string, options?: CookieOptions): void;
}

export const createClient = (cookieStore?: CookieStoreLike) => {
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore?.getAll() ?? [];
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore?.set?.(name, value, options)
          );
        } catch {
          
        }
      },
    },
  });
};
