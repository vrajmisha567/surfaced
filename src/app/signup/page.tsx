import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { GoogleButton, OrDivider, SignupForm } from "@/components/auth-forms";
import { safeNext } from "@/lib/safe-next";
import { currentAccount } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await currentAccount()) redirect(next);
  const nextQ = sp.next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <AuthShell
      title="Create your"
      serif="account."
      sub="Free. Keep every audit in one place and watch your AI visibility change."
      footer={
        <>
          Already have an account?{" "}
          <Link href={`/login${nextQ}`} className="font-medium text-accent hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <GoogleButton next={next} label="Sign up with Google" />
      <OrDivider />
      <SignupForm next={next} />
      <p className="mt-4 text-center text-xs leading-relaxed text-muted">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
          privacy policy
        </Link>
        .
      </p>
    </AuthShell>
  );
}
