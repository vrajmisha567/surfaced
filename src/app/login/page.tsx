import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { GoogleButton, LoginForm, OrDivider } from "@/components/auth-forms";
import { safeNext } from "@/lib/safe-next";
import { currentAccount } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Log in", robots: { index: false } };

const errors: Record<string, string> = {
  "link-expired": "That link has expired or was already used. Log in, or request a new one.",
  provider: "Google sign-in didn't complete. Try again.",
  "missing-code": "That sign-in link was incomplete. Try again.",
  unavailable: "Accounts aren't switched on yet. Try again soon.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await currentAccount()) redirect(next);
  const error = typeof sp.error === "string" ? (errors[sp.error] ?? errors.provider) : null;
  const nextQ = sp.next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <AuthShell
      title="Welcome"
      serif="back."
      sub="Log in to see your audits, reports and progress."
      footer={
        <>
          New to Surfaced?{" "}
          <Link href={`/signup${nextQ}`} className="font-medium text-accent hover:underline">
            Create a free account
          </Link>
        </>
      }
    >
      {sp.signedout && <p className="mb-5 rounded-lg bg-paper-2 px-3 py-2.5 text-sm text-ink-2">You&apos;re signed out.</p>}
      {error && <p className="mb-5 rounded-lg bg-bad-soft px-3 py-2.5 text-sm text-bad">{error}</p>}
      <GoogleButton next={next} />
      <OrDivider />
      <LoginForm next={next} />
    </AuthShell>
  );
}
