# Surfaced

**AI search visibility (GEO) for local businesses in Adelaide.**

Surfaced checks whether ChatGPT, Gemini, Perplexity and Claude name a business when locals ask for a recommendation ("who's the best plumber in Norwood?"), scores the six site factors those engines rely on, generates the fixes, and tracks share of voice against local competitors every week.

It runs as a small agency in a box: a public audit tool that generates leads, a prospecting CRM that writes cold outreach from real audit findings, client workspaces with weekly tracking, a private client portal, and Stripe billing.

## What it does

| Module | What it does |
|---|---|
| **Free audit** (`/`) | Business URL, suburb and category in. Score out of 100 across six weighted areas, 30+ checks, each with a plain-English fix. Live answers from up to four AI engines. |
| **Report** (`/report/[id]`) | Shareable report: which engines named you, who they named instead, priority fixes, every check. Prints to PDF. |
| **Prospecting CRM** (`/app/prospects`) | Pulls businesses from Google Places by category and suburb, audits them in bulk, writes a personalised cold email from each audit (Spam Act opt-out included), and tracks pipeline status. |
| **Client workspace** (`/app/clients/[id]`) | Weekly multi-engine tracking, mention rate and share-of-voice charts, fix checklist, and a generated Fix Pack: LocalBusiness + FAQ JSON-LD, `llms.txt`, AI-crawler `robots.txt`, FAQ copy, Google Business Profile checklist, directory list. |
| **Client portal** (`/c/[token]`) | Private, unguessable link the client can open any time. No login needed. |
| **Billing** | Stripe Checkout for a one-off Fix Pack and two monthly plans; webhook creates or pauses the client. |
| **Weekly cron** | Vercel Cron re-asks every tracked question across every engine each Monday morning (Adelaide time). |

### The six scored areas

1. **AI visibility (25%)**: named in live engine answers, top-3 placement, engine coverage
2. **Structured data (15%)**: LocalBusiness subtype, address, phone, hours, service area, sameAs, FAQPage
3. **Name, address, phone (15%)**: consistency across page and schema, suburb mentioned
4. **Answer-first content (15%)**: H1 states service + place, FAQ section, question headings, depth
5. **Entity strength (15%)**: Google Business Profile link, social/directory profiles, reviews, ABN
6. **AI crawler access (15%)**: GPTBot / OAI-SearchBot / PerplexityBot / ClaudeBot / Google-Extended allowed, `llms.txt`, sitemap, server-rendered content

If no AI keys are configured, the AI pillar is marked "not measured" and the score is re-weighted across the other five, rather than faked.

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4**, hand-built components, SVG charts (no chart library)
- **Supabase** Postgres with RLS deny-by-default (server-only access); falls back to a local JSON file so it runs with zero setup
- **AI engines**: OpenAI Responses API (web search), Gemini (Google Search grounding), Perplexity Sonar, Anthropic Messages API (web search tool)
- **Stripe** Checkout + webhooks, **Resend** transactional email, **Google Places API**, optional **Firecrawl** for JavaScript-rendered sites
- **Vercel** hosting + Cron

## Run it locally

```bash
npm install
cp .env.example .env.local   # every key is optional locally
npm run dev
```

Open http://localhost:3000. The operator console is at `/login` (dev password: `surfaced`, set `ADMIN_PASSWORD` for production). On the Clients page, "Load sample client" creates a clearly labelled demo client with 10 weeks of synthetic tracking data, for screenshots and sales calls.

## Deploy

1. Push to GitHub and import the repo in Vercel.
2. Add the variables from `.env.example` in Vercel (at minimum `ADMIN_PASSWORD`, `SESSION_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`, Supabase keys, and one AI key).
3. Apply `supabase/migrations/0001_init.sql` to your Supabase project.
4. In Stripe, add a webhook to `https://<your-domain>/api/stripe/webhook` for `checkout.session.completed` and `customer.subscription.deleted`.
5. In Resend, verify a sending domain (e.g. `mail.yourdomain.com.au`) and set `RESEND_FROM`.

## Project layout

```
src/
  app/
    page.tsx               landing page + audit form
    actions.ts             public audit server action (rate limited)
    report/[id]/           public report
    app/                   operator console (prospects, clients, audits, integrations)
    c/[token]/             client portal
    api/checkout           Stripe Checkout redirect
    api/stripe/webhook     Stripe events
    api/cron/track         weekly tracker (CRON_SECRET protected)
    llms.txt/              the site's own llms.txt
  lib/
    audit/                 fetch (SSRF-guarded), extract, robots, score, run
    ai/                    engine clients + mention detection and rival extraction
    fixpack.ts             schema / llms.txt / robots / FAQ generator
    outreach.ts            cold email drafts from audit findings
    tracker.ts             weekly runs, mention rate, share of voice
    db.ts                  Supabase or local-file repository
supabase/migrations/       database schema
```

## Honest limits

AI answers change daily and nobody controls them. Surfaced doesn't promise rankings or leads; it fixes the inputs engines use and shows the evidence every week. Mention detection is name and domain matching, so unusual business names may need their competitors and prompts tuned per client.
