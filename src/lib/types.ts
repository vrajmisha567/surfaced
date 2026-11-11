export type CheckStatus = "pass" | "warn" | "fail" | "info";

export type Check = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  /** What to do about it, written for a shop owner. */
  fix?: string;
  weight: number;
};

export type PillarKey = "ai" | "local" | "schema" | "nap" | "content" | "entity" | "crawl";

/** Where the business stands on Google Maps for its main search. */
export type LocalPresence = {
  query: string;
  /** 1-based position in Google Maps results for the query, or null if not in the top 20. */
  rank: number | null;
  found: boolean;
  name?: string;
  rating?: number | null;
  reviews?: number;
  hasWebsite?: boolean;
  hasHours?: boolean;
  mapsUrl?: string | null;
  /** The top three on Maps for the query, for comparison. */
  leaders: { name: string; rating: number | null; reviews: number }[];
  /** Rank from spots across the city (rank null = not in the top 20). Newer audits only. */
  grid?: { label: string; rank: number | null; checked: boolean }[];
  /** How many of the checked spots show the business in the top 3. */
  top3?: number;
  spots?: number;
  /** Rank when searching from right next to the business (what you see standing in the shop). */
  nearYou?: number | null;
  /** Why Maps couldn't be checked, if it couldn't. */
  error?: string;
};

export type Pillar = {
  key: PillarKey;
  label: string;
  summary: string;
  /** 0-100, or null when the pillar couldn't be measured (e.g. no AI keys configured). */
  score: number | null;
  checks: Check[];
};

export type EngineId = "chatgpt" | "gemini" | "perplexity" | "claude" | "ollama" | "ai_overview";

export type EngineAnswer = {
  engine: EngineId;
  prompt: string;
  answer: string;
  citations: { url: string; title?: string }[];
  mentioned: boolean;
  /** 1-based rank among businesses named in the answer, if mentioned. */
  position: number | null;
  /** Other business names the engine recommended instead. */
  othersNamed: string[];
  competitorsMentioned: string[];
  /** False when the engine answered from its own knowledge without live web search. */
  grounded?: boolean;
  /** web = live web search, maps = live Google Maps results, none = model memory. */
  grounding?: "web" | "maps" | "none";
  error?: string;
  ms?: number;
};

export type Extracted = {
  finalUrl: string;
  title: string;
  metaDescription: string;
  h1: string[];
  headings: string[];
  wordCount: number;
  phones: string[];
  emails: string[];
  addresses: string[];
  postcodes: string[];
  schemaTypes: string[];
  schemaBusiness: Record<string, unknown> | null;
  sameAs: string[];
  socialLinks: string[];
  hasFaq: boolean;
  questionHeadings: string[];
  internalLinks: string[];
  hasViewport: boolean;
  canonical: string | null;
  robotsMeta: string | null;
  lang: string | null;
  imagesWithoutAlt: number;
  images: number;
  hasReviewsMention: boolean;
  /** Business registration ID shown (ABN in Australia, company number in the UK...). Old audits only have hasAbn. */
  hasBizId?: boolean;
  bizIdLabel?: string;
  hasAbn?: boolean;
  responseMs: number;
  https: boolean;
  usedRenderer: "fetch" | "firecrawl";
  /** Firewall refused our crawler but let a browser in. Missing on older audits. */
  botBlocked?: boolean;
  textSample: string;
  /** Homepage plus the key inner pages read (contact, about, FAQ...). Missing on older audits. */
  pagesChecked?: { kind: string; url: string }[];
  /** Phone numbers on the homepage alone, for the consistency check. */
  homePhones?: string[];
};

/** Mobile page speed from Google PageSpeed Insights. Lab test, plus real-visitor data when Google has it. */
export type PageSpeed = {
  score: number;
  lcpMs: number | null;
  cls: number | null;
  tbtMs: number | null;
  fcpMs: number | null;
  field: { lcpMs: number | null; inpMs: number | null; cls: number | null; overall: string | null } | null;
};

