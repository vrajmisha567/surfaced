/**
 * Business categories. Each carries the questions people actually type into AI
 * assistants, the schema.org type to use, and FAQs worth answering on the site.
 * Prompts and FAQs use {suburb} and {city}, filled from the business's location.
 * Anything not listed can be audited as a custom type ("custom:wedding photographer").
 */
import { directoriesFor, type Group, type Place } from "./locale";

export type Category = {
  id: string;
  label: string;
  plural: string;
  group: Group;
  schemaType: string;
  prompts: string[];
  faqs: string[];
  /** Extra Australia-only prompts, FAQs and directories (health funds, licensing bodies...). */
  auPrompts?: string[];
  auFaqs?: string[];
  auDirectories?: string[];
  custom?: boolean;
};

type Opts = {
  /** How people say it in a sentence, if not the lowercased label (e.g. "GP"). */
  say?: string;
  sayPlural?: string;
  prompts?: string[];
  faqs?: string[];
  auPrompts?: string[];
  auFaqs?: string[];
  auDirectories?: string[];
};

/** The three questions every audit asks, phrased the way people ask about that kind of business. */
function basePrompts(group: Group, s: string, sp: string): string[] {
  const reviews = `Which ${sp} in {city} have the best reviews?`;
  switch (group) {
    case "Trades":
    case "Home":
    case "Other":
      return [`Who is the best ${s} in {city}?`, `Recommend a reliable ${s} near {suburb}, {city}`, reviews];
    case "Health":
      return [`Who is the best ${s} in {city}?`, `Recommend a ${s} near {suburb}, {city} that's taking new patients`, reviews];
    case "Auto":
      return [`Who is the best ${s} in {city}?`, `Recommend an honest ${s} near {suburb}, {city}`, reviews];
    case "Professional":
      return [`Who is the best ${s} in {city}?`, `Recommend a good ${s} near {suburb}, {city}`, reviews];
    default:
      return [`Best ${s} in {city}`, `Recommend a good ${s} near {suburb}, {city}`, reviews];
  }
}

function baseFaqs(group: Group, s: string): string[] {
  switch (group) {
    case "Trades":
    case "Home":
      return [`How much does a ${s} cost in {city}?`, "Which areas do you service?", "Do you offer free quotes?", "Are you licensed and insured?", "How soon can you start?"];
    case "Health":
      return ["Do I need a referral?", "Do you accept my health insurance?", "How long is a first appointment?", "Can I get a same-day appointment?", "Is there parking nearby?"];
    case "Food":
      return ["What are your opening hours?", "Do you take bookings?", "Do you have vegetarian, vegan and gluten-free options?", "Do you do takeaway or delivery?", "Is there parking nearby?"];
    case "Beauty":
      return ["How do I book an appointment?", "What are your prices?", "Do you take walk-ins?", "Which products do you use?", "What is your cancellation policy?"];
    case "Fitness":
      return ["How much is a membership?", "Do you offer a free trial?", "What are your opening hours?", "Is it suitable for beginners?", "Is there parking nearby?"];
    case "Auto":
      return ["How much is a standard service?", "Do you work on all makes and models?", "How long will my car take?", "Do you offer a loan car or pick-up?"];
    case "Professional":
      return ["How much do you charge?", "Do you offer a free first consultation?", "Do you work with small businesses?", "Can we meet online?", "Which areas do you cover?"];
    case "Pets":
      return ["What are your prices?", "Do you handle anxious or reactive pets?", "What are your opening hours?", "Do I need to book ahead?", "Which vaccinations do you require?"];
    case "Education":
      return ["What ages do you teach?", "How much are your fees?", "Do you offer a trial session?", "Where are classes held?", "Are your staff qualified and background-checked?"];
    case "Events":
      return ["How far ahead should I book?", "What's included in your packages?", "How much does it cost?", "Do you travel?", "Can I see examples of your work?"];
    case "Retail":
      return ["What are your opening hours?", "Do you deliver or ship?", "Do you offer click and collect?", "What is your returns policy?", "Is there parking nearby?"];
    case "Other":
      return [`How much does a ${s} cost in {city}?`, "Which areas do you cover?", "How do I book or get a quote?", "What are your opening hours?"];
  }
}

