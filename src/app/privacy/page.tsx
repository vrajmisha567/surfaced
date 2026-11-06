import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/legal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Surfaced collects, why, who it's shared with, and how to get it deleted.",
};

const UPDATED = "7 November 2026";

export default function PrivacyPage() {
  const mail = <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>;
  return (
    <LegalPage
      title="Privacy policy"
      updated={UPDATED}
      intro={
        <>
          Surfaced checks how visible local businesses are in AI search and helps them improve it. This policy explains what we collect when you use{" "}
          {site.url.replace(/^https?:\/\//, "")}, why, who helps us run the service, and how to get your data deleted. Surfaced is operated from Australia and handles personal information in line with
          the Australian Privacy Principles.
        </>
      }
    >
      <Section n={1} title="What we collect">
        <ul>
          <li>
            <b>Audit details you enter:</b> business name, website, business type, suburb or area, city and country, and an email address if you ask for a copy.
          </li>
          <li>
            <b>Audit results:</b> what we find on the website you enter, the answers AI assistants give to questions about that type of business, and public Google Maps information such as rank,
            rating and review count.
          </li>
          <li>
            <b>Your account:</b> your name, email address and, if you sign in with Google, your Google profile picture. If you use a password, it&apos;s stored by our authentication provider as a
            secure hash; we never see it.
          </li>
          <li>
            <b>Payments:</b> your name, email and billing details are collected by Stripe. Card numbers go straight to Stripe and never reach our servers.
          </li>
          <li>
            <b>Messages:</b> anything you send us by email.
          </li>
          <li>
            <b>Public business information:</b> to find businesses we might offer an audit to, we look up publicly listed details on Google Maps, such as a business&apos;s name, website, phone
            number and address.
          </li>
        </ul>
      </Section>

      <Section n={2} title="What we don't collect">
        <p>
          We don&apos;t use advertising trackers, analytics scripts or third-party marketing cookies. We don&apos;t sell personal information, and we don&apos;t use it to train AI models.
        </p>
      </Section>

      <Section n={3} title="How we use it">
        <ul>
          <li>To run your audit and show you the report.</li>
          <li>To keep your audits in your account and let you sign in.</li>
          <li>To email you a copy of a report when you ask for one, and reply when you contact us.</li>
          <li>For paying clients: to track visibility each week and report progress.</li>
          <li>To work out anonymous, aggregate statistics, such as the median score across all audits. These never show a business name.</li>
          <li>To keep the service secure and prevent abuse.</li>
        </ul>
      </Section>

      <Section n={4} title="Google sign-in">
        <p>
          If you choose &ldquo;Continue with Google&rdquo;, Google shares your name, email address and profile picture with us. We use them only to create and identify your Surfaced account. We
          don&apos;t request access to your Gmail, contacts, calendar or files, and we don&apos;t post anything on your behalf. Our use of information received from Google APIs follows the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
            Google API Services User Data Policy
          </a>
          , including its Limited Use requirements. You can remove Surfaced&apos;s access at any time from your{" "}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
            Google account permissions
          </a>
          .
        </p>
      </Section>

      <Section n={5} title="Who helps us run Surfaced">
        <p>We share only what each provider needs to do its job:</p>
        <ul>
          <li>
            <b>Supabase</b>: database and sign-in. Data is stored in Sydney, Australia.
          </li>
          <li>
            <b>Vercel</b>: website hosting.
          </li>
          <li>
            <b>AI providers</b> such as Google (Gemini), OpenAI, Anthropic and Perplexity, depending on which are switched on: they receive questions about a type of business in a place, such as
            &ldquo;best plumber in Manchester&rdquo;. They don&apos;t receive your email address or account details.
          </li>
          <li>
            <b>Google Maps Platform</b>: looks up public business listings for the audit.
          </li>
          <li>
            <b>Stripe</b>: payments.
          </li>
          <li>
            <b>Resend</b>: sends emails, such as reports and sign-in links.
          </li>
        </ul>
        <p>
          Some of these providers process data outside Australia, including in the United States. We choose providers with strong security practices. We may also disclose information if the law
          requires it.
        </p>
      </Section>

      <Section n={6} title="Cookies">
        <p>
          We use only the cookies the service needs to work: one that keeps you signed in, and one for our own staff console. There are no advertising or tracking cookies, so there&apos;s nothing to
          opt out of.
        </p>
      </Section>

      <Section n={7} title="How long we keep it">
        <p>
          We keep your account and audits until you delete your account or ask us to remove them. Payment records are kept as long as tax law requires. Aggregate statistics contain no personal
          information and may be kept indefinitely.
        </p>
      </Section>

      <Section n={8} title="Your choices and rights">
        <p>
          You can ask to see, correct or delete the personal information we hold about you, or ask us to stop contacting you. Email {mail} and we&apos;ll respond within 30 days. If you&apos;re not
          satisfied with how we handle a privacy concern, you can contact the{" "}
          <a href="https://www.oaic.gov.au" target="_blank" rel="noreferrer">
            Office of the Australian Information Commissioner
          </a>
          , or your local data protection authority if you live elsewhere.
        </p>
      </Section>

      <Section n={9} title="Security">
        <p>
          Data is encrypted in transit and stored with providers that encrypt it at rest. Access to the database is restricted to our servers. No system is perfectly secure, and if a breach affects
          you, we&apos;ll tell you as the law requires.
        </p>
      </Section>

      <Section n={10} title="Children">
        <p>Surfaced is a service for businesses and isn&apos;t meant for anyone under 16.</p>
      </Section>

      <Section n={11} title="Changes and contact">
        <p>
          If we make significant changes to this policy, we&apos;ll update the date at the top and, if you have an account, let you know by email. Questions: {mail}.
        </p>
      </Section>
    </LegalPage>
  );
}
