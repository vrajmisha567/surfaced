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

export type PillarKey = "ai" | "schema" | "nap" | "content" | "entity" | "crawl";

export type Pillar = {
  key: PillarKey;
  label: string;
  summary: string;
  /** 0-100, or null when the pillar couldn't be measured (e.g. no AI keys configured). */
  score: number | null;
  checks: Check[];
};

export type EngineId = "chatgpt" | "gemini" | "perplexity" | "claude" | "ollama";

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
  hasAbn: boolean;
  responseMs: number;
  https: boolean;
  usedRenderer: "fetch" | "firecrawl";
  textSample: string;
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
  suburb: string;
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
  category: string;
  email: string | null;
  overall_score: number;
  result: AuditResult;
  prospect_id: string | null;
  client_id: string | null;
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
  category: string;
  contact_name: string | null;
  contact_email: string | null;
  plan: "fixpack" | "visibility" | "growth" | "pilot";
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
