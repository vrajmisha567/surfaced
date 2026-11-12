import "server-only";
import { dataforseoEnabled, dfsMapsSearch } from "@/lib/ai/dataforseo";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export type PlaceResult = {
  place_id: string;
  name: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  suburb: string | null;
  rating: number | null;
  review_count: number | null;
};

type PlacesResponse = {
  places?: {
    id: string;
    displayName?: { text: string };
    websiteUri?: string;
    nationalPhoneNumber?: string;
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
    addressComponents?: { longText: string; types: string[] }[];
  }[];
  error?: { message: string };
};

/* ---------------- Local search, for audits ---------------- */

export type LocalListing = {
  id: string;
  name: string;
  website: string | null;
  rating: number | null;
  reviews: number;
  address: string | null;
  mapsUrl: string | null;
  hasHours: boolean;
  phone: string | null;
  summary: string | null;
  location?: { latitude: number; longitude: number } | null;
};

type LocalResponse = {
  places?: {
    id: string;
    displayName?: { text: string };
    websiteUri?: string;
    rating?: number;
    userRatingCount?: number;
    formattedAddress?: string;
    googleMapsUri?: string;
    regularOpeningHours?: unknown;
    nationalPhoneNumber?: string;
    editorialSummary?: { text?: string };
    location?: { latitude: number; longitude: number };
  }[];
  error?: { message: string };
};

const DAY = 86_400_000;
/** Maps rankings move slowly; audits of the same trade in the same city share searches for a day. */
const SEARCH_TTL = DAY;
const CITY_TTL = 30 * DAY;

const memory = new Map<string, { at: number; data: unknown }>();

/**
 * This server's memory first, then the shared Supabase cache, then the paid call.
 * Serverless instances come and go, so the shared layer is what saves most calls:
 * auditing 20 plumbers in one city reuses the same 5-spot grid searches.
 * Nothing is cached when the call throws or returns null.
 */
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const m = memory.get(key);
  if (m && Date.now() - m.at < ttlMs) return m.data as T;
  const shared = await db.cache.get<T>(key, ttlMs);
  if (shared != null) {
    remember(key, shared);
    return shared;
  }
  const data = await load();
  if (data != null) {
    remember(key, data);
    await db.cache.set(key, data);
  }
  return data;
}

function remember(key: string, data: unknown) {
  if (memory.size > 500) memory.clear();
  memory.set(key, { at: Date.now(), data });
}

export type LatLng = { latitude: number; longitude: number };
/** Search as if standing here. Google Maps ranks local results by where the searcher is. */
export type Near = { center: LatLng; radius: number };

const FULL_FIELDS =
  "places.id,places.displayName,places.websiteUri,places.rating,places.userRatingCount,places.formattedAddress,places.googleMapsUri,places.regularOpeningHours,places.nationalPhoneNumber,places.editorialSummary,places.location";
/** Ranking only needs ids and names: a cheaper Places tier. */
const LITE_FIELDS = "places.id,places.displayName";

/**
 * Google Maps results for a search, in Google's own order. Pass `near` to search from a point:
 * without it, Google uses the server's own location, which for Vercel is Sydney.
 * Cached for 24 hours per query and point, shared across servers.
 */
export async function searchLocal(query: string, opts: { country?: string; near?: Near; lite?: boolean } = {}, max = 10): Promise<LocalListing[]> {
  // With DataForSEO, Maps rankings come from a real Google Maps search at that point.
  if (opts.near && dataforseoEnabled() && process.env.DATAFORSEO_MAPS !== "off") {
    const near = opts.near;
    const key = `maps:dfs|${near.center.latitude.toFixed(3)},${near.center.longitude.toFixed(3)}|${max}|${query.toLowerCase().trim()}`;
    return cached(key, SEARCH_TTL, () => dfsMapsSearch(query, near.center, max));
  }
  if (!env.googlePlaces) throw new Error("GOOGLE_PLACES_API_KEY is not set");
  const at = opts.near ? `${opts.near.center.latitude.toFixed(3)},${opts.near.center.longitude.toFixed(3)},${opts.near.radius}` : "-";
  const key = `maps:places|${opts.country ?? "AU"}|${at}|${opts.lite ? "lite" : "full"}|${max}|${query.toLowerCase().trim()}`;
  return cached(key, SEARCH_TTL, () => placesTextSearch(query, opts, max));
}

