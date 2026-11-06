import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/** True when customer accounts can work (Supabase URL + publishable key set). */
export const accountsEnabled = () => !!(env.supabaseUrl && env.supabasePublishableKey);

/**
 * Supabase client acting as the signed-in customer, with the session in cookies.
 * Use in Server Components, Server Actions and Route Handlers. Null when accounts aren't configured.
 */
export async function supabaseAuth() {
  if (!accountsEnabled()) return null;
  const store = await cookies();
  return createServerClient(env.supabaseUrl!, env.supabasePublishableKey!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components can't set cookies; the proxy refreshes sessions instead.
        }
      },
    },
  });
}

export type Account = { id: string; email: string; name: string | null; avatar: string | null; provider: string | null };

/** The signed-in customer, verified with Supabase, or null. */
export async function currentAccount(): Promise<Account | null> {
  const sb = await supabaseAuth();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  const u = data.user;
  if (!u?.email) return null;
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    id: u.id,
    email: u.email,
    name: str(meta.full_name) ?? str(meta.name),
    avatar: str(meta.avatar_url) ?? str(meta.picture),
    provider: str(u.app_metadata?.provider),
  };
}
