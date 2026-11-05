import Link from "next/link";
import { db } from "@/lib/db";
import { categories, getCategory } from "@/lib/categories";
import { Card, Label, inputCls, EmptyState } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/action-ui";
import { createClient, loadDemoClient } from "../actions";

export default async function ClientsPage() {
  const clients = await db.clients.list();
  return (
    <div className="space-y-6">
      <div>
        <Label>Clients</Label>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Who you're working for</h1>
      </div>

      {clients.length === 0 ? (
        <EmptyState title="No clients yet">
          Convert a prospect from its page, or add a client below. Your first three should be free pilots in exchange for testimonials.
          <form action={loadDemoClient} className="mt-4">
            <SubmitButton variant="secondary" size="sm">Load a sample client with demo data</SubmitButton>
          </form>
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                {["Client", "Category", "Plan", "Monthly", "Fixes", "Status"].map((h) => <th key={h} className="label px-4 py-3 font-normal">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/app/clients/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                    <div className="text-xs text-muted">{c.suburb}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{getCategory(c.category).label}</td>
                  <td className="px-4 py-3 capitalize text-ink-2">{c.plan}</td>
                  <td className="tabular px-4 py-3">${Number(c.monthly_value).toLocaleString()}</td>
                  <td className="tabular px-4 py-3">{c.fixes.filter((f) => f.done).length}/{c.fixes.length}</td>
                  <td className="px-4 py-3"><span className="rounded-md bg-paper-2 px-2 py-0.5 text-xs capitalize">{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {clients.length > 0 && !clients.some((c) => c.name.includes("(demo data)")) && (
        <form action={loadDemoClient}>
          <SubmitButton variant="secondary" size="sm">Load sample client (demo data)</SubmitButton>
        </form>
      )}

      <Card className="p-5">
        <div className="font-medium">Add a client</div>
        <ActionForm action={createClient} className="mt-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <input name="name" required placeholder="Business name" className={inputCls} />
            <input name="website" required placeholder="Website" className={inputCls} />
            <input name="suburb" required placeholder="Suburb" className={inputCls} />
            <select name="category" className={inputCls}>{categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
            <select name="plan" className={inputCls} defaultValue="visibility">
              <option value="pilot">Free pilot</option>
              <option value="fixpack">Fix Pack</option>
              <option value="visibility">Visibility</option>
              <option value="growth">Growth</option>
            </select>
            <input name="contact_email" placeholder="Contact email" className={inputCls} />
          </div>
          <SubmitButton className="mt-3">Create client</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