async function placesTextSearch(query: string, opts: { country?: string; near?: Near; lite?: boolean }, max: number): Promise<LocalListing[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.googlePlaces!, "x-goog-fieldmask": opts.lite ? LITE_FIELDS : FULL_FIELDS },
    body: JSON.stringify({
      textQuery: query,
      pageSize: Math.min(max, 20),
      regionCode: opts.country ?? "AU",
      ...(opts.near ? { locationBias: { circle: opts.near } } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as LocalResponse;
  if (!res.ok) throw new Error(json.error?.message ?? `Places error ${res.status}`);
  const data = (json.places ?? []).map((p) => ({
    id: p.id,
    name: p.displayName?.text ?? "Unknown",
    website: p.websiteUri ?? null,
    rating: p.rating ?? null,
    reviews: p.userRatingCount ?? 0,
    address: p.formattedAddress ?? null,
    mapsUrl: p.googleMapsUri ?? null,
    hasHours: !!p.regularOpeningHours,
    phone: p.nationalPhoneNumber ?? null,
    summary: p.editorialSummary?.text ?? null,
    location: p.location ?? null,
  }));
  return data;
}

const cityCache = new Map<string, { center: LatLng; low: LatLng; high: LatLng } | null>();

/** A city's centre and map bounds, e.g. "Adelaide, Australia". Cached for 30 days, shared across servers. */
export async function geocodeCity(city: string, countryName: string, country: string) {
  const key = `${country}|${city.toLowerCase()}`;
  if (cityCache.has(key)) return cityCache.get(key)!;
  if (!env.googlePlaces) return null;
  const shared = await db.cache.get<{ center: LatLng; low: LatLng; high: LatLng }>(`city|${key}`, CITY_TTL);
  if (shared) {
    cityCache.set(key, shared);
    return shared;
  }
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.googlePlaces, "x-goog-fieldmask": "places.location,places.viewport" },
    body: JSON.stringify({ textQuery: `${city}, ${countryName}`, pageSize: 1, regionCode: country }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as { places?: { location?: LatLng; viewport?: { low: LatLng; high: LatLng } }[]; error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Places error ${res.status}`);
  const p = json.places?.[0];
  const out = p?.location && p.viewport ? { center: p.location, low: p.viewport.low, high: p.viewport.high } : null;
  if (out) {
    // Don't remember failures: the next audit can retry.
    cityCache.set(key, out);
    await db.cache.set(`city|${key}`, out);
  }
  return out;
}

/**
 * Google Places API (New) Text Search. The query carries the city; regionCode keeps
 * results in the right country, and Adelaide searches also get a map bias.
 */
export async function searchPlaces(query: string, opts: { country?: string; adelaide?: boolean } = {}, max = 20): Promise<PlaceResult[]> {
  if (!env.googlePlaces) throw new Error("GOOGLE_PLACES_API_KEY is not set");
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": env.googlePlaces,
      "x-goog-fieldmask":
        "places.id,places.displayName,places.websiteUri,places.nationalPhoneNumber,places.formattedAddress,places.rating,places.userRatingCount,places.addressComponents",
    },
    body: JSON.stringify({
      textQuery: query,
      pageSize: Math.min(max, 20),
      regionCode: opts.country ?? "AU",
      ...(opts.adelaide ? { locationBias: { circle: { center: { latitude: -34.9285, longitude: 138.6007 }, radius: 40000 } } } : {}),
    }),
    cache: "no-store",
  });
  const json = (await res.json()) as PlacesResponse;
  if (!res.ok) throw new Error(json.error?.message ?? `Places error ${res.status}`);
  return (json.places ?? []).map((p) => ({
    place_id: p.id,
    name: p.displayName?.text ?? "Unknown",
    website: p.websiteUri ?? null,
    phone: p.nationalPhoneNumber ?? null,
    address: p.formattedAddress ?? null,
    // In Australia "locality" is the suburb; elsewhere it's the city, and the area is a neighbourhood or sublocality.
    suburb:
      (opts.country && opts.country !== "AU"
        ? p.addressComponents?.find((c) => c.types.includes("neighborhood") || c.types.includes("sublocality"))?.longText
        : undefined) ??
      p.addressComponents?.find((c) => c.types.includes("locality"))?.longText ??
      null,
    rating: p.rating ?? null,
    review_count: p.userRatingCount ?? null,
  }));
}
