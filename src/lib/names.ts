/** Name and domain matching shared by the AI checks and the Google Maps checks. */

const STOP = new Set(["pty", "ltd", "limited", "llc", "inc", "the", "co", "company", "group", "services", "service", "sa", "adelaide", "australia", "and", "of"]);

export function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function coreName(name: string) {
  return norm(name)
    .split(" ")
    .filter((w) => !STOP.has(w))
    .join(" ");
}

/** "https://www.kineticrp.com.au/about?x=1" -> "kineticrp.com.au". */
export function hostOf(url: string | null | undefined) {
  if (!url) return null;
  try {
    return new URL(/^https?:/i.test(url) ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Close variants of the same name: "Camden High Dental Practice" for "Camden High Street Dental Practice".
 * Word overlap (Jaccard) of at least 0.7 with 3+ shared words, so short names ("Plumbing Doctor" vs
 * "Doctor Plumbing") never fuzzy-match: a false match would overstate a client's visibility.
 */
export function similarName(a: string, b: string) {
  const words = (s: string) => new Set(norm(s).split(" ").filter((w) => w && !STOP.has(w)));
  const A = words(a);
  const B = words(b);
  const shared = [...A].filter((w) => B.has(w)).length;
  const union = new Set([...A, ...B]).size;
  return shared >= 3 && shared / union >= 0.7;
}

/**
 * Is this listing the same business? Same website host is decisive. Otherwise one name must
 * contain the other's core ("Kinetic Rehabilitation" in "Kinetic Rehabilitation + Performance"),
 * or the names must be close variants.
 */
export function sameBusiness(listing: { name: string; website?: string | null }, business: { name: string; website?: string | null }) {
  const h1 = hostOf(listing.website);
  const h2 = hostOf(business.website);
  if (h1 && h2 && h1 === h2) return true;
  const a = ` ${coreName(listing.name)} `;
  const b = ` ${coreName(business.name)} `;
  if (b.trim().length >= 5 && a.includes(b)) return true;
  if (a.trim().length >= 5 && b.includes(a)) return true;
  return similarName(listing.name, business.name);
}
