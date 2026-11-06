/**
 * Countries and locations. Surfaced started in Adelaide, so anything without a
 * country is treated as Adelaide, Australia. Everything country-specific
 * (phone formats, postcodes, business IDs, directories) lives here.
 */

export type Group =
  | "Trades"
  | "Home"
  | "Health"
  | "Food"
  | "Beauty"
  | "Fitness"
  | "Auto"
  | "Professional"
  | "Pets"
  | "Education"
  | "Events"
  | "Retail"
  | "Other";

export const groupLabels: Record<Group, string> = {
  Trades: "Trades & construction",
  Home: "Home services",
  Health: "Health",
  Food: "Food & drink",
  Beauty: "Beauty",
  Fitness: "Fitness",
  Auto: "Auto",
  Professional: "Professional services",
  Pets: "Pets",
  Education: "Kids & education",
  Events: "Events & stays",
  Retail: "Retail",
  Other: "Other",
};

export type Country = {
  code: string;
  name: string;
  /** International dialling code without "+". */
  cc: string;
  /** Domestic trunk prefix (0 in AU/UK, none in US). */
  trunk: string;
  /** Valid lengths of a national-format number (digits, with the trunk prefix). */
  phoneLengths?: number[];
  /** What locals call the smaller area. */
  areaWord: "suburb" | "neighbourhood" | "area";
  /** Matches a postcode, with the state/region where that's how addresses end. */
  postcode?: RegExp;
  /** Business registration ID shown on legitimate sites, if there's a common one. */
  businessId?: { label: string; pattern: RegExp; tip: string };
  directories: string[];
  groupDirectories?: Partial<Record<Group, string[]>>;
};

const core = ["Google Business Profile", "Apple Business Connect", "Bing Places for Business", "Facebook Page"];

