# Surfaced

**AI search visibility (GEO) for local businesses. Built in Adelaide, works for any city.**

Surfaced checks whether ChatGPT, Gemini, Perplexity and Claude name a business when locals ask for a recommendation ("who's the best plumber in Norwood?"), checks where it ranks on Google Maps, scores the five site factors those engines rely on, generates the fixes, and tracks share of voice against local competitors every week.

It runs as a small agency in a box: a public audit tool that generates leads, a prospecting CRM that writes cold outreach from real audit findings, client workspaces with weekly tracking, a private client portal, and Stripe billing.

## What it does

| Module | What it does |
|---|---|
| **Free audit** (`/`) | Business URL, business type (87 built in, or type your own) and location (any city, ~50 countries) in. Score out of 100: 75% "visible now" (AI answers + Google Maps) and 25% "site readiness" (five site areas), 35+ checks with plain-English fixes. |
| **Report** (`/report/[id]`) | Shareable report: which engines named you, who they named instead, priority fixes, every check. Prints to PDF. |
| **Prospecting CRM** (`/app/prospects`) | Pulls businesses from Google Places by category and suburb, audits them in bulk, writes a personalised cold email from each audit (Spam Act opt-out included), and tracks pipeline status. |
| **Client workspace** (`/app/clients/[id]`) | Weekly multi-engine tracking, mention rate and share-of-voice charts, fix checklist, and a generated Fix Pack: LocalBusiness + FAQ JSON-LD, `llms.txt`, AI-crawler `robots.txt`, FAQ copy, Google Business Profile checklist, directory list. |
| **Client portal** (`/c/[token]`) | Private, unguessable link the client can open any time. No login needed. |
| **Billing** | Stripe Checkout for a one-off Fix Pack and two monthly plans; webhook creates or pauses the client. |
| **Weekly cron** | Vercel Cron re-asks every tracked question across every engine each Monday morning (Adelaide time). |

### How the score works

The headline score is **75% "visible now" + 25% "site readiness"**, so a business that AI already names in the top 3 scores high, and the report still shows what would keep it there.

**Visible now**
1. **AI answers**: named in live engine answers, top-3 placement, engine coverage. When Gemini can't use Google Search (free API keys), it answers from the live Google Maps results searched from the city centre, the local data the Gemini app leans on. Answers from model memory alone are shown but not scored: they name a different list from the real app.
2. **Google Maps & reviews**: how often the business is top 3 on Maps for "best [type] in [city]", searched from five spots across the city (centre, north, east, south, west). Maps results depend on where the searcher is, and nearly every business ranks #1 next to its own address, so one spot can't give a fair answer. The report also shows the rank from right next to the business (what you see on your phone in the shop), plus star rating, review count against the top 3, and profile completeness. About six Places searches per audit.

**Site readiness**
3. **Structured data**: LocalBusiness subtype, address, phone, hours, service area, sameAs, FAQPage
4. **Name, address, phone**: consistency across page and schema, area mentioned (country-aware phone and postcode formats)
5. **Answer-first content**: H1 states service + place, FAQ section, question headings, depth
6. **Entity strength**: Google Business Profile link, social/directory profiles, reviews, business ID (ABN, NZBN, company number...)
7. **AI crawler access**: AI crawlers allowed in robots.txt and through the firewall, `llms.txt`, sitemap, server-rendered content

Anything that can't be measured (no AI keys, no Places key) is marked "not measured" and left out of the maths rather than faked.

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
