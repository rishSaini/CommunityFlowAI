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

export function parseMessage(msg: string, currentForm: FormData): ParseResult {
  const text   = msg.toLowerCase().trim();
  const result: Partial<FormData> = {};
  const confidence: Record<string, "high" | "medium"> = {};
  const detected: string[] = [];

  // ── 1. Venue / school lookup ────────────────────────────────────────
  for (const [venue, info] of Object.entries(UTAH_VENUES)) {
    if (text.includes(venue)) {
      if (!currentForm.city)   { result.city   = info.city;   confidence.city   = "high"; detected.push("city");   }
      if (!currentForm.county) { result.county = info.county; confidence.county = "high"; detected.push("county"); }
      if (!currentForm.zipCode && info.zipCode) {
        result.zipCode = info.zipCode;
        confidence.zipCode = "high";
        detected.push("zipCode");
      }
      break;
    }
  }

  // ── 2. City lookup ──────────────────────────────────────────────────
  if (!result.city && !currentForm.city) {
    for (const [city, info] of Object.entries(CITY_COUNTY)) {
      const pattern = new RegExp(`\\b${city.replace(/\s+/g, "\\s+")}\\b`, "i");
      if (pattern.test(text)) {
        result.city   = city.split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
        result.county = info.county;
        if (info.zipCode && !currentForm.zipCode) result.zipCode = info.zipCode;
        confidence.city = confidence.county = "high";
        detected.push("city", "county");
        break;
      }
    }
  }

  // ── 3. Zip code ─────────────────────────────────────────────────────
  if (!currentForm.zipCode) {
    const zipMatch = text.match(/\b84\d{3}\b/);
    if (zipMatch) {
      result.zipCode = zipMatch[0];
      confidence.zipCode = "high";
      detected.push("zipCode");
    }
  }

  // ── 4. Date parsing ─────────────────────────────────────────────────
  if (!currentForm.eventDate) {
    // "April 15 2026" / "April 15, 2026"
    const longDate = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\b/i);
    if (longDate) {
      const month = MONTHS[longDate[1].toLowerCase()];
      const day   = parseInt(longDate[2]);
      const year  = longDate[3] ? parseInt(longDate[3]) : 2026;
      const d     = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) {
        result.eventDate = d.toISOString().split("T")[0];
        confidence.eventDate = "high";
        detected.push("eventDate");
      }
    }

    // "15th of April" / "the 15th"
    if (!result.eventDate) {
      const reverseDate = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)/i);
      if (reverseDate) {
        const month = MONTHS[reverseDate[2].toLowerCase()];
        const day   = parseInt(reverseDate[1]);
        const d     = new Date(2026, month - 1, day);
        if (!isNaN(d.getTime())) {
          result.eventDate = d.toISOString().split("T")[0];
          confidence.eventDate = "high";
          detected.push("eventDate");
        }
      }
    }

    // ISO / numeric: "2026-04-15" or "4/15/2026" or "04/15/26"
    if (!result.eventDate) {
      const isoDate = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
      if (isoDate) {
        result.eventDate = isoDate[0];
        confidence.eventDate = "high";
        detected.push("eventDate");
      }
      const slashDate = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
      if (slashDate && !result.eventDate) {
        const m = parseInt(slashDate[1]), d = parseInt(slashDate[2]);
        let y = parseInt(slashDate[3]);
        if (y < 100) y += 2000;
        const dt = new Date(y, m - 1, d);
        if (!isNaN(dt.getTime())) {
          result.eventDate = dt.toISOString().split("T")[0];
          confidence.eventDate = "medium";
          detected.push("eventDate");
        }
      }
    }
  }

  // ── 5. Attendee count ───────────────────────────────────────────────
  if (!currentForm.attendeeCount) {
    const countMatch = text.match(/\b(\d+)\s*(?:people|students|attendees|participants|guests|kids|adults|folks|members|expected|anticipated)?\b/);
    // avoid matching years or zip codes
    if (countMatch) {
      const n = parseInt(countMatch[1]);
      if (n >= 5 && n <= 5000 && !String(n).match(/^(202[0-9]|84\d{3})$/)) {
        result.attendeeCount = String(n);
        confidence.attendeeCount = "medium";
        detected.push("attendeeCount");
      }
    }
  }

  // ── 6. Resource needs ───────────────────────────────────────────────
  const detectedNeeds: string[] = [...(currentForm.needs ?? [])];
  for (const { patterns, need } of NEED_KEYWORDS) {
    if (!detectedNeeds.includes(need) && patterns.some((p) => text.includes(p))) {
      detectedNeeds.push(need);
      detected.push("needs");
    }
  }
  if (detectedNeeds.length > (currentForm.needs?.length ?? 0)) {
    result.needs = detectedNeeds;
    confidence.needs = "high";
  }

  // ── 7. Organization name ────────────────────────────────────────────
  if (!currentForm.name) {
    const orgPatterns = [
      /(?:i(?:'m| am) (?:from |with |at )?|(?:representing |on behalf of |for ))([A-Z][^\.,!?]+?)(?:\.|,|!|\?|$| and )/,
      /\b([\w\s]+ (?:school|clinic|library|center|centre|health|hospital|church|district|foundation|coalition|org|organization|department|dept))\b/i,
    ];
    for (const pattern of orgPatterns) {
      const m = msg.match(pattern);
      if (m && m[1].length > 3 && m[1].length < 80) {
        result.name = m[1].trim();
        confidence.name = "medium";
        detected.push("name");
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
export type FieldKey = keyof FormData;

const FIELD_LABELS: Record<FieldKey, string> = {
  name:          "organization name",
  eventDate:     "event date",
  city:          "city",
  county:        "county",
  zipCode:       "zip code",
  attendeeCount: "number of attendees",
  needs:         "resources needed",
};

export function getMissingFields(form: FormData): FieldKey[] {
  const missing: FieldKey[] = [];
  if (!form.name)          missing.push("name");
  if (!form.eventDate)     missing.push("eventDate");
  if (!form.city)          missing.push("city");
  if (!form.county)        missing.push("county");
  if (!form.zipCode)       missing.push("zipCode");
  if (!form.attendeeCount) missing.push("attendeeCount");
  if (!form.needs?.length) missing.push("needs");
  return missing;
}

// ── Build the bot's follow-up response ───────────────────────────────────
export function buildBotReply(
  parsed: ParseResult,
  updatedForm: FormData,
  isFirstMessage: boolean,
): string {
  const { extracted, detectedFields } = parsed;
  const missing = getMissingFields(updatedForm);

  // Build "I caught X, Y, Z" summary
  const gotParts: string[] = [];
  if (detectedFields.includes("name") && extracted.name)
    gotParts.push(`organization: **${extracted.name}**`);
  if (detectedFields.includes("city") && extracted.city)
    gotParts.push(`location: **${extracted.city}${extracted.county ? `, ${extracted.county} County` : ""}**`);
  if (detectedFields.includes("eventDate") && extracted.eventDate)
    gotParts.push(`date: **${new Date(extracted.eventDate + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}**`);
  if (detectedFields.includes("attendeeCount") && extracted.attendeeCount)
    gotParts.push(`attendees: **${extracted.attendeeCount}**`);
  if (detectedFields.includes("needs") && extracted.needs?.length)
    gotParts.push(`resources: **${extracted.needs.slice(-(extracted.needs.length - (parsed.extracted.needs?.length ?? 0) + detectedFields.filter(f => f === "needs").length)).join(", ")}**`);

  const ackLine = gotParts.length
    ? `Got it — I picked up ${gotParts.join(", ")}. ✅\n\n`
    : (isFirstMessage ? "" : "Hmm, I didn't catch anything new there — let me know if you meant something else.\n\n");

  if (missing.length === 0) {
    return `${ackLine}Everything looks complete! 🎉 The form is ready to submit — take a quick look to confirm the details are right.`;
  }

  // Ask for the next most important missing field
  const nextField = missing[0];
  const prompts: Record<FieldKey, string> = {
    name:          "What's the name of your organization or school?",
    eventDate:     "What date is the event? (e.g., April 22, 2026)",
    city:          "What city will the event be held in?",
    county:        "Which Utah county is the event in?",
    zipCode:       "What's the zip code for the event location?",
    attendeeCount: "Roughly how many people are you expecting to attend?",
    needs:         "What resources do you need? For example: nutrition kits, mental health resources, vaccine info, or on-site staff.",
  };

  const remaining = missing.length - 1;
  const remainingHint = remaining > 0
    ? ` (${remaining} more thing${remaining > 1 ? "s" : ""} to go after this)`
    : "";

  return `${ackLine}${prompts[nextField]}${remainingHint}`;
}

export { FIELD_LABELS };