export const countries: Country[] = [
  {
    code: "AU",
    name: "Australia",
    cc: "61",
    trunk: "0",
    areaWord: "suburb",
    postcode: /\b(?:NSW|VIC|QLD|SA|WA|TAS|NT|ACT|New South Wales|Victoria|Queensland|South Australia|Western Australia|Tasmania|Northern Territory)\s*(\d{4})\b/g,
    businessId: {
      label: "ABN",
      pattern: /\bABN\b[:\s]*\d{2}\s?\d{3}\s?\d{3}\s?\d{3}/i,
      tip: "Show your ABN in the footer. It's a strong legitimacy signal in Australia.",
    },
    directories: [...core, "Yelp Australia", "Yellow Pages Australia", "True Local", "Localsearch", "Hotfrog Australia", "StartLocal", "Brownbook", "Cylex Australia"],
    groupDirectories: {
      Trades: ["hipages", "Oneflare", "ServiceSeeking", "Airtasker (business profile)", "Word of Mouth", "Your trade association's member directory"],
      Home: ["hipages", "Oneflare", "ServiceSeeking", "Airtasker (business profile)", "Word of Mouth"],
      Health: ["HealthEngine", "HotDoc", "Healthdirect Service Finder", "Whitecoat"],
      Food: ["TripAdvisor", "Google Maps photos and menu", "Uber Eats / DoorDash listing"],
      Beauty: ["Fresha", "Timely", "Bookwell"],
      Fitness: ["ClassPass", "Mindbody"],
      Auto: ["Carsguide service finder", "Your motoring club's approved repairer list (if eligible)"],
      Events: ["Easy Weddings", "TripAdvisor"],
      Professional: ["Your professional body's find-a-member directory"],
    },
  },
  {
    code: "NZ",
    phoneLengths: [9, 10, 11],
    name: "New Zealand",
    cc: "64",
    trunk: "0",
    areaWord: "suburb",
    postcode: /\b(\d{4})\b/g,
    businessId: { label: "NZBN", pattern: /\bNZBN\b[:\s]*94\d{11}/i, tip: "Show your NZBN in the footer so engines can match you to official records." },
    directories: [...core, "Yelp", "Finda", "Yellow NZ", "Neighbourly"],
    groupDirectories: {
      Trades: ["NoCowboys", "Builderscrack", "Your trade association's member directory"],
      Home: ["NoCowboys", "Builderscrack"],
      Health: ["Healthpoint"],
      Food: ["TripAdvisor", "Uber Eats / DoorDash listing"],
      Beauty: ["Fresha", "Timely"],
    },
  },
  {
    code: "GB",
    phoneLengths: [10, 11],
    name: "United Kingdom",
    cc: "44",
    trunk: "0",
    areaWord: "area",
    postcode: /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/g,
    businessId: {
      label: "company or VAT number",
      pattern: /\b(?:company (?:no|number|reg(?:istration)?)|registered in (?:england|scotland|wales|northern ireland)|VAT (?:no|reg|number))\b/i,
      tip: "Show your company number (and VAT number if registered) in the footer.",
    },
    directories: [...core, "Yelp UK", "Yell", "Thomson Local", "FreeIndex", "Scoot", "Cylex UK"],
    groupDirectories: {
      Trades: ["Checkatrade", "TrustATrader", "MyBuilder", "Rated People", "Which? Trusted Traders"],
      Home: ["Checkatrade", "TrustATrader", "Bark"],
      Health: ["Doctify", "NHS service directory (if you're listed)"],
      Food: ["TripAdvisor", "OpenTable", "Deliveroo / Just Eat listing"],
      Beauty: ["Treatwell", "Fresha"],
      Fitness: ["ClassPass"],
      Professional: ["Bark", "Your professional body's directory"],
    },
  },
  {
    code: "IE",
    phoneLengths: [9, 10],
    name: "Ireland",
    cc: "353",
    trunk: "0",
    areaWord: "area",
    postcode: /\b([AC-FHKNPRTV-Y]\d{2}\s?[AC-FHKNPRTV-Y\d]{4})\b/g,
    businessId: { label: "CRO or VAT number", pattern: /\b(?:CRO|company (?:no|number)|VAT (?:no|number|reg))\b/i, tip: "Show your CRO number (and VAT number if registered) in the footer." },
    directories: [...core, "Yelp", "Golden Pages", "Cylex Ireland"],
    groupDirectories: { Trades: ["Tradesmen.ie", "Your trade association's directory"], Food: ["TripAdvisor"], Beauty: ["Treatwell", "Fresha"] },
  },
  {
    code: "US",
    name: "United States",
    cc: "1",
    trunk: "1",
    areaWord: "neighbourhood",
    postcode: /\b[A-Z]{2}\s+(\d{5})(?:-\d{4})?\b/g,
    directories: [...core, "Yelp", "Better Business Bureau", "Nextdoor", "Yellow Pages (yp.com)", "Foursquare"],
    groupDirectories: {
      Trades: ["Angi", "Thumbtack", "HomeAdvisor", "Houzz", "Porch"],
      Home: ["Angi", "Thumbtack", "Nextdoor"],
      Health: ["Healthgrades", "Zocdoc", "Vitals", "WebMD Care"],
      Food: ["TripAdvisor", "OpenTable", "DoorDash / Uber Eats listing"],
      Beauty: ["Booksy", "StyleSeat", "Fresha"],
      Fitness: ["ClassPass", "Mindbody"],
      Auto: ["RepairPal", "CARFAX service shops"],
      Professional: ["Avvo / Justia (legal)", "Your professional body's directory"],
      Pets: ["Rover (if you offer sitting or walking)"],
      Events: ["The Knot", "WeddingWire"],
    },
  },
  {
    code: "CA",
    name: "Canada",
    cc: "1",
    trunk: "1",
    areaWord: "neighbourhood",
    postcode: /\b([A-Z]\d[A-Z]\s?\d[A-Z]\d)\b/g,
    directories: [...core, "Yelp Canada", "YellowPages.ca", "411.ca", "Cylex Canada"],
    groupDirectories: {
      Trades: ["HomeStars", "TrustedPros", "Houzz"],
      Home: ["HomeStars", "TrustedPros"],
      Health: ["RateMDs"],
      Food: ["TripAdvisor", "OpenTable", "DoorDash / Uber Eats listing"],
      Beauty: ["Fresha", "Booksy"],
    },
  },
  {
    code: "IN",
    phoneLengths: [10, 11],
    name: "India",
    cc: "91",
    trunk: "0",
    areaWord: "area",
    postcode: /\b(\d{6})\b/g,
    businessId: { label: "GSTIN", pattern: /\bGSTIN?\b[:\s]*\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]/i, tip: "Show your GSTIN on the site. It's a common legitimacy check in India." },
    directories: [...core, "Justdial", "Sulekha", "IndiaMART"],
    groupDirectories: { Health: ["Practo"], Food: ["Zomato", "Swiggy"], Beauty: ["Fresha"], Home: ["Urban Company (if you're a partner)"] },
  },
  {
    code: "SG",
    phoneLengths: [8],
    name: "Singapore",
    cc: "65",
    trunk: "",
    areaWord: "area",
    postcode: /\bSingapore\s+(\d{6})\b/g,
    businessId: { label: "UEN", pattern: /\bUEN\b[:\s]*[\dA-Z]{9,10}/i, tip: "Show your UEN in the footer." },
    directories: [...core, "Yelp", "Streetdirectory"],
    groupDirectories: { Food: ["Burpple", "TripAdvisor", "GrabFood / foodpanda listing"], Beauty: ["Fresha", "Vaniday"] },
  },
  {
    code: "AE",
    phoneLengths: [9, 10],
    name: "United Arab Emirates",
    cc: "971",
    trunk: "0",
    areaWord: "area",
    businessId: { label: "trade licence number", pattern: /\btrade licen[cs]e\b/i, tip: "Show your trade licence number on the site." },
    directories: [...core, "Yellow Pages UAE", "Connect.ae"],
    groupDirectories: { Food: ["Zomato", "TripAdvisor", "Talabat / Deliveroo listing"], Beauty: ["Fresha"] },
  },
  {
    code: "ZA",
    phoneLengths: [10],
    name: "South Africa",
    cc: "27",
    trunk: "0",
    areaWord: "suburb",
    postcode: /\b(\d{4})\b/g,
    businessId: { label: "company registration number", pattern: /\b(?:reg(?:istration)?\.? ?(?:no|number)|CIPC)\b/i, tip: "Show your company registration number in the footer." },
    directories: [...core, "Yelp", "Cylex South Africa", "Snupit"],
    groupDirectories: { Trades: ["Snupit", "Your trade association's directory"], Food: ["TripAdvisor", "Uber Eats / Mr D listing"], Beauty: ["Fresha"] },
  },
];

