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
  }[];
  error?: { message: string };
};

const cache = new Map<string, { at: number; data: LocalListing[] }>();

/**
 * Google Maps results for a search, in Google's own order. This is the local data Gemini and
 * Google's AI answers lean on for "best X in Y" questions. Cached for 15 minutes per query.
 */
export async function searchLocal(query: string, opts: { country?: string; adelaide?: boolean } = {}, max = 10): Promise<LocalListing[]> {
  if (!env.googlePlaces) throw new Error("GOOGLE_PLACES_API_KEY is not set");
  const key = `${opts.country ?? "AU"}|${opts.adelaide ? 1 : 0}|${max}|${query.toLowerCase().trim()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 15 * 60_000) return hit.data;

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": env.googlePlaces,
      "x-goog-fieldmask":
        "places.id,places.displayName,places.websiteUri,places.rating,places.userRatingCount,places.formattedAddress,places.googleMapsUri,places.regularOpeningHours,places.nationalPhoneNumber,places.editorialSummary",
    },
    body: JSON.stringify({
      textQuery: query,
      pageSize: Math.min(max, 20),
      regionCode: opts.country ?? "AU",
      ...(opts.adelaide ? { locationBias: { circle: { center: { latitude: -34.9285, longitude: 138.6007 }, radius: 40000 } } } : {}),
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
  }));
  if (cache.size > 500) cache.clear();
  cache.set(key, { at: Date.now(), data });
  return data;
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
