import "server-only";
import { env } from "@/lib/env";
import { getCategory } from "@/lib/categories";
import type { Place } from "@/lib/locale";
import { sameBusiness } from "@/lib/names";
import { searchLocal, type LocalListing } from "@/lib/places";
import type { LocalPresence } from "@/lib/types";

/** The search a customer (or you, in front of a client) would type: "best physiotherapist in Adelaide". */
export function mainQuery(categoryId: string, place: Place) {
  return `best ${getCategory(categoryId).label.toLowerCase()} in ${place.city || place.area}`;
}

/**
 * Where the business ranks on Google Maps for its main search, plus its rating and reviews.
 * Two Places calls at most: the ranking search, then a name lookup if it isn't in the top 20.
 */
export async function checkLocal(business: { name: string; website: string; category: string }, place: Place): Promise<LocalPresence | null> {
  if (!env.googlePlaces) return null;
  const query = mainQuery(business.category, place);
  // No map bias: a CBD-centred bias reorders results away from what a person searching the city sees.
  const opts = { country: place.country };
  try {
    const results = await searchLocal(query, opts, 20);
    const idx = results.findIndex((l) => sameBusiness(l, business));
    let listing: LocalListing | undefined = idx >= 0 ? results[idx] : undefined;
    if (!listing) {
      const direct = await searchLocal(`${business.name} ${place.area || ""} ${place.city}`.replace(/\s+/g, " "), opts, 5);
      listing = direct.find((l) => sameBusiness(l, business));
    }
    return {
      query,
      rank: idx >= 0 ? idx + 1 : null,
      found: !!listing,
      name: listing?.name,
      rating: listing?.rating ?? null,
      reviews: listing?.reviews ?? 0,
      hasWebsite: !!listing?.website,
      hasHours: !!listing?.hasHours,
      mapsUrl: listing?.mapsUrl ?? null,
      leaders: results.slice(0, 3).map((l) => ({ name: l.name, rating: l.rating, reviews: l.reviews })),
    };
  } catch (e) {
    console.error("local presence check failed", e);
    return null;
  }
}
