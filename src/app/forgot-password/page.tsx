import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ForgotForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your"
      serif="password."
      sub="Enter the email you signed up with and we'll send you a link to choose a new password."
      footer={
        <Link href="/login" className="font-medium text-accent hover:underline">
          ← Back to log in
        </Link>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
