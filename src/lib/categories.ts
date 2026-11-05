/**
 * Business categories Surfaced targets, one niche at a time.
 * Each carries the questions locals actually type into AI assistants,
 * the schema.org type to use, and the Australian directories that matter.
 */

export type Category = {
  id: string;
  label: string;
  plural: string;
  group: "Trades" | "Health" | "Food" | "Beauty" | "Auto" | "Services";
  schemaType: string;
  /** {suburb} and {city} are substituted. */
  prompts: string[];
  faqs: string[];
  directories: string[];
};

const coreDirectories = [
  "Google Business Profile",
  "Apple Business Connect",
  "Bing Places for Business",
  "Facebook Page",
  "Yelp Australia",
  "Yellow Pages Australia",
  "True Local",
  "Localsearch",
  "Hotfrog Australia",
  "StartLocal",
  "Brownbook",
  "Cylex Australia",
];

const tradeDirectories = [
  "hipages",
  "Oneflare",
  "ServiceSeeking",
  "Airtasker (business profile)",
  "Word of Mouth",
  "Master Builders SA / trade association listing",
];

function trade(id: string, label: string, plural: string, schemaType: string, extraPrompts: string[], faqs: string[]): Category {
  return {
    id,
    label,
    plural,
    group: "Trades",
    schemaType,
    prompts: [
      `Who is the best ${label.toLowerCase()} in {suburb}, {city}?`,
      `Recommend a reliable ${label.toLowerCase()} near {suburb} SA`,
      `Which ${plural.toLowerCase()} in {city} have the best reviews?`,
      ...extraPrompts,
    ],
    faqs,
    directories: [...coreDirectories, ...tradeDirectories],
  };
}

