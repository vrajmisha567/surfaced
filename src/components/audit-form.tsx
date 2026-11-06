"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { runAuditAction, type AuditFormState } from "@/app/actions";
import { CategoryPicker, LocationFields } from "./business-fields";
import { Button, inputCls } from "./ui";

const steps = [
  "Loading your homepage",
  "Reading structured data",
  "Checking AI crawler access",
  "Checking where you rank on Google Maps",
  "Asking AI assistants the questions customers ask",
  "Comparing against local competitors",
  "Scoring visibility and site readiness",
];

function Progress() {
  const { pending } = useFormStatus();
  return pending ? <ProgressSteps /> : null;
}

/** Mounts fresh on each submit, so the step counter always starts at 0. */
function ProgressSteps() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, steps.length - 1)), 4500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="mt-4 rounded-lg border border-line bg-paper px-4 py-3" aria-live="polite">
      <ol className="space-y-1.5 text-[13px]">
        {steps.map((s, idx) => (
          <li key={s} className={idx < i ? "text-muted line-through decoration-line-2" : idx === i ? "text-ink" : "text-faint"}>
            <span className="label mr-2 inline-block w-5">{String(idx + 1).padStart(2, "0")}</span>
            {s}
            {idx === i && <span className="caret ml-1 text-accent" />}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted">Takes 20–60 seconds. Keep this tab open.</p>
    </div>
  );
}

function Submit({ compact }: { compact?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className={compact ? "fx-sheen" : "fx-sheen w-full sm:w-auto"}>
      {pending ? <Loader2 size={16} className="animate-spin" /> : null}
      {pending ? "Running audit" : "Run my free audit"}
      {!pending && <ArrowRight size={16} />}
    </Button>
  );
}

export function AuditForm({ defaultCategory = "plumber" }: { defaultCategory?: string }) {
  const [state, action] = useActionState<AuditFormState, FormData>(runAuditAction, {});
  const f = state.fields ?? {};
  return (
    <form action={action} className="space-y-3" id="audit">
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="businessName" required placeholder="Business name" defaultValue={f.businessName} className={inputCls} aria-label="Business name" />
        <input name="url" required placeholder="yourbusiness.com" defaultValue={f.url} className={inputCls} aria-label="Website" inputMode="url" />
        <CategoryPicker
          className="sm:col-span-2"
          defaultValue={f.category === "custom" && f.customType ? `custom:${f.customType}` : (f.category ?? defaultCategory)}
        />
        <LocationFields guessCountry defaults={{ suburb: f.suburb, city: f.city, country: f.country }} />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input name="email" type="email" placeholder="Email for a copy (optional)" defaultValue={f.email} className={inputCls} aria-label="Email" />
        <Submit />
      </div>
      {state.error && <p className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">{state.error}</p>}
      <Progress />
    </form>
  );
}
