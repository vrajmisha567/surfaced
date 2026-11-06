import "server-only";
import { env } from "@/lib/env";
import { getCategory } from "@/lib/categories";
import { getCountry, type Place } from "@/lib/locale";
import { sameBusiness } from "@/lib/names";
import { geocodeCity, searchLocal, type LatLng, type LocalListing } from "@/lib/places";
import type { LocalPresence } from "@/lib/types";

/** The search a customer (or you, in front of a client) would type: "best physiotherapist in Adelaide". */
export function mainQuery(categoryId: string, place: Place) {
  return `best ${getCategory(categoryId).label.toLowerCase()} in ${place.city || place.area}`;
}

/** Search radius around each spot. Google treats it as "the searcher is about here". */
export const SEARCH_RADIUS = 4000;

/**
 * Five search spots: the centre plus north, east, south and west, a third of the way to the
 * edge of the city's map bounds. Very large metro bounds are trimmed to about 50 km across so
 * the spots stay in the suburbs people live in.
 */
export function cityGrid(center: LatLng, low: LatLng, high: LatLng): { label: string; at: LatLng }[] {
  const lat = Math.min(high.latitude - low.latitude, 0.45) * 0.33;
  const lng = Math.min(high.longitude - low.longitude, 0.55) * 0.33;
  const p = (dy: number, dx: number) => ({ latitude: center.latitude + dy, longitude: center.longitude + dx });
  return [
    { label: "Centre", at: center },
    { label: "North", at: p(lat, 0) },
    { label: "East", at: p(0, lng) },
    { label: "South", at: p(-lat, 0) },
    { label: "West", at: p(0, -lng) },
  ];
}

export type LocalCheck = { presence: LocalPresence | null; centre: LocalListing[]; error?: string };

/**
 * Where the business ranks on Google Maps for its main search, from five spots across the city,
 * plus from right next to its own address. Maps results depend on where the searcher is: nearly
 * every business ranks #1 near its own address, which is what you see when you search from a
 * client's shop. The spread across the city is the fair measure, so that's what gets scored.
 *
 * About six Places searches per audit (plus one city lookup, cached).
 */
export async function checkLocal(business: { name: string; website: string; category: string }, place: Place): Promise<LocalCheck> {
  if (!env.googlePlaces) return { presence: null, centre: [] };
  const query = mainQuery(business.category, place);
  const country = place.country;
  try {
    const city = await geocodeCity(place.city || place.area, getCountry(country).name, country);
    if (!city) return { presence: null, centre: [], error: "Couldn't find the city on Google Maps." };
    const spots = cityGrid(city.center, city.low, city.high);

    // Full details from the centre (leaders table, matching by website, Gemini's grounding); names only elsewhere.
    const centre = await searchLocal(query, { country, near: { center: city.center, radius: SEARCH_RADIUS } }, 20);
    let listing: LocalListing | undefined = centre.find((l) => sameBusiness(l, business));
    if (!listing) {
      const lookup = `${business.name} ${place.area} ${place.city}`.replace(/\s+/g, " ").trim();
      const direct = await searchLocal(lookup, { country, near: { center: city.center, radius: 30000 } }, 5);
      listing = direct.find((l) => sameBusiness(l, business));
    }
    const isUs = (l: LocalListing) => (listing ? l.id === listing.id : sameBusiness(l, business));
    const rankIn = (results: LocalListing[] | null) => {
      if (!results) return undefined; // couldn't check this spot
      const i = results.findIndex(isUs);
      return i >= 0 ? i + 1 : null; // null = not in the top 20
    };

    const [gridRanks, nearYou] = await Promise.all([
      Promise.all(
        spots.map((s, i) =>
          i === 0 ? Promise.resolve(rankIn(centre)) : searchLocal(query, { country, near: { center: s.at, radius: SEARCH_RADIUS }, lite: true }, 20).then(rankIn, () => undefined),
        ),
      ),
      listing?.location
        ? searchLocal(query, { country, near: { center: listing.location, radius: 2000 }, lite: true }, 20).then(rankIn, () => undefined)
        : Promise.resolve(undefined),
    ]);
    const grid = spots.map((s, i) => ({ label: s.label, rank: gridRanks[i] ?? null, checked: gridRanks[i] !== undefined }));
    const checked = grid.filter((g) => g.checked);

    return {
      centre,
      presence: {
        query,
        rank: gridRanks[0] ?? null,
        found: !!listing,
        name: listing?.name,
        rating: listing?.rating ?? null,
        reviews: listing?.reviews ?? 0,
        hasWebsite: !!listing?.website,
        hasHours: !!listing?.hasHours,
        mapsUrl: listing?.mapsUrl ?? null,
        leaders: centre.slice(0, 3).map((l) => ({ name: l.name, rating: l.rating, reviews: l.reviews })),
        grid,
        top3: checked.filter((g) => g.rank !== null && g.rank <= 3).length,
        spots: checked.length,
        nearYou: nearYou ?? null,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("local presence check failed", msg);
    return { presence: null, centre: [], error: /quota/i.test(msg) ? "Google Maps hit its daily search limit." : "Google Maps couldn't be reached." };
  }
}