export const categories: Category[] = [
  trade("plumber", "Plumber", "Plumbers", "Plumber", [
    "I need an emergency plumber in {suburb} tonight, who should I call?",
    "Who can fix a burst hot water system in {city} quickly?",
  ], [
    "Do you offer 24/7 emergency plumbing in {suburb}?",
    "How much does a plumber cost per hour in {city}?",
    "Can you replace a hot water system on the same day?",
    "Are you licensed and insured in South Australia?",
    "Which suburbs do you service?",
  ]),
  trade("electrician", "Electrician", "Electricians", "Electrician", [
    "Who is a good electrician for a switchboard upgrade in {city}?",
    "Emergency electrician near {suburb} SA",
  ], [
    "Do you do switchboard upgrades in {suburb}?",
    "How much does an electrician charge in {city}?",
    "Can you install EV chargers at home?",
    "Are you a licensed electrical contractor in SA?",
    "Do you offer after-hours call-outs?",
  ]),
  trade("roofer", "Roofer", "Roofers", "RoofingContractor", [
    "Who does roof restorations in {city} at a fair price?",
  ], [
    "How much does a roof restoration cost in {city}?",
    "Do you repair storm-damaged roofs in {suburb}?",
    "Do you offer free roof inspections?",
    "How long does a re-roof take?",
  ]),
  trade("hvac", "Air conditioning installer", "Air conditioning installers", "HVACBusiness", [
    "Best place to get split system air con installed in {city}",
    "Who services ducted reverse cycle air conditioning near {suburb}?",
  ], [
    "How much does split system installation cost in {city}?",
    "Do you service and repair all air conditioner brands?",
    "How quickly can you install before summer?",
    "Do you install ducted systems in older homes?",
  ]),
  trade("builder", "Builder", "Builders", "GeneralContractor", [
    "Who are the best renovation builders in {city}?",
  ], [
    "Do you do home extensions in {suburb}?",
    "How much does a renovation cost per square metre in {city}?",
    "Are you registered with Consumer and Business Services SA?",
  ]),
  trade("landscaper", "Landscaper", "Landscapers", "HomeAndConstructionBusiness", [
    "Who does garden design and landscaping in {suburb}?",
  ], [
    "How much does landscaping cost in {city}?",
    "Do you design low-water gardens for Adelaide summers?",
    "Do you build retaining walls and paving?",
  ]),
  {
    id: "dentist",
    label: "Dentist",
    plural: "Dentists",
    group: "Health",
    schemaType: "Dentist",
    prompts: [
      "Who is the best dentist in {suburb}, {city}?",
      "Recommend a gentle dentist in {city} for nervous patients",
      "Emergency dentist open on weekends near {suburb}",
      "Which dental clinics in {city} bulk bill or accept my health fund?",
    ],
    faqs: [
      "Do you accept HICAPS and private health funds?",
      "Do you offer emergency appointments in {suburb}?",
      "How much is a check-up and clean?",
      "Do you treat children and the Child Dental Benefits Schedule?",
      "Is there parking near the clinic?",
    ],
    directories: [...coreDirectories, "HealthEngine", "HotDoc", "Healthdirect Service Finder", "Whitecoat"],
  },
  {
    id: "physio",
    label: "Physiotherapist",
    plural: "Physiotherapists",
    group: "Health",
    schemaType: "Physiotherapy",
    prompts: [
      "Who is the best physio in {suburb}, {city}?",
      "Recommend a sports physio in {city}",
      "Physio for back pain near {suburb} SA",
    ],
    faqs: [
      "Do I need a referral to see a physio?",
      "Do you accept private health insurance on the spot?",
      "Do you treat sports injuries and post-surgery rehab?",
      "How long is an initial consultation?",
    ],
    directories: [...coreDirectories, "HealthEngine", "HotDoc", "Healthdirect Service Finder", "Whitecoat"],
  },
  {
    id: "cafe",
    label: "Cafe",
    plural: "Cafes",
    group: "Food",
    schemaType: "CafeOrCoffeeShop",
    prompts: [
      "Best cafe in {suburb} for breakfast",
      "Where can I get good coffee in {suburb}, {city}?",
      "Dog-friendly cafes near {suburb} SA",
    ],
    faqs: [
      "What are your opening hours?",
      "Do you have vegan and gluten-free options?",
      "Are dogs welcome?",
      "Do you take bookings for groups?",
    ],
    directories: [...coreDirectories, "TripAdvisor", "Zomato", "Broadsheet (if eligible)", "Uber Eats / DoorDash listing"],
  },
  {
    id: "salon",
    label: "Hair salon",
    plural: "Hair salons",
    group: "Beauty",
    schemaType: "HairSalon",
    prompts: [
      "Best hair salon in {suburb}, {city}",
      "Who does the best balayage in {city}?",
      "Recommend a hairdresser near {suburb} SA",
    ],
    faqs: [
      "How do I book an appointment?",
      "How much is a cut and colour?",
      "Do you take walk-ins?",
      "Which products do you use?",
    ],
    directories: [...coreDirectories, "Fresha", "Timely", "Bookwell"],
  },
  {
    id: "beauty",
    label: "Beauty clinic",
    plural: "Beauty clinics",
    group: "Beauty",
    schemaType: "BeautySalon",
    prompts: [
      "Best beauty salon in {suburb}, {city}",
      "Where can I get lash extensions near {suburb}?",
    ],
    faqs: ["How do I book?", "What treatments do you offer?", "Do you offer packages?"],
    directories: [...coreDirectories, "Fresha", "Timely", "Bookwell"],
  },
  {
    id: "mechanic",
    label: "Mechanic",
    plural: "Mechanics",
    group: "Auto",
    schemaType: "AutoRepair",
    prompts: [
      "Who is an honest mechanic in {suburb}, {city}?",
      "Best place for a logbook service in {city}",
      "Mechanic near {suburb} SA that does European cars",
    ],
    faqs: [
      "Do you do logbook servicing without voiding warranty?",
      "How much is a standard service?",
      "Do you offer a loan car or pick-up?",
    ],
    directories: [...coreDirectories, "MyMechanic", "Carsguide service finder", "RAA Approved Repairer (if eligible)"],
  },
  {
    id: "accountant",
    label: "Accountant",
    plural: "Accountants",
    group: "Services",
    schemaType: "AccountingService",
    prompts: [
      "Recommend a small business accountant in {city}",
      "Who is a good tax accountant near {suburb}?",
    ],
    faqs: ["How much does a tax return cost?", "Do you work with sole traders?", "Do you offer fixed-fee packages?"],
    directories: [...coreDirectories, "CPA Australia Find a CPA", "CA ANZ Find a CA"],
  },
];

export function getCategory(id: string): Category {
  return categories.find((c) => c.id === id) ?? categories[0];
}

export function fillTemplate(t: string, suburb: string, city = "Adelaide") {
  return t.replaceAll("{suburb}", suburb || city).replaceAll("{city}", city);
}

export function promptsFor(categoryId: string, suburb: string, limit = 4) {
  return getCategory(categoryId).prompts.slice(0, limit).map((p) => fillTemplate(p, suburb));
}

export const suburbs = [
  "Adelaide CBD", "North Adelaide", "Norwood", "Kent Town", "Unley", "Parkside", "Glenelg", "Brighton",
  "Henley Beach", "Semaphore", "Port Adelaide", "Prospect", "Walkerville", "Burnside", "Magill", "Campbelltown",
  "Mitcham", "Blackwood", "Marion", "Morphett Vale", "Noarlunga", "Aldinga", "Mount Barker", "Stirling",
  "Modbury", "Tea Tree Gully", "Golden Grove", "Mawson Lakes", "Salisbury", "Elizabeth", "Gawler",
  "West Lakes", "Findon", "Torrensville", "Mile End", "Goodwood", "Hyde Park", "Payneham", "St Peters",
];