function def(id: string, label: string, plural: string, group: Group, schemaType: string, o: Opts = {}): Category {
  const s = o.say ?? label.toLowerCase();
  const sp = o.sayPlural ?? plural.toLowerCase();
  return {
    id,
    label,
    plural,
    group,
    schemaType,
    prompts: [...basePrompts(group, s, sp), ...(o.prompts ?? [])],
    faqs: [...new Set([...(o.faqs ?? []), ...baseFaqs(group, s)])].slice(0, 6),
    auPrompts: o.auPrompts,
    auFaqs: o.auFaqs,
    auDirectories: o.auDirectories,
  };
}

export const categories: Category[] = [
  /* Trades & construction */
  def("plumber", "Plumber", "Plumbers", "Trades", "Plumber", {
    prompts: ["I need an emergency plumber in {suburb} tonight, who should I call?", "Who can fix a burst hot water system in {city} quickly?"],
    faqs: ["Do you offer 24/7 emergency plumbing in {suburb}?", "How much does a plumber cost per hour in {city}?", "Can you replace a hot water system on the same day?"],
  }),
  def("electrician", "Electrician", "Electricians", "Trades", "Electrician", {
    prompts: ["Who is a good electrician for a switchboard upgrade in {city}?", "Emergency electrician near {suburb}"],
    faqs: ["Do you do switchboard upgrades in {suburb}?", "Can you install EV chargers at home?", "Do you offer after-hours call-outs?"],
  }),
  def("roofer", "Roofer", "Roofers", "Trades", "RoofingContractor", {
    prompts: ["Who does roof restorations in {city} at a fair price?"],
    faqs: ["How much does a roof restoration cost in {city}?", "Do you repair storm-damaged roofs in {suburb}?", "Do you offer free roof inspections?"],
  }),
  def("hvac", "Air conditioning installer", "Air conditioning installers", "Trades", "HVACBusiness", {
    say: "air conditioning installer",
    prompts: ["Best place to get split system air con installed in {city}", "Who services ducted air conditioning near {suburb}?"],
    faqs: ["How much does split system installation cost in {city}?", "Do you service and repair all air conditioner brands?", "How quickly can you install before summer?"],
  }),
  def("builder", "Builder", "Builders", "Trades", "GeneralContractor", {
    prompts: ["Who are the best renovation builders in {city}?"],
    faqs: ["Do you do home extensions in {suburb}?", "How much does a renovation cost per square metre in {city}?"],
    auFaqs: ["Are you a registered building work contractor in your state?"],
  }),
  def("landscaper", "Landscaper", "Landscapers", "Trades", "HomeAndConstructionBusiness", {
    prompts: ["Who does garden design and landscaping in {suburb}?"],
    faqs: ["How much does landscaping cost in {city}?", "Do you design low-water gardens?", "Do you build retaining walls and paving?"],
  }),
  def("painter", "Painter", "Painters", "Trades", "HousePainter", { say: "house painter", sayPlural: "house painters", faqs: ["How much does it cost to paint a house in {city}?", "Do you do interior and exterior painting?"] }),
  def("locksmith", "Locksmith", "Locksmiths", "Trades", "Locksmith", { prompts: ["I'm locked out in {suburb}, which locksmith can come now?"], faqs: ["Do you offer 24/7 lockout service?", "How much is an emergency call-out?"] }),
  def("carpenter", "Carpenter", "Carpenters", "Trades", "GeneralContractor", { faqs: ["Do you build decks and pergolas?", "Do you do custom joinery?"] }),
  def("tiler", "Tiler", "Tilers", "Trades", "HomeAndConstructionBusiness", { faqs: ["How much does bathroom tiling cost in {city}?", "Do you waterproof before tiling?"] }),
  def("concreter", "Concreter", "Concreters", "Trades", "HomeAndConstructionBusiness", { faqs: ["How much does a concrete driveway cost in {city}?", "Do you do exposed aggregate?"] }),
  def("solar", "Solar installer", "Solar installers", "Trades", "HomeAndConstructionBusiness", {
    prompts: ["Who is the most trusted solar installer in {city}?"],
    faqs: ["How much does a solar system cost in {city}?", "Do you install home batteries?", "Which panel and inverter brands do you use?"],
    auFaqs: ["Are you a Solar Accreditation Australia (SAA) accredited installer?"],
  }),
  def("handyman", "Handyman", "Handymen", "Trades", "HomeAndConstructionBusiness", { faqs: ["What jobs do you take on?", "Do you charge by the hour or by the job?"] }),
  def("pool", "Pool builder", "Pool builders", "Trades", "HomeAndConstructionBusiness", { faqs: ["How much does an inground pool cost in {city}?", "How long does a pool build take?"] }),

  /* Home services */
  def("cleaner", "House cleaner", "House cleaners", "Home", "HomeAndConstructionBusiness", {
    prompts: ["Who does the best end-of-lease cleaning in {city}?"],
    faqs: ["How much does a regular clean cost in {city}?", "Do you bring your own products and equipment?", "Are your cleaners insured and police-checked?"],
  }),
  def("carpet-cleaner", "Carpet cleaner", "Carpet cleaners", "Home", "HomeAndConstructionBusiness", { faqs: ["How long does carpet take to dry?", "Do you remove pet stains and odours?"] }),
  def("pest-control", "Pest control company", "Pest control companies", "Home", "HomeAndConstructionBusiness", {
    say: "pest control company",
    prompts: ["Who should I call for termites in {city}?"],
    faqs: ["Are your treatments safe for kids and pets?", "Do you offer termite inspections?"],
  }),
  def("removalist", "Removalist", "Removalists", "Home", "MovingCompany", {
    faqs: ["How much does it cost to move a house in {city}?", "Do you do interstate moves?", "Do you supply boxes and packing?"],
  }),
  def("gardener", "Gardener", "Gardeners", "Home", "HomeAndConstructionBusiness", { say: "gardener or lawn mowing service", faqs: ["How often should I book lawn mowing?", "Do you take away green waste?"] }),
  def("window-cleaner", "Window cleaner", "Window cleaners", "Home", "HomeAndConstructionBusiness", { faqs: ["Do you clean high and second-storey windows?"] }),
  def("interior-designer", "Interior designer", "Interior designers", "Home", "ProfessionalService", { faqs: ["How do your design fees work?", "Do you work on single rooms?"] }),

  /* Health */
  def("dentist", "Dentist", "Dentists", "Health", "Dentist", {
    prompts: ["Recommend a gentle dentist in {city} for nervous patients", "Emergency dentist open on weekends near {suburb}"],
    faqs: ["Do you offer emergency appointments?", "How much is a check-up and clean?", "Do you treat children?"],
    auPrompts: ["Which dental clinics in {city} accept my health fund?"],
    auFaqs: ["Do you accept HICAPS and private health funds?", "Do you accept the Child Dental Benefits Schedule?"],
  }),
  def("physio", "Physiotherapist", "Physiotherapists", "Health", "Physiotherapy", {
    say: "physio",
    sayPlural: "physios",
    prompts: ["Recommend a sports physio in {city}", "Physio for back pain near {suburb}"],
    faqs: ["Do I need a referral to see a physio?", "Do you treat sports injuries and post-surgery rehab?"],
  }),
  def("chiropractor", "Chiropractor", "Chiropractors", "Health", "MedicalBusiness", { faqs: ["What happens at a first appointment?", "Do you treat headaches and back pain?"] }),
  def("gp", "GP clinic", "GP clinics", "Health", "MedicalClinic", {
    say: "GP clinic",
    sayPlural: "GP clinics",
    faqs: ["Are you taking new patients?", "Do you offer telehealth appointments?"],
    auFaqs: ["Do you bulk bill?"],
  }),
  def("psychologist", "Psychologist", "Psychologists", "Health", "MedicalBusiness", { faqs: ["Do you offer telehealth sessions?", "How much does a session cost?"], auFaqs: ["Can I use a Mental Health Care Plan?"] }),
  def("optometrist", "Optometrist", "Optometrists", "Health", "Optician", { faqs: ["How much is an eye test?", "Do you fit contact lenses?"] }),
  def("podiatrist", "Podiatrist", "Podiatrists", "Health", "MedicalBusiness", { faqs: ["Do you make custom orthotics?"] }),
  def("massage", "Massage therapist", "Massage therapists", "Health", "HealthAndBeautyBusiness", { faqs: ["Do you offer remedial and sports massage?", "Can I claim on my health insurance?"] }),
  def("pharmacy", "Pharmacy", "Pharmacies", "Health", "Pharmacy", { say: "pharmacy", faqs: ["What are your opening hours?", "Do you offer vaccinations?"] }),

  /* Food & drink */
  def("cafe", "Cafe", "Cafes", "Food", "CafeOrCoffeeShop", {
    prompts: ["Where can I get good coffee in {suburb}, {city}?", "Dog-friendly cafes near {suburb}"],
    faqs: ["Are dogs welcome?", "Do you take bookings for groups?"],
  }),
  def("restaurant", "Restaurant", "Restaurants", "Food", "Restaurant", { prompts: ["Where should I go for a special dinner in {city}?"], faqs: ["Do you cater for dietary requirements?", "Can you host private functions?"] }),
  def("bakery", "Bakery", "Bakeries", "Food", "Bakery", { faqs: ["Do you take orders for celebration cakes?", "What time do you open?"] }),
  def("bar", "Bar or pub", "Bars and pubs", "Food", "BarOrPub", { say: "bar", sayPlural: "bars", faqs: ["Do you serve food?", "Can I book a table or function area?"] }),
  def("takeaway", "Takeaway or pizza shop", "Takeaway shops", "Food", "FastFoodRestaurant", { say: "takeaway", sayPlural: "takeaway shops", faqs: ["Do you deliver?", "What are your opening hours?"] }),
  def("caterer", "Caterer", "Caterers", "Food", "FoodEstablishment", { faqs: ["What's your minimum order?", "Do you cater weddings and corporate events?"] }),
  def("winery", "Winery or brewery", "Wineries and breweries", "Food", "Winery", { say: "winery", sayPlural: "wineries", faqs: ["Do you offer tastings?", "Do you need a booking?"] }),

  /* Beauty */
  def("salon", "Hair salon", "Hair salons", "Beauty", "HairSalon", { prompts: ["Who does the best balayage in {city}?"], faqs: ["How much is a cut and colour?"] }),
  def("beauty", "Beauty clinic", "Beauty clinics", "Beauty", "BeautySalon", { prompts: ["Where can I get lash extensions near {suburb}?"], faqs: ["What treatments do you offer?", "Do you offer packages?"] }),
  def("barber", "Barber", "Barbers", "Beauty", "HairSalon", { prompts: ["Where can I get a good fade near {suburb}?"], faqs: ["Do you take walk-ins?", "Do you do beard trims?"] }),
  def("nails", "Nail salon", "Nail salons", "Beauty", "NailSalon", { faqs: ["Do you do gel and acrylic nails?"] }),
  def("spa", "Day spa", "Day spas", "Beauty", "DaySpa", { faqs: ["Do you sell gift vouchers?", "Do you have couples packages?"] }),
  def("tattoo", "Tattoo studio", "Tattoo studios", "Beauty", "TattooParlor", { faqs: ["How much does a tattoo cost?", "Do you need a deposit to book?"] }),

  /* Fitness */
  def("gym", "Gym", "Gyms", "Fitness", "ExerciseGym", { prompts: ["Which gym in {city} is open 24 hours?"], faqs: ["Do you have a lock-in contract?"] }),
  def("personal-trainer", "Personal trainer", "Personal trainers", "Fitness", "ProfessionalService", { faqs: ["How much is a personal training session?", "Do you train clients at home or outdoors?"] }),
  def("yoga", "Yoga studio", "Yoga studios", "Fitness", "SportsActivityLocation", { faqs: ["Do you run beginner classes?", "Do I need to bring a mat?"] }),
  def("pilates", "Pilates studio", "Pilates studios", "Fitness", "SportsActivityLocation", { faqs: ["Do you offer reformer and mat classes?"] }),
  def("martial-arts", "Martial arts school", "Martial arts schools", "Fitness", "SportsActivityLocation", { faqs: ["Do you run kids' classes?", "Do I need experience to start?"] }),

  /* Auto */
  def("mechanic", "Mechanic", "Mechanics", "Auto", "AutoRepair", {
    prompts: ["Best place for a logbook service in {city}", "Mechanic near {suburb} that does European cars"],
    faqs: ["Do you do logbook servicing without voiding warranty?"],
    auDirectories: ["MyMechanic"],
  }),
  def("detailer", "Car detailer", "Car detailers", "Auto", "AutoWash", { faqs: ["Do you offer ceramic coating?", "Do you come to me?"] }),
  def("tyres", "Tyre shop", "Tyre shops", "Auto", "TireShop", { faqs: ["Do you do wheel alignments?", "Can I book online?"] }),
  def("panel-beater", "Panel beater", "Panel beaters", "Auto", "AutoBodyShop", { faqs: ["Do you work with my insurer?", "Do you offer free quotes?"] }),
  def("car-dealer", "Car dealer", "Car dealers", "Auto", "AutoDealer", { faqs: ["Do you offer finance?", "Do you take trade-ins?"] }),
  def("driving-school", "Driving school", "Driving schools", "Education", "EducationalOrganization", { say: "driving instructor", sayPlural: "driving instructors", faqs: ["How much is a lesson?", "Do you offer test packages?"] }),

  /* Professional services */
  def("accountant", "Accountant", "Accountants", "Professional", "AccountingService", {
    prompts: ["Recommend a small business accountant in {city}"],
    faqs: ["How much does a tax return cost?", "Do you work with sole traders?", "Do you offer fixed-fee packages?"],
    auDirectories: ["CPA Australia Find a CPA", "CA ANZ Find a CA"],
  }),
  def("bookkeeper", "Bookkeeper", "Bookkeepers", "Professional", "AccountingService", { faqs: ["Which accounting software do you use?"] }),
  def("lawyer", "Lawyer", "Lawyers", "Professional", "LegalService", { prompts: ["Recommend a family lawyer in {city}"], faqs: ["Do you offer a free first consultation?", "Which areas of law do you cover?"] }),
  def("real-estate", "Real estate agent", "Real estate agents", "Professional", "RealEstateAgent", {
    prompts: ["Who is the best agent to sell my house in {suburb}?"],
    faqs: ["What is your commission?", "How long do homes take to sell in {suburb}?", "Do you offer property management?"],
  }),
  def("mortgage-broker", "Mortgage broker", "Mortgage brokers", "Professional", "FinancialService", { faqs: ["Do you charge a fee?", "How many lenders do you compare?"] }),
  def("financial-planner", "Financial planner", "Financial planners", "Professional", "FinancialService", { faqs: ["How are your fees structured?"] }),
  def("insurance-broker", "Insurance broker", "Insurance brokers", "Professional", "InsuranceAgency", { faqs: ["Which insurers do you work with?"] }),
  def("architect", "Architect", "Architects", "Professional", "ProfessionalService", { faqs: ["How do your fees work?", "Do you handle council approvals?"] }),
  def("web-designer", "Web designer", "Web designers", "Professional", "ProfessionalService", { faqs: ["How much does a website cost?", "How long does a website take?"] }),
  def("marketing", "Marketing agency", "Marketing agencies", "Professional", "ProfessionalService", { faqs: ["Do you work with small businesses?", "Do you lock clients into contracts?"] }),
  def("it-support", "IT support company", "IT support companies", "Professional", "ProfessionalService", { faqs: ["Do you offer on-site support?", "Do you offer a monthly plan?"] }),

  /* Pets */
  def("vet", "Vet", "Vets", "Pets", "VeterinaryCare", { say: "vet", prompts: ["Is there an emergency vet open now near {suburb}?"], faqs: ["Do you offer after-hours emergency care?", "How much is a consultation?"] }),
  def("dog-groomer", "Dog groomer", "Dog groomers", "Pets", "LocalBusiness", { faqs: ["How much is a groom?", "Do you groom cats too?"] }),
  def("dog-trainer", "Dog trainer", "Dog trainers", "Pets", "LocalBusiness", { faqs: ["Do you run puppy classes?", "Do you train at home?"] }),
  def("pet-boarding", "Pet boarding kennel", "Pet boarding kennels", "Pets", "LocalBusiness", { say: "pet boarding kennel", faqs: ["Can I visit before booking?", "Do you board cats?"] }),
  def("pet-store", "Pet store", "Pet stores", "Pets", "PetStore", { faqs: ["Do you deliver?"] }),

  /* Kids & education */
  def("childcare", "Childcare centre", "Childcare centres", "Education", "ChildCare", { faqs: ["Do you have places available?", "What are your daily fees?"], auFaqs: ["Do you accept the Child Care Subsidy?"] }),
  def("tutor", "Tutor", "Tutors", "Education", "EducationalOrganization", { prompts: ["Recommend a maths tutor in {city}"], faqs: ["Which subjects and year levels do you tutor?", "Do you tutor online?"] }),
  def("music-teacher", "Music teacher", "Music teachers", "Education", "EducationalOrganization", { faqs: ["Which instruments do you teach?"] }),
  def("swim-school", "Swim school", "Swim schools", "Education", "SportsActivityLocation", { faqs: ["What age can children start?"] }),

  /* Events & stays */
  def("photographer", "Photographer", "Photographers", "Events", "ProfessionalService", { prompts: ["Recommend a wedding photographer in {city}"], faqs: ["How many photos do we get?", "How long until we get our photos?"] }),
  def("wedding-venue", "Wedding venue", "Wedding venues", "Events", "EventVenue", { faqs: ["How many guests can you hold?", "Do you have in-house catering?"] }),
  def("event-planner", "Event planner", "Event planners", "Events", "ProfessionalService", { faqs: ["Do you plan corporate events?"] }),
  def("florist", "Florist", "Florists", "Retail", "Florist", { prompts: ["Which florist in {city} does same-day delivery?"], faqs: ["Do you offer same-day delivery?", "Do you do wedding flowers?"] }),
  def("hotel", "Hotel", "Hotels", "Events", "Hotel", { prompts: ["Where should I stay in {city} for a weekend?"], faqs: ["Is parking included?", "What time is check-in?"] }),
  def("bnb", "B&B or guesthouse", "B&Bs and guesthouses", "Events", "BedAndBreakfast", { say: "B&B", sayPlural: "B&Bs", faqs: ["Is breakfast included?", "Are pets allowed?"] }),

  /* Retail */
  def("bike-shop", "Bike shop", "Bike shops", "Retail", "BikeStore", { faqs: ["Do you service bikes?", "Do you sell e-bikes?"] }),
  def("furniture", "Furniture store", "Furniture stores", "Retail", "FurnitureStore", { faqs: ["Do you deliver and assemble?"] }),
  def("jeweller", "Jeweller", "Jewellers", "Retail", "JewelryStore", { prompts: ["Where should I buy an engagement ring in {city}?"], faqs: ["Do you make custom rings?", "Do you do repairs and resizing?"] }),
  def("bottle-shop", "Bottle shop", "Bottle shops", "Retail", "LiquorStore", { faqs: ["Do you deliver?"] }),
  def("hardware", "Hardware store", "Hardware stores", "Retail", "HardwareStore", { faqs: ["Do you cut keys and mix paint?"] }),
  def("boutique", "Clothing boutique", "Clothing boutiques", "Retail", "ClothingStore", { faqs: ["Do you offer alterations?"] }),
  def("bookshop", "Bookshop", "Bookshops", "Retail", "BookStore", { faqs: ["Can you order in books?"] }),
];

