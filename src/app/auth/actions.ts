"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { safeNext } from "@/lib/safe-next";
import { site } from "@/lib/site";
import { supabaseAuth } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string; email?: string };

async function origin() {
  const h = await headers();
  const o = h.get("origin");
  if (o && /^https?:\/\/[^/]+$/.test(o)) return o;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  return site.url;
}

/** Which sign-in methods the Supabase project has switched on. Cached briefly. */
let settingsCache: { at: number; google: boolean; autoconfirm: boolean } | null = null;
async function authSettings() {
  if (settingsCache && Date.now() - settingsCache.at < 60_000) return settingsCache;
  try {
    const r = await fetch(`${env.supabaseUrl}/auth/v1/settings`, { headers: { apikey: env.supabasePublishableKey ?? "" }, cache: "no-store" });
    const j = (await r.json()) as { external?: Record<string, boolean>; mailer_autoconfirm?: boolean };
    settingsCache = { at: Date.now(), google: !!j.external?.google, autoconfirm: !!j.mailer_autoconfirm };
  } catch {
    settingsCache = { at: Date.now(), google: false, autoconfirm: false };
  }
  return settingsCache;
}

/** Supabase's error messages, reworded for people. */
function friendly(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Try again or reset your password.";
  if (m.includes("email not confirmed")) return "Confirm your email first: check your inbox for the link we sent.";
  if (m.includes("already registered") || m.includes("already been registered")) return "There's already an account with that email. Log in instead.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Wait a minute and try again.";
  if (m.includes("password") && m.includes("characters")) return "Use at least 8 characters for your password.";
  if (m.includes("weak") || m.includes("pwned")) return "That password is too easy to guess. Try a longer one.";
  if (m.includes("signups not allowed")) return "New sign-ups are closed right now.";
  if (m.includes("error sending") || m.includes("smtp")) return "We couldn't send the email just now. Try again shortly, or continue with Google.";
  return "Something went wrong. Try again in a moment.";
}

const unavailable: AuthState = { error: "Accounts aren't switched on yet. Try again soon." };

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.");
const passwordSchema = z.string().min(8, "Use at least 8 characters for your password.").max(72, "Use 72 characters or fewer.");

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  const parsed = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.") }).safeParse({ email, password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };
  const sb = await supabaseAuth();
  if (!sb) return { ...unavailable, email };
  const { error } = await sb.auth.signInWithPassword(parsed.data);
  if (error) return { error: friendly(error.message), email };
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  const parsed = z
    .object({ name: z.string().trim().min(1, "Enter your name.").max(80), email: emailSchema, password: passwordSchema })
    .safeParse({ name: form.get("name"), email, password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };
  const sb = await supabaseAuth();
  if (!sb) return { ...unavailable, email };
  const next = safeNext(form.get("next"));
  const { data, error } = await sb.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.name }, emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: friendly(error.message), email };
  // Supabase returns a user with no identities when the email is already registered.
  if (data.user && data.user.identities?.length === 0) return { error: friendly("already registered"), email };
  if (data.session) redirect(next);
  return { message: `We've sent a confirmation link to ${parsed.data.email}. Click it to finish creating your account.`, email };
}

export async function signInWithGoogle(_: AuthState, form: FormData): Promise<AuthState> {
  const sb = await supabaseAuth();
  if (!sb) return unavailable;
  if (!(await authSettings()).google) return { error: "Google sign-in isn't set up yet. Use your email for now." };
  const next = safeNext(form.get("next"));
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`, queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) return { error: friendly(error?.message ?? "") };
  redirect(data.url);
}

export async function sendReset(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };
  const sb = await supabaseAuth();
  if (!sb) return { ...unavailable, email };
  const { error } = await sb.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${await origin()}/auth/callback?next=/account/password` });
  // Same message whether or not the account exists, so the form can't be used to probe emails.
  if (error && !/not found|no user/i.test(error.message)) return { error: friendly(error.message), email };
  return { message: `If there's an account for ${parsed.data}, a reset link is on its way. It works once and expires in an hour.`, email };
}

export async function updatePassword(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z
    .object({ password: passwordSchema, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "The two passwords don't match." })
    .safeParse({ password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const sb = await supabaseAuth();
  if (!sb) return unavailable;
  const { error } = await sb.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: /session/i.test(error.message) ? "Your reset link has expired. Request a new one." : friendly(error.message) };
  redirect("/account?updated=password");
}

export async function signOut() {
  const sb = await supabaseAuth();
  await sb?.auth.signOut();
  redirect("/login?signedout=1");
}
