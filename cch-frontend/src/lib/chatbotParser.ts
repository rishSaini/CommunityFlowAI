import type { FormData } from "../types/index";

// ── Utah school / venue → city + county ──────────────────────────────────
const UTAH_VENUES: Record<string, { city: string; county: string; zipCode?: string }> = {
  "hillcrest high school":        { city: "Midvale",          county: "Salt Lake",   zipCode: "84047" },
  "hillcrest high":               { city: "Midvale",          county: "Salt Lake",   zipCode: "84047" },
  "bingham high school":          { city: "South Jordan",     county: "Salt Lake",   zipCode: "84095" },
  "jordan high school":           { city: "Sandy",            county: "Salt Lake",   zipCode: "84070" },
  "west high school":             { city: "Salt Lake City",   county: "Salt Lake",   zipCode: "84116" },
  "east high school":             { city: "Salt Lake City",   county: "Salt Lake",   zipCode: "84102" },
  "skyline high school":          { city: "Salt Lake City",   county: "Salt Lake",   zipCode: "84108" },
  "olympus high school":          { city: "Holladay",         county: "Salt Lake",   zipCode: "84117" },
  "cottonwood high school":       { city: "Murray",           county: "Salt Lake",   zipCode: "84121" },
  "taylorsville high school":     { city: "Taylorsville",     county: "Salt Lake",   zipCode: "84123" },
  "granger high school":          { city: "West Valley City", county: "Salt Lake",   zipCode: "84119" },
  "kearns high school":           { city: "Kearns",           county: "Salt Lake",   zipCode: "84118" },
  "copper hills high school":     { city: "West Jordan",      county: "Salt Lake",   zipCode: "84084" },
  "provo high school":            { city: "Provo",            county: "Utah",        zipCode: "84601" },
  "orem high school":             { city: "Orem",             county: "Utah",        zipCode: "84057" },
  "american fork high school":    { city: "American Fork",    county: "Utah",        zipCode: "84003" },
  "pleasant grove high school":   { city: "Pleasant Grove",   county: "Utah",        zipCode: "84062" },
  "springville high school":      { city: "Springville",      county: "Utah",        zipCode: "84663" },
  "spanish fork high school":     { city: "Spanish Fork",     county: "Utah",        zipCode: "84660" },
  "ogden high school":            { city: "Ogden",            county: "Weber",       zipCode: "84401" },
  "weber high school":            { city: "Pleasant View",    county: "Weber",       zipCode: "84414" },
  "bonneville high school":       { city: "Washington Terrace", county: "Weber",     zipCode: "84405" },
  "logan high school":            { city: "Logan",            county: "Cache",       zipCode: "84321" },
  "mountain crest high school":   { city: "Hyrum",            county: "Cache",       zipCode: "84319" },
  "st george library":            { city: "St. George",       county: "Washington",  zipCode: "84770" },
  "moab library":                 { city: "Moab",             county: "Grand",       zipCode: "84532" },
  "blanding community center":    { city: "Blanding",         county: "San Juan",    zipCode: "84511" },
  "price community center":       { city: "Price",            county: "Carbon",      zipCode: "84501" },
  "cedar city library":           { city: "Cedar City",       county: "Iron",        zipCode: "84720" },
  "tooele high school":           { city: "Tooele",           county: "Tooele",      zipCode: "84074" },
  "richfield high school":        { city: "Richfield",        county: "Sevier",      zipCode: "84701" },
  "delta high school":            { city: "Delta",            county: "Millard",     zipCode: "84624" },
  "kanab high school":            { city: "Kanab",            county: "Kane",        zipCode: "84741" },
  "monticello high school":       { city: "Monticello",       county: "San Juan",    zipCode: "84535" },
  "vernal junior high":           { city: "Vernal",           county: "Uintah",      zipCode: "84078" },
  "duchesne high school":         { city: "Duchesne",         county: "Duchesne",    zipCode: "84021" },
};

// ── Event type → needs mapping ───────────────────────────────────────────
const NEED_KEYWORDS: Array<{ patterns: string[]; need: string }> = [
  { patterns: ["mental health", "counseling", "wellness", "stress", "anxiety", "depression", "behavioral"], need: "Mental Health Resources"    },
  { patterns: ["nutrition", "food", "diet", "eating", "healthy eating", "obesity", "weight"],               need: "Nutrition Toolkits"         },
  { patterns: ["vaccine", "vaccination", "immunization", "flu shot", "covid", "shot"],                      need: "Vaccine Info Packets"       },
  { patterns: ["diabetes", "blood sugar", "insulin", "prediabetes", "glucose"],                             need: "Diabetes Prevention Kits"   },
  { patterns: ["dental", "teeth", "tooth", "oral health", "cavity", "dentist"],                             need: "Dental Health Kits"         },
  { patterns: ["substance", "drug", "alcohol", "opioid", "addiction", "recovery"],                          need: "Substance Abuse Toolkits"   },
  { patterns: ["staff", "on-site", "onsite", "in-person support", "presenters", "educators"],               need: "On-site Staff"              },
];