/* ---------------- Custom business types ---------------- */

const CUSTOM_RE = /^[a-z0-9][a-z0-9 &'/-]{1,48}$/i;

export function isValidCustomType(t: string) {
  return CUSTOM_RE.test(t.trim());
}

export function customCategoryId(type: string) {
  return `custom:${type.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

function pluralise(word: string) {
  const parts = word.split(" ");
  const last = parts.pop() ?? "";
  const p = /(s|x|z|ch|sh)$/i.test(last) ? `${last}es` : /[^aeiou]y$/i.test(last) ? `${last.slice(0, -1)}ies` : `${last}s`;
  return [...parts, p].join(" ");
}

function titleCase(s: string) {
  return s.replace(/\b[a-z]/g, (m) => m.toUpperCase());
}

function customCategory(id: string): Category {
  const type = id.slice("custom:".length);
  const label = titleCase(type);
  return { ...def(id, label, pluralise(label), "Other", "LocalBusiness", { say: type, sayPlural: pluralise(type) }), custom: true };
}

/* ---------------- Lookups ---------------- */

export function getCategory(id: string): Category {
  if (id.startsWith("custom:") && isValidCustomType(id.slice(7))) return customCategory(id);
  return categories.find((c) => c.id === id) ?? categories[0];
}

/** Reads category + customType form fields. Returns null if "Other" was picked without a valid type. */
export function categoryFromForm(category: string, customType?: string): string | null {
  const id = category === "custom" ? (customType && isValidCustomType(customType) ? customCategoryId(customType) : "") : category;
  return id && isValidCategoryId(id) ? id : null;
}

export function isValidCategoryId(id: string) {
  return categories.some((c) => c.id === id) || (id.startsWith("custom:") && isValidCustomType(id.slice(7)));
}

export const categoryGroups: Group[] = ["Trades", "Home", "Health", "Food", "Beauty", "Fitness", "Auto", "Professional", "Pets", "Education", "Events", "Retail"];

/** Fills {suburb} and {city}. Avoids "in Adelaide, Adelaide" when there's no separate suburb. */
export function fillTemplate(t: string, place: Place) {
  const city = place.city || place.area;
  const area = place.area || city;
  const filled = area.toLowerCase() === city.toLowerCase() ? t.replace(/\{suburb\}(?:,| and) \{city\}/g, city) : t;
  return filled.replaceAll("{suburb}", area).replaceAll("{city}", city);
}

export function promptsFor(categoryId: string, place: Place, limit = 4) {
  const cat = getCategory(categoryId);
  const list = place.country === "AU" ? [...cat.prompts.slice(0, 3), ...(cat.auPrompts ?? []), ...cat.prompts.slice(3)] : cat.prompts;
  return list.slice(0, limit).map((p) => fillTemplate(p, place));
}

export function faqsFor(cat: Category, place: Place) {
  const list = place.country === "AU" ? [...(cat.auFaqs ?? []), ...cat.faqs] : cat.faqs;
  return [...new Set(list)].slice(0, 6).map((q) => fillTemplate(q, place));
}

export function categoryDirectories(cat: Category, countryCode: string) {
  return directoriesFor(cat.group, countryCode, cat.auDirectories ?? []);
}

/** Suggestions for the suburb box when the city is Adelaide. */
export const suburbs = [
  "Adelaide CBD", "North Adelaide", "Norwood", "Kent Town", "Unley", "Parkside", "Glenelg", "Brighton",
  "Henley Beach", "Semaphore", "Port Adelaide", "Prospect", "Walkerville", "Burnside", "Magill", "Campbelltown",
  "Mitcham", "Blackwood", "Marion", "Morphett Vale", "Noarlunga", "Aldinga", "Mount Barker", "Stirling",
  "Modbury", "Tea Tree Gully", "Golden Grove", "Mawson Lakes", "Salisbury", "Elizabeth", "Gawler",
  "West Lakes", "Findon", "Torrensville", "Mile End", "Goodwood", "Hyde Park", "Payneham", "St Peters",
];

