export const site = {
  name: "Surfaced",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  city: "Adelaide",
  region: "South Australia",
  description:
    "Surfaced checks whether ChatGPT, Gemini, Perplexity and Claude recommend your business when locals ask, then fixes what's stopping them. Built for Adelaide shops and trades.",
  contactEmail: process.env.CONTACT_EMAIL ?? "hello@surfaced.au",
  bookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL ?? "",
  abn: process.env.NEXT_PUBLIC_ABN ?? "",
};

export const plans = [
  {
    id: "fixpack",
    name: "Fix Pack",
    price: 350,
    interval: "once" as const,
    blurb: "One-off. We audit, then install the fixes AI engines look for.",
    features: [
      "Full six-area AI visibility audit",
      "LocalBusiness schema written and installed",
      "llms.txt and AI-crawler access set up",
      "FAQ copy that answers what locals ask",
      "Google Business Profile cleanup list",
      "Directory citation list for your trade",
    ],
  },
  {
    id: "visibility",
    name: "Visibility",
    price: 400,
    interval: "month" as const,
    featured: true,
    blurb: "Everything in Fix Pack, then we track and improve it every week.",
    features: [
      "Weekly checks across ChatGPT, Gemini, Perplexity and Claude",
      "Share of voice against 3 local competitors",
      "2 answer-first pages written each month",
      "Monthly fixes and directory listings",
      "Private client dashboard",
      "Monthly report, in plain English",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 750,
    interval: "month" as const,
    blurb: "For businesses in crowded categories with more suburbs to win.",
    features: [
      "Everything in Visibility",
      "5 competitors and up to 30 tracked questions",
      "6 answer-first pages each month",
      "Review request system set up",
      "Suburb landing pages",
      "Monthly 20-minute call",
    ],
  },
];

export type PlanId = (typeof plans)[number]["id"];