/** Used for countries not in the list: generic advice, no country-specific formats. */
export const otherCountry = (code: string, name: string): Country => ({
  code,
  name,
  cc: "",
  trunk: "0",
  areaWord: "area",
  directories: [...core, "Yelp", "Foursquare", "TripAdvisor (if you serve visitors)"],
});

const OTHER_NAMES: Record<string, string> = {
  DE: "Germany", FR: "France", ES: "Spain", IT: "Italy", NL: "Netherlands", PT: "Portugal", SE: "Sweden", NO: "Norway",
  DK: "Denmark", FI: "Finland", BE: "Belgium", CH: "Switzerland", AT: "Austria", PL: "Poland", GR: "Greece",
  MY: "Malaysia", PH: "Philippines", ID: "Indonesia", TH: "Thailand", VN: "Vietnam", JP: "Japan", KR: "South Korea",
  HK: "Hong Kong", CN: "China", PK: "Pakistan", BD: "Bangladesh", LK: "Sri Lanka", NP: "Nepal", SA: "Saudi Arabia",
  QA: "Qatar", KW: "Kuwait", IL: "Israel", TR: "Turkey", EG: "Egypt", NG: "Nigeria", KE: "Kenya", GH: "Ghana",
  MX: "Mexico", BR: "Brazil", AR: "Argentina", CL: "Chile", CO: "Colombia", PE: "Peru",
};

