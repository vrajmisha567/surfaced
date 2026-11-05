import Link from "next/link";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { categories, getCategory, suburbs } from "@/lib/categories";
import { prospectStatuses } from "@/lib/types";
import { Card, Label, inputCls, EmptyState } from "@/components/ui";
import { ActionButton, ActionForm, SubmitButton } from "@/components/action-ui";
import { addProspect, auditBatch, findProspects } from "../actions";

export default async function ProspectsPage({ searchParams }: PageProps<"/app/prospects">) {
  const { status, category } = await searchParams;
  const all = await db.prospects.list();
  const rows = all.filter((p) => (!status || p.status === status) && (!category || p.category === category));
  const unaudited = all.filter((p) => !p.audit_id && p.website).length;
  const usedCats = [...new Set(all.map((p) => p.category))];

  return (
    <div className="space-y-6">
      <div>
        <Label>Prospects</Label>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Find, audit, pitch</h1>
        <p className="mt-1 text-sm text-muted">Pull local businesses from Google, audit them in bulk, then send each one its own report.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="font-medium">Find businesses on Google</div>
          <p className="mt-1 text-xs text-muted">{env.googlePlaces ? "Google Places search, up to 20 per query." : "Add GOOGLE_PLACES_API_KEY to enable. Until then, add prospects by hand."}</p>
          <ActionForm action={findProspects} className="mt-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <select name="category" className={inputCls}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.plural}</option>)}
              </select>
              <input name="suburb" list="sub" placeholder="Suburb" className={inputCls} />
              <datalist id="sub">{suburbs.map((s) => <option key={s} value={s} />)}</datalist>
              <SubmitButton>Search</SubmitButton>
            </div>
          </ActionForm>
        </Card>
        <Card className="p-5">
          <div className="font-medium">Add one by hand</div>
          <ActionForm action={addProspect} className="mt-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="name" required placeholder="Business name" className={inputCls} />
              <input name="website" placeholder="Website" className={inputCls} />
              <input name="email" placeholder="Email" className={inputCls} />
              <input name="suburb" placeholder="Suburb" className={inputCls} />
              <select name="category" className={inputCls}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <SubmitButton variant="secondary">Add prospect</SubmitButton>
            </div>
          </ActionForm>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 text-sm">
          <FilterLink href="/app/prospects" active={!status && !category}>All {all.length}</FilterLink>
          {prospectStatuses.map((s) => {
            const n = all.filter((p) => p.status === s).length;
            return n ? <FilterLink key={s} href={`/app/prospects?status=${s}`} active={status === s}>{s} {n}</FilterLink> : null;
          })}
          {usedCats.length > 1 && usedCats.map((c) => (
            <FilterLink key={c} href={`/app/prospects?category=${c}`} active={category === c}>{getCategory(c).plural}</FilterLink>
          ))}
        </div>
        {unaudited > 0 && <ActionButton action={auditBatch} variant="dark" pendingLabel="Auditing (up to 8)…">Audit {Math.min(8, unaudited)} un-audited</ActionButton>}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No prospects yet">Search Google above or add a business by hand. Pick one niche and one area to start, e.g. plumbers in Norwood.</EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                {["Business", "Category", "Suburb", "Google", "Score", "Status"].map((h) => (
                  <th key={h} className="label px-4 py-3 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/app/prospects/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                    <div className="max-w-[260px] truncate text-xs text-muted">{p.website ?? "no website"}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{getCategory(p.category).label}</td>
                  <td className="px-4 py-3 text-ink-2">{p.suburb ?? "—"}</td>
                  <td className="tabular px-4 py-3 text-ink-2">{p.rating ? `${p.rating}★ (${p.review_count})` : "—"}</td>
                  <td className="tabular px-4 py-3 font-medium">{p.score ?? "—"}</td>
                  <td className="px-4 py-3"><span className="rounded-md bg-paper-2 px-2 py-0.5 text-xs capitalize">{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`rounded-md px-2.5 py-1 capitalize ${active ? "bg-ink text-white" : "bg-card text-ink-2 border border-line hover:bg-paper-2"}`}>
      {children}
    </Link>
  );
}
