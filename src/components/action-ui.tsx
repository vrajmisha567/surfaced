"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "./ui";

type Result = { ok: boolean; message: string };

/** Button that runs a server action and shows its result inline. */
export function ActionButton({
  action,
  children,
  variant = "secondary",
  size = "sm",
  pendingLabel,
}: {
  action: () => Promise<Result>;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "dark";
  size?: "sm" | "md";
  pendingLabel?: string;
}) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<Result | null>(null);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setRes(null);
            setRes(await action());
          })
        }
      >
        {pending && <Loader2 size={14} className="animate-spin" />}
        {pending ? pendingLabel ?? "Working" : children}
      </Button>
      {res && <span className={`text-xs ${res.ok ? "text-good" : "text-bad"}`}>{res.message}</span>}
    </span>
  );
}

export function SubmitButton({ children, variant = "primary", size = "md", className }: { children: React.ReactNode; variant?: "primary" | "secondary" | "dark"; size?: "sm" | "md"; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending} className={className}>
      {pending && <Loader2 size={14} className="animate-spin" />}
      {children}
    </Button>
  );
}

/** Form wired to a (prev, formData) => Result server action. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: Result | null, form: FormData) => Promise<Result>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      {state && <p className={`mt-3 text-sm ${state.ok ? "text-good" : "text-bad"}`}>{state.message}</p>}
    </form>
  );
}
