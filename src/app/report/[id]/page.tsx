import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, BookmarkPlus } from "lucide-react";
import { db } from "@/lib/db";
import { ReportView } from "@/components/report-view";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Card, LinkButton } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/report/[id]">): Promise<Metadata> {
  const { id } = await params;
  const a = await db.audits.get(id).catch(() => null);
  return {
    title: a ? `${a.business_name}: AI visibility report` : "Report",
    robots: { index: false, follow: false },
  };
}

export default async function ReportPage({ params }: PageProps<"/report/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const audit = await db.audits.get(id);
  if (!audit) notFound();

  return (
    <>
      <div className="no-print"><SiteHeader /></div>
      <main className="mx-auto w-full max-w-5xl px-5 py-10">
        <div className="no-print mb-6 flex items-center justify-between">
          <div className="label">Free audit · {site.name}</div>
          <div className="flex items-center gap-2">
            {!audit.user_id && (
              <LinkButton href={`/account?claim=${audit.id}`} variant="secondary" size="sm" prefetch={false}>
                <BookmarkPlus size={14} /> Save to my account
              </LinkButton>
            )}
            <PrintButton />
          </div>
        </div>
        <ReportView r={audit.result} id={audit.id} createdAt={audit.created_at} />

        <Card className="no-print mt-10 grid gap-6 bg-night p-8 text-white md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <div className="label !text-faint">Next step</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Want us to fix this for you?</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#a9b4c6]">
              The Fix Pack installs every fix above: schema, FAQ answers, llms.txt, crawler access, Google Business Profile cleanup and the directory list for your trade. One-off $350.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <LinkButton href={`/api/checkout?plan=fixpack&audit=${audit.id}`} size="lg" prefetch={false}>
              Get the Fix Pack <ArrowRight size={16} />
            </LinkButton>
            <a href={site.bookingUrl || `mailto:${site.contactEmail}?subject=${encodeURIComponent(`Audit ${audit.id.slice(0, 8)}: ${audit.business_name}`)}`} className="text-sm text-[#a9b4c6] underline underline-offset-2 hover:text-white">
              {site.bookingUrl ? "Or book a 15-minute call first" : "Or talk it through first"}
            </a>
          </div>
        </Card>
      </main>
      <div className="no-print"><SiteFooter /></div>
    </>
  );
}
