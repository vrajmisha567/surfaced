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
