import "server-only";
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

const cache = new Map<string, { at: number; data: LocalListing[] }>();

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
 * Cached for 15 minutes per query and point.
 */
export async function searchLocal(query: string, opts: { country?: string; near?: Near; lite?: boolean } = {}, max = 10): Promise<LocalListing[]> {
  if (!env.googlePlaces) throw new Error("GOOGLE_PLACES_API_KEY is not set");
  const at = opts.near ? `${opts.near.center.latitude.toFixed(3)},${opts.near.center.longitude.toFixed(3)},${opts.near.radius}` : "-";
  const key = `${opts.country ?? "AU"}|${at}|${opts.lite ? "lite" : "full"}|${max}|${query.toLowerCase().trim()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 15 * 60_000) return hit.data;

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.googlePlaces, "x-goog-fieldmask": opts.lite ? LITE_FIELDS : FULL_FIELDS },
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
  if (cache.size > 500) cache.clear();
  cache.set(key, { at: Date.now(), data });
  return data;
}

const cityCache = new Map<string, { center: LatLng; low: LatLng; high: LatLng } | null>();

/** A city's centre and map bounds, e.g. "Adelaide, Australia". Cached for the life of the server. */
export async function geocodeCity(city: string, countryName: string, country: string) {
  const key = `${country}|${city.toLowerCase()}`;
  if (cityCache.has(key)) return cityCache.get(key)!;
  if (!env.googlePlaces) return null;
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
  if (out) cityCache.set(key, out); // don't remember failures: the next audit can retry
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
