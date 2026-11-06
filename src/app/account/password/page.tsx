import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { NewPasswordForm } from "@/components/auth-forms";
import { currentAccount } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function NewPasswordPage() {
  const me = await currentAccount();
  if (!me) redirect("/login?next=/account/password");
  return (
    <AuthShell
      title="Choose a new"
      serif="password."
      sub={<>For {me.email}. Use at least 8 characters.</>}
      footer={
        <Link href="/account" className="font-medium text-accent hover:underline">
          Back to your account
        </Link>
      }
    >
      <NewPasswordForm />
    </AuthShell>
  );
}
