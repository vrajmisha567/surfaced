"use client";

import { useEffect, useState } from "react";
import { categories, categoryGroups, suburbs } from "@/lib/categories";
import { countryOptions, getCountry, groupLabels } from "@/lib/locale";
import { inputCls } from "./ui";

/** Business type: ~90 built-in categories plus "Other", where you type your own. */
export function CategoryPicker({ defaultValue = "plumber", plural = false, className = "" }: { defaultValue?: string; plural?: boolean; className?: string }) {
  const isCustom = defaultValue.startsWith("custom:") || defaultValue === "custom";
  const [value, setValue] = useState(isCustom ? "custom" : defaultValue);
  return (
    <div className={`flex gap-2 ${className}`}>
      <select
        name="category"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={`${inputCls} ${value === "custom" ? "w-1/2" : ""}`}
        aria-label="Business type"
      >
        {categoryGroups.map((g) => (
          <optgroup key={g} label={groupLabels[g]}>
            {categories
              .filter((c) => c.group === g)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {plural ? c.plural : c.label}
                </option>
              ))}
          </optgroup>
        ))}
        <optgroup label="Something else">
          <option value="custom">Other: type your own</option>
        </optgroup>
      </select>
      {value === "custom" && (
        <input
          name="customType"
          required
          maxLength={50}
          autoFocus
          defaultValue={defaultValue.startsWith("custom:") ? defaultValue.slice(7) : ""}
          placeholder="e.g. wedding photographer"
          className={`${inputCls} w-1/2`}
          aria-label="Your type of business"
        />
      )}
    </div>
  );
}

/** Rough country from the browser's time zone, for the public form. Unknown zones keep the default. */
function countryFromTimeZone(): string | null {
  let tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    return null;
  }
  const exact: Record<string, string> = {
    "Pacific/Auckland": "NZ", "Pacific/Chatham": "NZ", "Europe/London": "GB", "Europe/Belfast": "GB", "Europe/Dublin": "IE",
    "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Singapore": "SG", "Asia/Dubai": "AE", "Africa/Johannesburg": "ZA",
  };
  if (exact[tz]) return exact[tz];
  if (tz.startsWith("Australia/")) return "AU";
  const canada = ["Toronto", "Vancouver", "Edmonton", "Winnipeg", "Halifax", "St_Johns", "Regina", "Moncton", "Whitehorse", "Iqaluit", "Yellowknife", "Montreal"];
  if (tz.startsWith("Canada/") || canada.some((c) => tz === `America/${c}`)) return "CA";
  const usa = ["New_York", "Chicago", "Denver", "Los_Angeles", "Phoenix", "Anchorage", "Detroit", "Boise", "Indiana/Indianapolis", "Kentucky/Louisville"];
  if (tz.startsWith("US/") || tz === "Pacific/Honolulu" || usa.some((c) => tz === `America/${c}`)) return "US";
  return null;
}

/**
 * Suburb or neighbourhood, city and country.
 * The admin forms default to Adelaide, Australia; the public audit form passes `guessCountry`
 * and starts with an empty city in the visitor's likely country.
 */
export function LocationFields({
  defaults = {},
  areaRequired = false,
  guessCountry = false,
}: {
  defaults?: { suburb?: string; city?: string; country?: string };
  areaRequired?: boolean;
  guessCountry?: boolean;
}) {
  const [country, setCountry] = useState((defaults.country ?? "AU").toUpperCase());
  const [city, setCity] = useState(defaults.city ?? (country === "AU" && !guessCountry ? "Adelaide" : ""));
  useEffect(() => {
    if (!guessCountry || defaults.country) return;
    const guess = countryFromTimeZone();
    // Reading the time zone only works in the browser, so this runs once after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (guess) setCountry(guess);
  }, [guessCountry, defaults.country]);
  const c = getCountry(country);
  const areaLabel = c.areaWord === "suburb" ? "Suburb" : c.areaWord === "neighbourhood" ? "Neighbourhood" : "Area";
  const example = country === "AU" && city.toLowerCase() === "adelaide" ? "Norwood" : c.areaWord === "neighbourhood" ? "Brooklyn" : "Camden";
  return (
    <>
      <input
        name="suburb"
        required={areaRequired}
        list={city.toLowerCase() === "adelaide" ? "adelaide-suburbs" : undefined}
        placeholder={areaRequired ? `${areaLabel}, e.g. ${example}` : `${areaLabel} (optional)`}
        defaultValue={defaults.suburb}
        className={inputCls}
        aria-label={areaLabel}
      />
      {city.toLowerCase() === "adelaide" && (
        <datalist id="adelaide-suburbs">
          {suburbs.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
      <input
        name="city"
        required
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="City or town"
        className={inputCls}
        aria-label="City or town"
      />
      <select
        name="country"
        value={country}
        onChange={(e) => {
          const next = e.target.value;
          setCountry(next);
          // Don't leave "Adelaide" sitting in the box after switching to, say, the UK.
          if (next !== "AU" && city.toLowerCase() === "adelaide") setCity("");
          if (next === "AU" && !city && !guessCountry) setCity("Adelaide");
        }}
        className={inputCls}
        aria-label="Country"
      >
        {countryOptions.map((o) => (
          <option key={o.code} value={o.code}>
            {o.name}
          </option>
        ))}
      </select>
    </>
  );
}