// ── Utah cities with county lookup ───────────────────────────────────────
const CITY_COUNTY: Record<string, { county: string; zipCode?: string }> = {
  "salt lake city":   { county: "Salt Lake",   zipCode: "84101" },
  "provo":            { county: "Utah",        zipCode: "84601" },
  "ogden":            { county: "Weber",       zipCode: "84401" },
  "st george":        { county: "Washington",  zipCode: "84770" },
  "saint george":     { county: "Washington",  zipCode: "84770" },
  "logan":            { county: "Cache",       zipCode: "84321" },
  "moab":             { county: "Grand",       zipCode: "84532" },
  "blanding":         { county: "San Juan",    zipCode: "84511" },
  "monticello":       { county: "San Juan",    zipCode: "84535" },
  "price":            { county: "Carbon",      zipCode: "84501" },
  "cedar city":       { county: "Iron",        zipCode: "84720" },
  "tooele":           { county: "Tooele",      zipCode: "84074" },
  "vernal":           { county: "Uintah",      zipCode: "84078" },
  "richfield":        { county: "Sevier",      zipCode: "84701" },
  "delta":            { county: "Millard",     zipCode: "84624" },
  "kanab":            { county: "Kane",        zipCode: "84741" },
  "torrey":           { county: "Wayne",       zipCode: "84775" },
  "castle dale":      { county: "Emery",       zipCode: "84522" },
  "junction":         { county: "Piute",       zipCode: "84759" },
  "panguitch":        { county: "Garfield",    zipCode: "84759" },
  "fillmore":         { county: "Millard",     zipCode: "84631" },
  "nephi":            { county: "Juab",        zipCode: "84648" },
  "duchesne":         { county: "Duchesne",    zipCode: "84021" },
  "roosevelt":        { county: "Duchesne",    zipCode: "84066" },
  "murray":           { county: "Salt Lake",   zipCode: "84107" },
  "sandy":            { county: "Salt Lake",   zipCode: "84070" },
  "west jordan":      { county: "Salt Lake",   zipCode: "84084" },
  "west valley city": { county: "Salt Lake",   zipCode: "84119" },
  "taylorsville":     { county: "Salt Lake",   zipCode: "84123" },
  "midvale":          { county: "Salt Lake",   zipCode: "84047" },
  "south jordan":     { county: "Salt Lake",   zipCode: "84095" },
  "riverton":         { county: "Salt Lake",   zipCode: "84065" },
  "herriman":         { county: "Salt Lake",   zipCode: "84096" },
  "draper":           { county: "Salt Lake",   zipCode: "84020" },
  "lehi":             { county: "Utah",        zipCode: "84043" },
  "american fork":    { county: "Utah",        zipCode: "84003" },
  "orem":             { county: "Utah",        zipCode: "84057" },
  "springville":      { county: "Utah",        zipCode: "84663" },
  "spanish fork":     { county: "Utah",        zipCode: "84660" },
  "pleasant grove":   { county: "Utah",        zipCode: "84062" },
  "layton":           { county: "Davis",       zipCode: "84041" },
  "bountiful":        { county: "Davis",       zipCode: "84010" },
  "farmington":       { county: "Davis",       zipCode: "84025" },
  "kaysville":        { county: "Davis",       zipCode: "84037" },
  "park city":        { county: "Summit",      zipCode: "84060" },
  "heber city":       { county: "Wasatch",     zipCode: "84032" },
  "brigham city":     { county: "Box Elder",   zipCode: "84302" },
};

// ── Month name → number ──────────────────────────────────────────────────
const MONTHS: Record<string, number> = {
  january:1, february:2, march:3, april:4, may:5, june:6,
  july:7, august:8, september:9, october:10, november:11, december:12,
  jan:1, feb:2, mar:3, apr:4, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12,
};

// ── Main parser ──────────────────────────────────────────────────────────
export interface ParseResult {
  extracted: Partial<FormData>;
  confidence: Record<string, "high" | "medium">;
  detectedFields: string[];
}

