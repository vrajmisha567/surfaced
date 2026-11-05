import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Card, Label, LinkButton } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata = { title: "Thanks", robots: { index: false } };

export default function Thanks() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl px-5 py-24">
        <Card className="p-8">
          <Label>Payment received</Label>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">You're in. Here's what happens next.</h1>
          <ol className="mt-6 space-y-3 text-sm text-ink-2">
            <li><span className="mr-2 font-mono text-accent">01</span>Within one business day we email you to confirm website access (or who manages it).</li>
            <li><span className="mr-2 font-mono text-accent">02</span>We install the fixes from your audit and send a summary of every change.</li>
            <li><span className="mr-2 font-mono text-accent">03</span>On monthly plans, you get a private dashboard link with weekly AI checks.</li>
          </ol>
          <p className="mt-6 text-sm text-muted">Questions: <a className="underline" href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a></p>
          <LinkButton href="/" variant="secondary" className="mt-6">Back to home</LinkButton>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
