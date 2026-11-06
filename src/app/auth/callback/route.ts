import { NextResponse, type NextRequest } from "next/server";
import { supabaseAuth } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

/**
 * Where Google sign-in, email confirmation and password-reset links land.
 * Swaps the one-time code for a session cookie, then sends the person on.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(reason)}`, url.origin));

  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (providerError) return fail(/expired|invalid/i.test(providerError) ? "link-expired" : "provider");

  const code = url.searchParams.get("code");
  if (!code) return fail("missing-code");

  const sb = await supabaseAuth();
  if (!sb) return fail("unavailable");
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) return fail(/expired|invalid|verifier/i.test(error.message) ? "link-expired" : "provider");

  return NextResponse.redirect(new URL(next, url.origin));
}
