import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/legal";
import { plans, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms for using Surfaced's free audit, accounts and paid plans.",
};

const UPDATED = "7 November 2026";

export default function TermsPage() {
  const mail = <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>;
  const fixPack = plans.find((p) => p.id === "fixpack");
  return (
    <LegalPage
      title="Terms of service"
      updated={UPDATED}
      intro={
        <>
          These terms cover your use of Surfaced: the free AI visibility audit, your account, and our paid plans. By using the site you agree to them. If something here is unclear, email {mail}{" "}
          before you buy.
        </>
      }
    >
      <Section n={1} title="What Surfaced does">
        <p>
          Surfaced checks how often AI assistants and Google Maps name a business for the questions its customers ask, scores the things that affect this, and, on paid plans, makes fixes and tracks
          progress every week.
        </p>
      </Section>

      <Section n={2} title="No guaranteed rankings">
        <p>
          <b>Nobody controls what an AI assistant or search engine says.</b> Answers change from day to day, by location and by how a question is worded. We can&apos;t and don&apos;t promise that
          your business will be recommended, ranked in any position, or get any number of leads or sales. Audit scores are our assessment at a point in time, not a guarantee of results.
        </p>
      </Section>

      <Section n={3} title="Free audits">
        <ul>
          <li>Only audit businesses you own, work for, or have a genuine reason to research.</li>
          <li>Audits rely on third-party services and public data that may be incomplete or out of date. They&apos;re provided as information, not professional advice.</li>
          <li>We may limit how many audits you can run, to keep the service fair for everyone.</li>
        </ul>
      </Section>

      <Section n={4} title="Your account">
        <p>
          Keep your sign-in details secure and tell us if you think someone else has used your account. You&apos;re responsible for activity on your account. You can ask us to delete it at any time
          by emailing {mail}.
        </p>
      </Section>

      <Section n={5} title="Paid plans">
        <ul>
          <li>
            Prices are shown on our <Link href="/#pricing">pricing section</Link> in Australian dollars, including GST for Australian customers. Payments are handled by Stripe.
          </li>
          <li>
            The <b>Fix Pack</b>
            {fixPack ? ` (A$${fixPack.price})` : ""} is a one-off payment for the work described on the pricing section.
          </li>
          <li>
            <b>Monthly plans</b> renew each month until you cancel. There&apos;s no lock-in contract: cancel any time and your plan stops at the end of the month you&apos;ve paid for.
          </li>
          <li>To do the work, we may need access to your website or Google Business Profile, or need you to pass instructions to whoever manages them.</li>
          <li>Fixes, copy, structured data and listings we create for you are yours to keep, even if you leave.</li>
        </ul>
      </Section>

      <Section n={6} title="Refunds">
        <p>
          If we haven&apos;t started work on a Fix Pack, you can ask for a full refund. Monthly fees for a month that has started aren&apos;t refunded. None of this limits your rights under the
          Australian Consumer Law, including remedies if a service isn&apos;t delivered with due care and skill.
        </p>
      </Section>

      <Section n={7} title="Acceptable use">
        <p>Don&apos;t use Surfaced to break the law, scrape or overload the service, get around usage limits, or attempt to access data that isn&apos;t yours.</p>
      </Section>

      <Section n={8} title="Liability">
        <p>
          To the extent the law allows, Surfaced isn&apos;t liable for indirect or consequential losses, such as lost profits or business, and our total liability for any claim is limited to the
          amount you paid us in the 12 months before it. Nothing in these terms excludes rights you have under the Australian Consumer Law that can&apos;t be excluded.
        </p>
      </Section>

      <Section n={9} title="Third-party services">
        <p>
          Surfaced relies on services such as AI assistants, Google Maps, Stripe and our hosting providers. We&apos;re not responsible for their outages or changes, though we&apos;ll do our best to
          work around them.
        </p>
      </Section>

      <Section n={10} title="Privacy">
        <p>
          How we handle personal information is explained in our <Link href="/privacy">privacy policy</Link>.
        </p>
      </Section>

      <Section n={11} title="Changes, law and contact">
        <p>
          We may update these terms; the date at the top shows when they last changed, and we&apos;ll email account holders about significant changes. These terms are governed by the laws of
          Australia. Questions: {mail}.
        </p>
      </Section>
    </LegalPage>
  );
}