export type FieldKey = "requestor_name" | "event_date" | "event_city" | "county" | "event_zip" | "estimated_attendees" | "materials_requested";

export function parseMessage(msg: string, currentForm: FormData): ParseResult {
  const text   = msg.toLowerCase().trim();
  const result: Partial<FormData> = {};
  const confidence: Record<string, "high" | "medium"> = {};
  const detected: string[] = [];

  // ── 1. Venue / school lookup ────────────────────────────────────────
  for (const [venue, info] of Object.entries(UTAH_VENUES)) {
    if (text.includes(venue)) {
      if (!currentForm.event_city)   { result.event_city = info.city;   confidence.event_city   = "high"; detected.push("event_city");   }
      if (!currentForm.county)       { result.county     = info.county; confidence.county       = "high"; detected.push("county"); }
      if (!currentForm.event_zip && info.zipCode) {
        result.event_zip = info.zipCode;
        confidence.event_zip = "high";
        detected.push("event_zip");
      }
      break;
    }
  }

  // ── 2. City lookup ──────────────────────────────────────────────────
  if (!result.event_city && !currentForm.event_city) {
    for (const [city, info] of Object.entries(CITY_COUNTY)) {
      const pattern = new RegExp(`\\b${city.replace(/\s+/g, "\\s+")}\\b`, "i");
      if (pattern.test(text)) {
        result.event_city = city.split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
        result.county     = info.county;
        if (info.zipCode && !currentForm.event_zip) result.event_zip = info.zipCode;
        confidence.event_city = confidence.county = "high";
        detected.push("event_city", "county");
        break;
      }
    }
  }

  // ── 3. Zip code ─────────────────────────────────────────────────────
  if (!currentForm.event_zip) {
    const zipMatch = text.match(/\b84\d{3}\b/);
    if (zipMatch) {
      result.event_zip = zipMatch[0];
      confidence.event_zip = "high";
      detected.push("event_zip");
    }
  }

  // ── 4. Date parsing ─────────────────────────────────────────────────
  if (!currentForm.event_date) {
    const longDate = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\b/i);
    if (longDate) {
      const month = MONTHS[longDate[1].toLowerCase()];
      const day   = parseInt(longDate[2]);
      const year  = longDate[3] ? parseInt(longDate[3]) : 2026;
      const d     = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) {
        result.event_date = d.toISOString().split("T")[0];
        confidence.event_date = "high";
        detected.push("event_date");
      }
    }

    if (!result.event_date) {
      const reverseDate = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)/i);
      if (reverseDate) {
        const month = MONTHS[reverseDate[2].toLowerCase()];
        const day   = parseInt(reverseDate[1]);
        const d     = new Date(2026, month - 1, day);
        if (!isNaN(d.getTime())) {
          result.event_date = d.toISOString().split("T")[0];
          confidence.event_date = "high";
          detected.push("event_date");
        }
      }
    }

    if (!result.event_date) {
      const isoDate = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
      if (isoDate) {
        result.event_date = isoDate[0];
        confidence.event_date = "high";
        detected.push("event_date");
      }
      const slashDate = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
      if (slashDate && !result.event_date) {
        const m = parseInt(slashDate[1]), d = parseInt(slashDate[2]);
        let y = parseInt(slashDate[3]);
        if (y < 100) y += 2000;
        const dt = new Date(y, m - 1, d);
        if (!isNaN(dt.getTime())) {
          result.event_date = dt.toISOString().split("T")[0];
          confidence.event_date = "medium";
          detected.push("event_date");
        }
      }
    }
  }

  // ── 5. Attendee count ───────────────────────────────────────────────
  if (!currentForm.estimated_attendees) {
    const countMatch = text.match(/\b(\d+)\s*(?:people|students|attendees|participants|guests|kids|adults|folks|members|expected|anticipated)?\b/);
    if (countMatch) {
      const n = parseInt(countMatch[1]);
      if (n >= 5 && n <= 5000 && !String(n).match(/^(202[0-9]|84\d{3})$/)) {
        result.estimated_attendees = String(n);
        confidence.estimated_attendees = "medium";
        detected.push("estimated_attendees");
      }
    }
  }

  // ── 6. Resource needs ───────────────────────────────────────────────
  const detectedNeeds: string[] = [...(currentForm.materials_requested ?? [])];
  for (const { patterns, need } of NEED_KEYWORDS) {
    if (!detectedNeeds.includes(need) && patterns.some((p) => text.includes(p))) {
      detectedNeeds.push(need);
      detected.push("materials_requested");
    }
  }
  if (detectedNeeds.length > (currentForm.materials_requested?.length ?? 0)) {
    result.materials_requested = detectedNeeds;
    confidence.materials_requested = "high";
  }

  // ── 7. Organization name ────────────────────────────────────────────
  if (!currentForm.requestor_name) {
    const orgPatterns = [
      /(?:i(?:'m| am) (?:from |with |at )?|(?:representing |on behalf of |for ))([A-Z][^\.,!?]+?)(?:\.|,|!|\?|$| and )/,
      /\b([\w\s]+ (?:school|clinic|library|center|centre|health|hospital|church|district|foundation|coalition|org|organization|department|dept))\b/i,
    ];
    for (const pattern of orgPatterns) {
      const m = msg.match(pattern);
      if (m && m[1].length > 3 && m[1].length < 80) {
        result.requestor_name = m[1].trim();
        confidence.requestor_name = "medium";
        detected.push("requestor_name");
        break;
      }
    }
  }

  return {
    extracted: result,
    confidence,
    detectedFields: [...new Set(detected)],
  };
}

// ── Determine which required fields are still missing ────────────────────
const REQUIRED_FIELDS: FieldKey[] = [
  "requestor_name", "event_date", "event_city", "county", "event_zip", "estimated_attendees", "materials_requested",
];

export const FIELD_LABELS: Record<FieldKey, string> = {
  requestor_name:       "organization name",
  event_date:           "event date",
  event_city:           "city",
  county:               "county",
  event_zip:            "zip code",
  estimated_attendees:  "number of attendees",
  materials_requested:  "resources needed",
};

export function getMissingFields(form: FormData): FieldKey[] {
  const missing: FieldKey[] = [];
  if (!form.requestor_name)                    missing.push("requestor_name");
  if (!form.event_date)                        missing.push("event_date");
  if (!form.event_city)                        missing.push("event_city");
  if (!form.county)                            missing.push("county");
  if (!form.event_zip)                         missing.push("event_zip");
  if (!form.estimated_attendees)               missing.push("estimated_attendees");
  if (!form.materials_requested?.length)       missing.push("materials_requested");
  return missing;
}

export { REQUIRED_FIELDS };

// ── Build the bot's follow-up response ───────────────────────────────────
export function buildBotReply(
  parsed: ParseResult,
  updatedForm: FormData,
  isFirstMessage: boolean,
): string {
  const { extracted, detectedFields } = parsed;
  const missing = getMissingFields(updatedForm);

  const gotParts: string[] = [];
  if (detectedFields.includes("requestor_name") && extracted.requestor_name)
    gotParts.push(`organization: **${extracted.requestor_name}**`);
  if (detectedFields.includes("event_city") && extracted.event_city)
    gotParts.push(`location: **${extracted.event_city}${extracted.county ? `, ${extracted.county} County` : ""}**`);
  if (detectedFields.includes("event_date") && extracted.event_date)
    gotParts.push(`date: **${new Date(extracted.event_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}**`);
  if (detectedFields.includes("estimated_attendees") && extracted.estimated_attendees)
    gotParts.push(`attendees: **${extracted.estimated_attendees}**`);
  if (detectedFields.includes("materials_requested") && extracted.materials_requested?.length)
    gotParts.push(`resources: **${extracted.materials_requested.slice(-(extracted.materials_requested.length - (parsed.extracted.materials_requested?.length ?? 0) + 1)).join(", ")}**`);

  const ackLine = gotParts.length
    ? `Got it — I picked up ${gotParts.join(", ")}.\n\n`
    : (isFirstMessage ? "" : "Hmm, I didn't catch anything new there — let me know if you meant something else.\n\n");

  if (missing.length === 0) {
    return `${ackLine}Everything looks complete! The form is ready to submit — take a quick look to confirm the details are right.`;
  }

  const nextField = missing[0];
  const prompts: Record<FieldKey, string> = {
    requestor_name:      "What's the name of your organization or school?",
    event_date:          "What date is the event? (e.g., April 22, 2026)",
    event_city:          "What city will the event be held in?",
    county:              "Which Utah county is the event in?",
    event_zip:           "What's the zip code for the event location?",
    estimated_attendees: "Roughly how many people are you expecting to attend?",
    materials_requested: "What resources do you need? For example: nutrition kits, mental health resources, vaccine info, or on-site staff.",
  };

  const remaining = missing.length - 1;
  const remainingHint = remaining > 0
    ? ` (${remaining} more thing${remaining > 1 ? "s" : ""} to go after this)`
    : "";

  return `${ackLine}${prompts[nextField]}${remainingHint}`;
}