export type CrawlerAccess = {
  robotsFound: boolean;
  blocked: string[];
  allowed: string[];
  llmsTxt: boolean;
  sitemap: boolean;
};

export type AuditInput = {
  url: string;
  businessName: string;
  /** Suburb, neighbourhood or area. */
  suburb: string;
  city?: string;
  /** ISO 3166 code, e.g. AU, US, GB. Missing = AU. */
  country?: string;
  category: string;
  email?: string;
  competitors?: string[];
};

export type AuditResult = {
  input: AuditInput;
  overall: number;
  grade: "A" | "B" | "C" | "D" | "F";
  pillars: Pillar[];
  extracted: Extracted | null;
  crawler: CrawlerAccess | null;
  ai: {
    measured: boolean;
    engines: EngineId[];
    prompts: string[];
    answers: EngineAnswer[];
    mentionRate: number | null;
    topRivals: { name: string; count: number }[];
  };
  /** Google Maps standing for the main search. Missing on older audits or without a Places key. */
  local?: LocalPresence | null;
  /** Mobile page speed. Missing on older audits, or when PageSpeed isn't available. */
  speed?: PageSpeed | null;
  /** Headline split (newer audits): how visible the business is now, and how ready its site is. */
  visibility?: number | null;
  readiness?: number | null;
  fetchError?: string;
  ranAt: string;
  durationMs: number;
};

export type AuditRecord = {
  id: string;
  created_at: string;
  url: string;
  business_name: string;
  suburb: string;
  city: string;
  country: string;
  category: string;
  email: string | null;
  overall_score: number;
  result: AuditResult;
  prospect_id: string | null;
  client_id: string | null;
  /** The customer account that ran it, when signed in. */
  user_id?: string | null;
};

export const prospectStatuses = [
  "new",
  "audited",
  "contacted",
  "replied",
  "pilot",
  "won",
  "lost",
] as const;
export type ProspectStatus = (typeof prospectStatuses)[number];

export type Prospect = {
  id: string;
  created_at: string;
  name: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  suburb: string | null;
  city: string | null;
  country: string;
  category: string;
  place_id: string | null;
  rating: number | null;
  review_count: number | null;
  status: ProspectStatus;
  audit_id: string | null;
  score: number | null;
  notes: string | null;
  last_contacted_at: string | null;
};

export type FixItem = {
  id: string;
  title: string;
  pillar: PillarKey;
  done: boolean;
  done_at?: string | null;
};

export type Client = {
  id: string;
  created_at: string;
  name: string;
  website: string;
  suburb: string;
  city: string;
  country: string;
  category: string;
  contact_name: string | null;
  contact_email: string | null;
  plan: "fixpack" | "tracking" | "visibility" | "growth" | "pilot";
  status: "active" | "paused" | "cancelled";
  monthly_value: number;
  share_token: string;
  competitors: string[];
  prompts: string[];
  fixes: FixItem[];
  stripe_customer_id: string | null;
  baseline_audit_id: string | null;
};

export type TrackerRun = {
  id: string;
  created_at: string;
  client_id: string;
  week: string;
  engine: EngineId;
  prompt: string;
  mentioned: boolean;
  position: number | null;
  competitors_mentioned: string[];
  others_named: string[];
  answer: string;
  citations: { url: string; title?: string }[];
  error: string | null;
};

/** The few fields of an audit the public stats page needs. */
export type AuditSummary = {
  created_at: string;
  category: string;
  city: string;
  country: string;
  /** Used only to count distinct businesses; never shown. */
  business_name: string;
  overall_score: number;
  visibility: number | null;
  readiness: number | null;
  pillars: Pillar[] | null;
  mentionRate: number | null;
  aiMeasured: boolean | null;
  top3: number | null;
  spots: number | null;
  mapsRank: number | null;
};
