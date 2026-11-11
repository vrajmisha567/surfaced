export const site = {
  name: "Surfaced",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /** Where Surfaced itself is based: used in email footers, not on the site. */
  city: "Adelaide",
  region: "South Australia",
  description:
    "Surfaced checks whether ChatGPT, Gemini, Perplexity and Claude recommend your business when customers ask, then fixes what's stopping them. For local businesses in any city, anywhere in the world.",
  contactEmail: process.env.CONTACT_EMAIL ?? "hello@surfaced.au",
  bookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL ?? "",
  abn: process.env.NEXT_PUBLIC_ABN ?? "",
  /**
   * Set NEXT_PUBLIC_GST_REGISTERED=true once Surfaced is registered for GST. Until then the prices
   * are the full price and the site must not say they include GST.
   */
  gstRegistered: process.env.NEXT_PUBLIC_GST_REGISTERED === "true",
};

/** The one line under prices, matching the GST setting above. */
export function priceNote() {
  return site.gstRegistered
    ? "Prices in Australian dollars. GST included for Australian businesses."
    : "Prices in Australian dollars.";
}

export const plans = [
  {
    id: "fixpack",
    name: "Fix Pack",
    price: 350,
    interval: "once" as const,
    featured: true,
    blurb: "One-off. We audit, then install the fixes AI engines look for.",
    features: [
      "Full seven-area AI visibility audit",
      "LocalBusiness schema written and installed",
      "llms.txt and AI-crawler access set up",
      "FAQ copy that answers what customers ask",
      "Google Business Profile cleanup list",
      "Directory citation list for your trade",
    ],
  },
  {
    id: "tracking",
    name: "Tracking",
    price: 190,
    interval: "month" as const,
    blurb: "After the Fix Pack: see every week whether AI engines name you, and who they name instead.",
    features: [
      "Weekly checks across ChatGPT, Gemini, Perplexity and Claude",
      "Your Google Maps rank from 5 spots across your city",
      "Share of voice against 3 local competitors",
      "Private client dashboard",
      "Monthly report, in plain English",
      "Cancel any month",
    ],
  },
  {
    id: "visibility",
    name: "Visibility",
    price: 400,
    interval: "month" as const,
    blurb: "Everything in Fix Pack, then we track and keep improving it every week.",
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
    /** Not offered publicly until Visibility has proven itself; still usable from the console. */
    hidden: true,
    blurb: "For businesses in crowded categories with more areas to win.",
    features: [
      "Everything in Visibility",
      "5 competitors and up to 30 tracked questions",
      "6 answer-first pages each month",
      "Review request system set up",
      "Landing pages for each area you serve",
      "Monthly 20-minute call",
    ],
  },
];

export type PlanId = (typeof plans)[number]["id"];

/** The plans shown on the public site, llms.txt and the terms. */
export const publicPlans = plans.filter((p) => !("hidden" in p && p.hidden));
