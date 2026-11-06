import Link from "next/link";
import { db } from "@/lib/db";
import { getCategory } from "@/lib/categories";
import { Card, Label, EmptyState } from "@/components/ui";
import { placeLabel } from "@/lib/locale";

export default async function AuditsPage() {
  const audits = await db.audits.list(300);
  return (
    <div className="space-y-6">
      <div>
        <Label>Audits</Label>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Every audit run</h1>
        <p className="mt-1 text-sm text-muted">Inbound audits are leads: someone typed their own business into the homepage.</p>
      </div>
      {audits.length === 0 ? (
        <EmptyState title="No audits yet" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                {["Business", "Category", "Source", "Email", "AI named", "Score", "Date"].map((h) => <th key={h} className="label px-4 py-3 font-normal">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {audits.map((a) => {
                const ok = a.result.ai.answers.filter((x) => !x.error);
                return (
                  <tr key={a.id} className="hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <Link href={`/report/${a.id}`} className="font-medium hover:underline">{a.business_name}</Link>
                      <div className="text-xs text-muted">{placeLabel(a)}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-2">{getCategory(a.category).label}</td>
                    <td className="label px-4 py-3">{a.prospect_id ? "Prospect" : a.client_id ? "Client" : "Inbound"}</td>
                    <td className="px-4 py-3 text-ink-2">{a.email ?? "—"}</td>
                    <td className="tabular px-4 py-3">{a.result.ai.measured ? `${ok.filter((x) => x.mentioned).length}/${ok.length}` : "—"}</td>
                    <td className="tabular px-4 py-3 font-medium">{a.overall_score}</td>
                    <td className="px-4 py-3 text-muted">{new Date(a.created_at).toLocaleDateString("en-AU")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
