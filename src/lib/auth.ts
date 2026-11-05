import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";

/**
 * Single-operator admin auth. You run the agency; clients get private share links.
 * Session = HMAC-signed expiry in an httpOnly cookie.
 */
const COOKIE = "surfaced_admin";
const DAYS = 14;

/** Null in production until SESSION_SECRET or ADMIN_PASSWORD is set: login stays disabled instead of crashing. */
function secret(): string | null {
  const s = env.sessionSecret ?? env.adminPassword;
  if (s) return s;
  return process.env.NODE_ENV === "production" ? null : "dev-only-secret";
}

/** In dev with no ADMIN_PASSWORD set, the password is "surfaced". Production requires one. */
export function adminPassword() {
  if (env.adminPassword) return env.adminPassword;
  return process.env.NODE_ENV === "production" ? null : "surfaced";
}

function sign(payload: string) {
  const s = secret();
  if (!s) throw new Error("Login is disabled: set SESSION_SECRET and ADMIN_PASSWORD");
  return createHmac("sha256", s).update(payload).digest("hex");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkPassword(input: string) {
  const pw = adminPassword();
  return !!pw && !!secret() && safeEqual(sign(input), sign(pw));
}

export async function startSession() {
  const exp = Date.now() + DAYS * 864e5;
  const value = `${exp}.${sign(`admin.${exp}`)}`;
  (await cookies()).set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DAYS * 86400,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v || !secret()) return false;
  const [exp, sig] = v.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(`admin.${exp}`));
}

/** Call at the top of every admin page and server action. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/login");
}
