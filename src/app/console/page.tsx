import { redirect } from "next/navigation";
import { checkPassword, isAdmin, startSession, adminPassword } from "@/lib/auth";
import { Button, Card, Field, Logo, inputCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Operator console", robots: { index: false } };

async function login(form: FormData) {
  "use server";
  const pw = String(form.get("password") ?? "");
  if (!checkPassword(pw)) redirect("/console?e=1");
  await startSession();
  redirect("/app");
}

export default async function ConsoleLoginPage({ searchParams }: PageProps<"/console">) {
  if (await isAdmin()) redirect("/app");
  const { e } = await searchParams;
  const devDefault = !process.env.ADMIN_PASSWORD && process.env.NODE_ENV !== "production";
  const disabled = !adminPassword();
  return (
    <main className="grid-paper flex min-h-screen items-center justify-center px-5">
      <Card className="w-full max-w-sm p-7">
        <Logo />
        <h1 className="mt-6 text-xl font-semibold tracking-tight">Operator console</h1>
        <p className="mt-1 text-sm text-muted">Prospects, clients, tracking and reports.</p>
        <form action={login} className="mt-6 space-y-4">
          <Field label="Password" hint={devDefault ? "Dev mode: the password is “surfaced”. Set ADMIN_PASSWORD before deploying." : undefined}>
            <input name="password" type="password" required autoFocus className={inputCls} disabled={disabled} />
          </Field>
          {e && <p className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">Wrong password.</p>}
          {disabled && <p className="rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">Set ADMIN_PASSWORD to enable login.</p>}
          <Button type="submit" className="w-full" disabled={disabled}>Log in</Button>
        </form>
      </Card>
    </main>
  );
}
