"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { sendReset, signIn, signInWithGoogle, signUp, updatePassword, type AuthState } from "@/app/auth/actions";
import { Button, inputCls } from "./ui";

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="fx-sheen w-full" disabled={pending}>
      {pending ? <Loader2 size={16} className="animate-spin" /> : null}
      {children}
      {!pending && <ArrowRight size={16} />}
    </Button>
  );
}

function ErrorNote({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2.5 text-sm text-bad">
      {text}
    </p>
  );
}

function Sent({ text }: { text: string }) {
  return (
    <div role="status" className="rounded-xl border border-accent/25 bg-accent-soft px-4 py-4 text-sm text-accent-ink">
      <div className="flex items-center gap-2 font-medium">
        <MailCheck size={17} /> Check your inbox
      </div>
      <p className="mt-1.5 leading-relaxed">{text}</p>
    </div>
  );
}

function FieldLabel({ htmlFor, children, aside }: { htmlFor: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center justify-between">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-2">
        {children}
      </label>
      {aside}
    </div>
  );
}

function PasswordInput({ id, name, autoComplete, placeholder }: { id: string; name: string; autoComplete: string; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} name={name} type={show ? "text" : "password"} required autoComplete={autoComplete} placeholder={placeholder} className={`${inputCls} h-11 pr-11`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-ink"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

/** The official multi-colour Google "G", as Google's brand guidelines require on sign-in buttons. */
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function GoogleSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-line-2 bg-card text-[15px] font-medium text-ink shadow-[0_1px_0_rgba(16,24,40,.04)] transition-colors hover:bg-paper-2 disabled:opacity-60"
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <GoogleG />}
      {label}
    </button>
  );
}

export function GoogleButton({ next, label = "Continue with Google" }: { next?: string; label?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signInWithGoogle, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="next" value={next ?? ""} />
      <GoogleSubmit label={label} />
      <ErrorNote text={state.error} />
    </form>
  );
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3">
      <span className="h-px flex-1 bg-line" />
      <span className="label">or with email</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signIn, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={state.email} placeholder="you@business.com" className={`${inputCls} h-11`} />
      </div>
      <div>
        <FieldLabel
          htmlFor="password"
          aside={
            <Link href="/forgot-password" className="text-[13px] text-accent hover:underline">
              Forgot password?
            </Link>
          }
        >
          Password
        </FieldLabel>
        <PasswordInput id="password" name="password" autoComplete="current-password" />
      </div>
      <ErrorNote text={state.error} />
      <Submit>Log in</Submit>
    </form>
  );
}

export function SignupForm({ next }: { next?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signUp, {});
  if (state.message) return <Sent text={state.message} />;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <FieldLabel htmlFor="name">Your name</FieldLabel>
        <input id="name" name="name" required autoComplete="name" placeholder="Alex Morgan" className={`${inputCls} h-11`} />
      </div>
      <div>
        <FieldLabel htmlFor="email">Work email</FieldLabel>
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={state.email} placeholder="you@business.com" className={`${inputCls} h-11`} />
      </div>
      <div>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <PasswordInput id="password" name="password" autoComplete="new-password" placeholder="At least 8 characters" />
      </div>
      <ErrorNote text={state.error} />
      <Submit>Create account</Submit>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState<AuthState, FormData>(sendReset, {});
  if (state.message) return <Sent text={state.message} />;
  return (
    <form action={action} className="space-y-4">
      <div>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={state.email} placeholder="you@business.com" className={`${inputCls} h-11`} />
      </div>
      <ErrorNote text={state.error} />
      <Submit>Send reset link</Submit>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState<AuthState, FormData>(updatePassword, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <FieldLabel htmlFor="password">New password</FieldLabel>
        <PasswordInput id="password" name="password" autoComplete="new-password" placeholder="At least 8 characters" />
      </div>
      <div>
        <FieldLabel htmlFor="confirm">Confirm new password</FieldLabel>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" />
      </div>
      <ErrorNote text={state.error} />
      <Submit>Save new password</Submit>
    </form>
  );
}