/** Every country the forms offer: the detailed ones first, then the rest alphabetically. */
export const countryOptions: { code: string; name: string }[] = [
  ...countries.map((c) => ({ code: c.code, name: c.name })),
  ...Object.entries(OTHER_NAMES)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name)),
];

export function getCountry(code?: string | null): Country {
  const c = (code || "AU").toUpperCase();
  return countries.find((x) => x.code === c) ?? otherCountry(c, OTHER_NAMES[c] ?? c);
}

export function isKnownCountry(code: string) {
  return countryOptions.some((c) => c.code === code.toUpperCase());
}

export function directoriesFor(group: Group, countryCode?: string | null, extra: string[] = []) {
  const c = getCountry(countryCode);
  return [...new Set([...c.directories, ...(c.groupDirectories?.[group] ?? []), ...(c.code === "AU" ? extra : [])])];
}

/* ---------------- Places ---------------- */

export type Place = { area: string; city: string; country: string };

/** Old records have only a suburb: they're Adelaide, Australia. */
export function placeOf(x: { suburb?: string | null; city?: string | null; country?: string | null }): Place {
  const country = (x.country || "AU").toUpperCase();
  const area = (x.suburb ?? "").trim();
  // Forms always send a city; only legacy Australian rows are missing one, and those are all Adelaide.
  const city = (x.city ?? "").trim() || (country === "AU" ? "Adelaide" : area);
  return { area, city, country };
}

/** "Unley, Adelaide" (or just "Adelaide" when the area is the city). */
export function shortPlace(p: Place) {
  if (!p.area || same(p.area, p.city)) return p.city || p.area;
  return p.city ? `${p.area}, ${p.city}` : p.area;
}

/** "Unley, Adelaide, Australia". */
export function longPlace(p: Place) {
  return [shortPlace(p), getCountry(p.country).name].filter(Boolean).join(", ");
}

/** For tables and labels: "Unley, Adelaide" in Australia, "Camden, London, United Kingdom" elsewhere. */
export function placeLabel(x: { suburb?: string | null; city?: string | null; country?: string | null }) {
  const p = placeOf(x);
  return p.country === "AU" ? shortPlace(p) : longPlace(p);
}

/** The smaller place to mention in copy ("in Unley"). Falls back to the city. */
export function nearPlace(p: Place) {
  return p.area || p.city;
}

function same(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/* ---------------- Phones ---------------- */

/** National-format digits, so numbers compare equal however they're written. */
export function normalisePhone(p: string, countryCode?: string | null) {
  const c = getCountry(countryCode);
  let d = p.replace(/[^\d+]/g, "");
  if (c.cc) {
    if (d.startsWith(`+${c.cc}`)) d = c.trunk + d.slice(c.cc.length + 1);
    else if (d.startsWith(`00${c.cc}`)) d = c.trunk + d.slice(c.cc.length + 2);
  }
  d = d.replace(/^\+/, "");
  // North America: drop the leading 1 so 1-415-... and 415-... match.
  if (c.cc === "1" && d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d;
}

export function isPlausiblePhone(d: string, countryCode?: string | null) {
  const c = getCountry(countryCode);
  if (c.code === "AU") return d.length === 10 || (d.length === 6 && d.startsWith("13"));
  if (c.cc === "1") return d.length === 10;
  if (c.phoneLengths) return c.phoneLengths.includes(d.length);
  return d.length >= 7 && d.length <= 13;
}

/** "+61 433 582 444" style, for schema.org. */
export function intlPhone(p: string | undefined, countryCode?: string | null) {
  if (!p) return undefined;
  const c = getCountry(countryCode);
  const d = normalisePhone(p, c.code);
  if (!c.cc) return d;
  const national = c.trunk && d.startsWith(c.trunk) ? d.slice(c.trunk.length) : d;
  return `+${c.cc} ${national}`;
}

export function phonePlaceholder(countryCode?: string | null) {
  const c = getCountry(countryCode);
  return c.cc ? `+${c.cc} XXX XXX XXX` : "[phone, international format]";
}
