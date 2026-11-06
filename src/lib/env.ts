import "server-only";

/** Which integrations are configured. Everything degrades gracefully when a key is missing. */
export const env = {
  openai: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-5-mini",
  gemini: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
  perplexity: process.env.PERPLEXITY_API_KEY,
  perplexityModel: process.env.PERPLEXITY_MODEL ?? "sonar",
  anthropic: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5",
  ollama: process.env.OLLAMA_API_KEY,
  ollamaModel: process.env.OLLAMA_MODEL ?? "deepseek-v4.1-flash",

  firecrawl: process.env.FIRECRAWL_API_KEY,
  googlePlaces: process.env.GOOGLE_PLACES_API_KEY,

  supabaseUrl: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,

  stripeSecret: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

  resend: process.env.RESEND_API_KEY,
  resendFrom: process.env.RESEND_FROM ?? "Surfaced <onboarding@resend.dev>",

  adminPassword: process.env.ADMIN_PASSWORD,
  sessionSecret: process.env.SESSION_SECRET,
  cronSecret: process.env.CRON_SECRET,
};

export type Integration = {
  key: string;
  label: string;
  enabled: boolean;
  purpose: string;
  envVars: string[];
};

export function integrations(): Integration[] {
  return [
    { key: "openai", label: "OpenAI (ChatGPT)", enabled: !!env.openai, purpose: "AI visibility checks with web search", envVars: ["OPENAI_API_KEY"] },
    { key: "gemini", label: "Google Gemini", enabled: !!env.gemini, purpose: "AI visibility checks grounded in Google Search", envVars: ["GEMINI_API_KEY"] },
    { key: "perplexity", label: "Perplexity", enabled: !!env.perplexity, purpose: "AI visibility checks with cited sources", envVars: ["PERPLEXITY_API_KEY"] },
    { key: "anthropic", label: "Anthropic (Claude)", enabled: !!env.anthropic, purpose: "AI visibility checks, FAQ and outreach writing", envVars: ["ANTHROPIC_API_KEY"] },
    { key: "ollama", label: "Ollama Cloud (open models)", enabled: !!env.ollama, purpose: "AI visibility checks via Ollama web search, plus FAQ and outreach writing", envVars: ["OLLAMA_API_KEY", "OLLAMA_MODEL"] },
    { key: "supabase", label: "Supabase", enabled: !!(env.supabaseUrl && env.supabaseServiceKey), purpose: "Database (falls back to a local JSON file in dev)", envVars: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] },
    { key: "places", label: "Google Places", enabled: !!env.googlePlaces, purpose: "Finding local businesses to prospect", envVars: ["GOOGLE_PLACES_API_KEY"] },
    { key: "firecrawl", label: "Firecrawl", enabled: !!env.firecrawl, purpose: "Rendering JavaScript-heavy sites during audits", envVars: ["FIRECRAWL_API_KEY"] },
    { key: "stripe", label: "Stripe", enabled: !!env.stripeSecret, purpose: "Checkout and subscriptions", envVars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] },
    { key: "resend", label: "Resend", enabled: !!env.resend, purpose: "Report and receipt emails", envVars: ["RESEND_API_KEY", "RESEND_FROM"] },
  ];
}

export function aiEnginesEnabled() {
  return [env.openai, env.gemini, env.perplexity, env.anthropic, env.ollama].filter(Boolean).length;
}
