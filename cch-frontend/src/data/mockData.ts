import type { CountyData, ResourceRequest, TriageResult, ImpactLevel, FulfillmentMethod, StaffProfile, StaffTask } from "../types/index";

export const utahCountyData: Record<string, CountyData> = {
  "49001": { name: "Beaver",      serviceIndex: -62, population: 6700    },
  "49003": { name: "Box Elder",   serviceIndex: -38, population: 56000   },
  "49005": { name: "Cache",       serviceIndex:  12, population: 133000  },
  "49007": { name: "Carbon",      serviceIndex: -55, population: 20000   },
  "49009": { name: "Daggett",     serviceIndex: -78, population: 1100    },
  "49011": { name: "Davis",       serviceIndex:  68, population: 362000  },
  "49013": { name: "Duchesne",    serviceIndex: -60, population: 21000   },
  "49015": { name: "Emery",       serviceIndex: -71, population: 10000   },
  "49017": { name: "Garfield",    serviceIndex: -73, population: 5200    },
  "49019": { name: "Grand",       serviceIndex: -82, population: 9700    },
  "49021": { name: "Iron",        serviceIndex: -22, population: 60000   },
  "49023": { name: "Juab",        serviceIndex: -44, population: 12000   },
  "49025": { name: "Kane",        serviceIndex: -58, population: 8000    },
  "49027": { name: "Millard",     serviceIndex: -50, population: 13000   },
  "49029": { name: "Morgan",      serviceIndex:  18, population: 12000   },
  "49031": { name: "Piute",       serviceIndex: -80, population: 1700    },
  "49033": { name: "Rich",        serviceIndex: -46, population: 2600    },
  "49035": { name: "Salt Lake",   serviceIndex:  88, population: 1185000 },
  "49037": { name: "San Juan",    serviceIndex: -88, population: 15000   },
  "49039": { name: "Sanpete",     serviceIndex: -48, population: 30000   },
  "49041": { name: "Sevier",      serviceIndex: -42, population: 21000   },
  "49043": { name: "Summit",      serviceIndex:  72, population: 43000   },
  "49045": { name: "Tooele",      serviceIndex: -32, population: 72000   },
  "49047": { name: "Uintah",      serviceIndex: -54, population: 36000   },
  "49049": { name: "Utah",        serviceIndex:  55, population: 665000  },
  "49051": { name: "Wasatch",     serviceIndex:  28, population: 35000   },
  "49053": { name: "Washington",  serviceIndex:  22, population: 180000  },
  "49055": { name: "Wayne",       serviceIndex: -76, population: 2700    },
  "49057": { name: "Weber",       serviceIndex:  42, population: 260000  },
};

export const getServiceLabel = (index: number): string => {
  if (index >= 60)  return "Significantly Over-served";
  if (index >= 30)  return "Moderately Over-served";
  if (index >= 10)  return "Slightly Over-served";
  if (index >= -10) return "Balanced";
  if (index >= -30) return "Slightly Underserved";
  if (index >= -55) return "Underserved";
  if (index >= -70) return "Critically Underserved";
  return "Severely Underserved";
};

// ── Utah city → coordinates lookup (used for geocoding request event cities) ──
export const UTAH_CITY_COORDS: Record<string, [number, number]> = {
  "salt lake city":   [-111.89, 40.76],
  "provo":            [-111.66, 40.23],
  "ogden":            [-111.97, 41.22],
  "st. george":       [-113.58, 37.10],
  "st george":        [-113.58, 37.10],
  "logan":            [-111.83, 41.74],
  "cedar city":       [-113.06, 37.68],
  "moab":             [-109.55, 38.57],
  "vernal":           [-109.53, 40.45],
  "price":            [-110.81, 39.60],
  "richfield":        [-112.08, 38.77],
  "tooele":           [-112.30, 40.53],
  "murray":           [-111.89, 40.66],
  "west valley city": [-112.00, 40.69],
  "west valley":      [-112.00, 40.69],
  "sandy":            [-111.87, 40.59],
  "orem":             [-111.69, 40.30],
  "draper":           [-111.86, 40.52],
  "layton":           [-111.97, 41.06],
  "bountiful":        [-111.88, 40.90],
  "riverton":         [-111.94, 40.52],
  "taylorsville":     [-111.94, 40.66],
  "blanding":         [-109.49, 37.62],
  "monticello":       [-109.34, 37.87],
  "castle dale":      [-111.02, 39.21],
  "green river":      [-110.16, 38.99],
  "torrey":           [-111.42, 38.12],
  "junction":         [-112.22, 38.24],
  "heber city":       [-111.41, 40.51],
  "heber":            [-111.41, 40.51],
  "payson":           [-111.73, 40.04],
  "springville":      [-111.61, 40.17],
  "spanish fork":     [-111.65, 40.11],
  "american fork":    [-111.80, 40.38],
  "lehi":             [-111.85, 40.39],
  "pleasant grove":   [-111.74, 40.36],
  "kaysville":        [-111.94, 41.03],
  "clearfield":       [-112.02, 41.10],
  "south jordan":     [-111.93, 40.56],
  "west jordan":      [-111.94, 40.61],
  "cottonwood heights": [-111.81, 40.62],
  "millcreek":        [-111.87, 40.69],
  "herriman":         [-112.03, 40.51],
  "saratoga springs": [-111.90, 40.34],
  "eagle mountain":   [-112.01, 40.31],
  "bluffdale":        [-111.94, 40.49],
  "midvale":          [-111.90, 40.61],
  "magna":            [-112.10, 40.71],
  "kearns":           [-111.99, 40.66],
  "holladay":         [-111.82, 40.67],
  "nephi":            [-111.83, 39.71],
  "manti":            [-111.63, 39.27],
  "ephraim":          [-111.59, 39.36],
  "kanab":            [-112.53, 37.05],
  "panguitch":        [-112.43, 37.83],
  "fillmore":         [-112.32, 38.96],
  "delta":            [-112.57, 39.35],
  "duchesne":         [-110.40, 40.16],
  "roosevelt":        [-109.99, 40.30],
  "manila":           [-109.72, 40.99],
  "mountain home":    [-110.02, 40.19],
  "helper":           [-110.85, 39.68],
  "huntington":       [-110.96, 39.33],
  "ferron":           [-111.13, 39.09],
  "escalante":        [-111.60, 37.77],
  "boulder":          [-111.43, 37.91],
  "bluff":            [-109.55, 37.29],
  "mexican hat":      [-109.86, 37.15],
  "koosharem":        [-111.88, 38.51],
  "loa":              [-111.63, 38.40],
  "bicknell":         [-111.55, 38.34],
  "gunnison":         [-111.82, 39.16],
  "centerfield":      [-111.82, 39.12],
  "moroni":           [-111.58, 39.52],
  "salina":           [-111.86, 38.96],
  "monroe":           [-112.11, 38.63],
  "elsinore":         [-112.15, 38.68],
  "richfield":        [-112.08, 38.77],
  "aurora":           [-111.93, 38.92],
  "annabella":        [-112.06, 38.71],
  "joseph":           [-112.20, 38.62],
  "vermilion":        [-112.35, 37.72],
};

export function getCityCoords(city: string): [number, number] | null {
  if (!city) return null;
  return UTAH_CITY_COORDS[city.toLowerCase().trim()] ?? null;
}

export const countyCoordinates: Record<string, [number, number]> = {
  "Beaver":     [-113.2, 38.3],
  "Box Elder":  [-113.1, 41.5],
  "Cache":      [-111.7, 41.7],
  "Carbon":     [-110.6, 39.6],
  "Daggett":    [-109.5, 40.9],
  "Davis":      [-111.9, 40.9],
  "Duchesne":   [-110.4, 40.1],
  "Emery":      [-110.7, 38.9],
  "Garfield":   [-111.4, 37.8],
  "Grand":      [-109.6, 38.9],
  "Iron":       [-113.3, 37.8],
  "Juab":       [-112.8, 39.7],
  "Kane":       [-111.9, 37.3],
  "Millard":    [-113.0, 39.1],
  "Morgan":     [-111.6, 41.1],
  "Piute":      [-112.1, 38.3],
  "Rich":       [-111.2, 41.6],
  "Salt Lake":  [-111.9, 40.7],
  "San Juan":   [-109.8, 37.6],
  "Sanpete":    [-111.6, 39.3],
  "Sevier":     [-111.9, 38.7],
  "Summit":     [-111.0, 40.8],
  "Tooele":     [-113.1, 40.4],
  "Uintah":     [-109.5, 40.1],
  "Utah":       [-111.7, 40.1],
  "Wasatch":    [-111.1, 40.3],
  "Washington": [-113.5, 37.3],
  "Wayne":      [-111.0, 38.3],
  "Weber":      [-112.0, 41.3],
};

export const initialRequests: ResourceRequest[] = [
  {
    id: "req-001",
    name: "San Juan School District",
    eventDate: "2026-04-15",
    zipCode: "84511",
    city: "Blanding",
    county: "San Juan",
    attendeeCount: 320,
    needs: ["Nutrition Toolkits", "On-site Staff"],
    priorityScore: 96,
    impactLevel: "High",
    tags: ["Critical Need", "Rural", "High Priority", "Indigenous Community"],
    fulfillmentMethod: "Staffed",
    aiReasoning: "Critically underserved rural zip (service index −88), large attendance, Indigenous community with documented health disparities, zero prior engagements this quarter.",
    coordinates: [-109.8, 37.6],
    submittedAt: "2026-03-20T10:22:00Z",
  },
  {
    id: "req-002",
    name: "Grand County Public Library",
    eventDate: "2026-04-22",
    zipCode: "84532",
    city: "Moab",
    county: "Grand",
    attendeeCount: 180,
    needs: ["Vaccine Info Packets", "Mental Health Resources"],
    priorityScore: 89,
    impactLevel: "High",
    tags: ["Rural", "High Priority", "High Need"],
    fulfillmentMethod: "Staffed",
    aiReasoning: "Severely underserved county (index −82) with sparse service history. Library reach multiplies community impact beyond direct attendees.",
    coordinates: [-109.6, 38.9],
    submittedAt: "2026-03-20T14:05:00Z",
  },
  {
    id: "req-003",
    name: "Wayne County Health Dept.",
    eventDate: "2026-05-01",
    zipCode: "84775",
    city: "Torrey",
    county: "Wayne",
    attendeeCount: 95,
    needs: ["Nutrition Toolkits", "Diabetes Prevention Kits"],
    priorityScore: 82,
    impactLevel: "High",
    tags: ["Rural", "Underserved", "High Priority"],
    fulfillmentMethod: "Mailed",
    aiReasoning: "Critically underserved (index −76), remote geography with no nearby fulfillment center. Mailed package recommended for cost efficiency.",
    coordinates: [-111.0, 38.3],
    submittedAt: "2026-03-19T09:14:00Z",
  },
  {
    id: "req-004",
    name: "Emery County Clinic",
    eventDate: "2026-04-28",
    zipCode: "84522",
    city: "Castle Dale",
    county: "Emery",
    attendeeCount: 140,
    needs: ["Vaccine Info Packets", "On-site Staff"],
    priorityScore: 78,
    impactLevel: "High",
    tags: ["Rural", "Underserved"],
    fulfillmentMethod: "Staffed",
    aiReasoning: "Critically underserved rural area (index −71). Clinic partnership amplifies credibility and long-term community trust.",
    coordinates: [-110.7, 38.9],
    submittedAt: "2026-03-18T16:45:00Z",
  },
  {
    id: "req-005",
    name: "Piute County Elementary",
    eventDate: "2026-05-10",
    zipCode: "84759",
    city: "Junction",
    county: "Piute",
    attendeeCount: 60,
    needs: ["Nutrition Toolkits", "Dental Health Kits"],
    priorityScore: 74,
    impactLevel: "High",
    tags: ["Rural", "Underserved", "Youth Focus"],
    fulfillmentMethod: "Mailed",
    aiReasoning: "Severely underserved (index −80), small population with disproportionate need. School setting maximises children and family reach.",
    coordinates: [-112.1, 38.3],
    submittedAt: "2026-03-17T11:30:00Z",
  },
  {
    id: "req-006",
    name: "Tooele Valley Community Center",
    eventDate: "2026-04-18",
    zipCode: "84074",
    city: "Tooele",
    county: "Tooele",
    attendeeCount: 210,
    needs: ["Mental Health Resources", "Substance Abuse Toolkits"],
    priorityScore: 58,
    impactLevel: "Medium",
    tags: ["Suburban", "Moderate Need"],
    fulfillmentMethod: "Mailed",
    aiReasoning: "Moderately underserved suburban area (index −32). Good attendance expected; materials delivery sufficient given proximity to distribution hub.",
    coordinates: [-113.1, 40.4],
    submittedAt: "2026-03-16T08:20:00Z",
  },
  {
    id: "req-007",
    name: "Cache Valley Wellness Fair",
    eventDate: "2026-04-25",
    zipCode: "84321",
    city: "Logan",
    county: "Cache",
    attendeeCount: 450,
    needs: ["Nutrition Toolkits", "Vaccine Info Packets"],
    priorityScore: 42,
    impactLevel: "Medium",
    tags: ["Urban", "Balanced Area", "Large Event"],
    fulfillmentMethod: "Mailed",
    aiReasoning: "Balanced service area (index +12) with strong existing infrastructure. Large event warrants engagement; staffing not required.",
    coordinates: [-111.7, 41.7],
    submittedAt: "2026-03-15T13:55:00Z",
  },
  {
    id: "req-008",
    name: "Salt Lake Central Library",
    eventDate: "2026-05-05",
    zipCode: "84101",
    city: "Salt Lake City",
    county: "Salt Lake",
    attendeeCount: 300,
    needs: ["Mental Health Resources"],
    priorityScore: 28,
    impactLevel: "Low",
    tags: ["Urban", "Over-served Area"],
    fulfillmentMethod: "Mailed",
    aiReasoning: "Highly over-served urban area (index +88) with robust existing services. Low priority; standard materials sufficient.",
    coordinates: [-111.9, 40.7],
    submittedAt: "2026-03-14T15:10:00Z",
  },
];

// ── Mock Staff Profiles ──────────────────────────────────────────────────────

export const mockStaffProfiles: StaffProfile[] = [
  {
    id: "staff-001",
    name: "Jamie Chen",
    role: "Community Health Educator",
    email: "j.chen@utahhealth.org",
    phone: "(801) 555-0142",
    address: "1240 E Millcreek Way",
    city: "Salt Lake City",
    county: "Salt Lake",
    coordinates: [-111.87, 40.69],
    availability: [
      { day: 1, startTime: "08:00", endTime: "17:00" },
      { day: 2, startTime: "08:00", endTime: "17:00" },
      { day: 3, startTime: "08:00", endTime: "17:00" },
      { day: 4, startTime: "08:00", endTime: "17:00" },
      { day: 5, startTime: "08:00", endTime: "14:00" },
    ],
    maxTasksPerDay: 2,
    status: "available",
  },
  {
    id: "staff-002",
    name: "Marcus Williams",
    role: "Health Outreach Coordinator",
    email: "m.williams@utahhealth.org",
    phone: "(801) 555-0287",
    address: "847 N University Ave",
    city: "Provo",
    county: "Utah",
    coordinates: [-111.66, 40.23],
    availability: [
      { day: 1, startTime: "07:00", endTime: "16:00" },
      { day: 2, startTime: "07:00", endTime: "16:00" },
      { day: 4, startTime: "07:00", endTime: "16:00" },
      { day: 5, startTime: "07:00", endTime: "16:00" },
    ],
    maxTasksPerDay: 2,
    status: "busy",
  },
  {
    id: "staff-003",
    name: "Aisha Patel",
    role: "Rural Health Specialist",
    email: "a.patel@utahhealth.org",
    phone: "(435) 555-0319",
    address: "320 S Main St",
    city: "Moab",
    county: "Grand",
    coordinates: [-109.55, 38.57],
    availability: [
      { day: 1, startTime: "08:00", endTime: "18:00" },
      { day: 2, startTime: "08:00", endTime: "18:00" },
      { day: 3, startTime: "08:00", endTime: "18:00" },
      { day: 4, startTime: "08:00", endTime: "18:00" },
      { day: 5, startTime: "08:00", endTime: "15:00" },
    ],
    maxTasksPerDay: 1,
    status: "available",
  },
  {
    id: "staff-004",
    name: "Derek Torres",
    role: "Health Promoter",
    email: "d.torres@utahhealth.org",
    phone: "(801) 555-0456",
    address: "512 W 24th St",
    city: "Ogden",
    county: "Weber",
    coordinates: [-111.97, 41.22],
    availability: [
      { day: 1, startTime: "09:00", endTime: "17:00" },
      { day: 2, startTime: "09:00", endTime: "17:00" },
      { day: 3, startTime: "09:00", endTime: "17:00" },
      { day: 5, startTime: "09:00", endTime: "17:00" },
    ],
    maxTasksPerDay: 2,
    status: "available",
  },
];

// ── Mock Staff Tasks (derived from initialRequests where fulfillmentMethod = "Staffed") ──

export const mockStaffTasks: StaffTask[] = [
  {
    id: "task-001",
    requestId: "req-001",
    partnerName: "San Juan School District",
    location: "San Juan High School Gym",
    city: "Blanding",
    county: "San Juan",
    coordinates: [-109.8, 37.6],
    eventDate: "2026-04-15",
    eventTime: "09:00",
    needs: ["Nutrition Toolkits", "On-site Staff"],
    status: "accepted",
    priority: "High",
    attendeeCount: 320,
    fulfillmentMethod: "Staffed",
    travelMinutes: 210,
    notes: "Largest event of Q2. Indigenous community — bring multilingual materials. Coordinate with school principal Maria Runningwater.",
  },
  {
    id: "task-002",
    requestId: "req-002",
    partnerName: "Grand County Public Library",
    location: "Grand County Public Library — Main Hall",
    city: "Moab",
    county: "Grand",
    coordinates: [-109.6, 38.9],
    eventDate: "2026-04-22",
    eventTime: "10:00",
    needs: ["Vaccine Info Packets", "Mental Health Resources"],
    status: "pending",
    priority: "High",
    attendeeCount: 180,
    fulfillmentMethod: "Staffed",
    travelMinutes: 15,
    notes: "Library has A/V setup. Request confirmed with librarian on 2026-03-18.",
  },
  {
    id: "task-003",
    requestId: "req-004",
    partnerName: "Emery County Clinic",
    location: "Emery County Clinic — Community Room",
    city: "Castle Dale",
    county: "Emery",
    coordinates: [-110.7, 38.9],
    eventDate: "2026-04-28",
    eventTime: "13:00",
    needs: ["Vaccine Info Packets", "On-site Staff"],
    status: "pending",
    priority: "High",
    attendeeCount: 140,
    fulfillmentMethod: "Staffed",
    travelMinutes: 135,
    notes: "Clinic has parking for supply vehicle. Dr. Holloway is the on-site contact.",
  },
  {
    id: "task-004",
    requestId: "req-006",
    partnerName: "Tooele Valley Community Center",
    location: "Tooele Valley Community Center",
    city: "Tooele",
    county: "Tooele",
    coordinates: [-113.1, 40.4],
    eventDate: "2026-04-18",
    eventTime: "14:00",
    needs: ["Mental Health Resources", "Substance Abuse Toolkits"],
    status: "in_progress",
    priority: "Medium",
    attendeeCount: 210,
    fulfillmentMethod: "Staffed",
    travelMinutes: 40,
    notes: "Evening session possible if needed. Confirm attendee headcount 48h before event.",
  },
  {
    id: "task-005",
    requestId: "req-007",
    partnerName: "Cache Valley Wellness Fair",
    location: "Utah State University — Taggart Center",
    city: "Logan",
    county: "Cache",
    coordinates: [-111.7, 41.7],
    eventDate: "2026-04-25",
    eventTime: "08:30",
    needs: ["Nutrition Toolkits", "Vaccine Info Packets"],
    status: "pending",
    priority: "Medium",
    attendeeCount: 450,
    fulfillmentMethod: "Staffed",
    travelMinutes: 85,
    notes: "Largest fair in northern Utah. Set-up begins 1 hour before. Booth #12 pre-assigned.",
  },
];

export const triageRequest = (
  formData: { county?: string; attendeeCount: string | number; needs?: string[] }
): TriageResult => {
  const county = Object.values(utahCountyData).find(
    (c) => c.name.toLowerCase() === (formData.county ?? "").toLowerCase()
  );
  const serviceIndex = county?.serviceIndex ?? 0;
  const attendees =
    typeof formData.attendeeCount === "string"
      ? parseInt(formData.attendeeCount) || 50
      : formData.attendeeCount ?? 50;

  const needScore  = Math.max(0, -serviceIndex);
  const sizeScore  = Math.min(30, Math.floor(attendees / 15));
  const ruralBonus = serviceIndex < -50 ? 15 : serviceIndex < -25 ? 8 : 0;
  const rawScore   = Math.min(99, Math.floor(needScore * 0.6 + sizeScore + ruralBonus + 5));

  const impactLevel: ImpactLevel =
    rawScore >= 70 ? "High" : rawScore >= 45 ? "Medium" : "Low";

  const tags: string[] = [];
  if (serviceIndex < -65)      tags.push("Critically Underserved");
  else if (serviceIndex < -30) tags.push("Underserved");
  else if (serviceIndex > 50)  tags.push("Over-served Area");
  else                         tags.push("Balanced Area");
  if (serviceIndex < -30)                               tags.push("Rural");
  if (attendees > 200)                                  tags.push("Large Event");
  if (rawScore >= 70)                                   tags.push("High Priority");
  if ((formData.needs ?? []).includes("On-site Staff")) tags.push("Staff Request");

  const fulfillmentMethod: FulfillmentMethod =
    rawScore >= 70 && (formData.needs ?? []).includes("On-site Staff") ? "Staffed" :
    rawScore >= 55 ? "Staffed" : "Mailed";

  const aiReasoning =
    serviceIndex < -65
      ? `Critically underserved county (service index ${serviceIndex}) with documented resource gap. ${attendees > 150 ? "Large attendance multiplies community impact." : "High-need community warrants priority allocation."}`
      : serviceIndex < -30
      ? `Underserved area (index ${serviceIndex}) with limited existing services. ${attendees > 100 ? "Sizeable event audience." : "Targeted intervention recommended."}`
      : serviceIndex > 50
      ? `Well-served urban area (index +${serviceIndex}). Existing infrastructure covers routine needs; standard materials sufficient.`
      : `Balanced service area (index ${serviceIndex > 0 ? "+" : ""}${serviceIndex}). ${attendees > 250 ? "Large event size elevates priority." : "Standard fulfillment recommended."}`;

  return { priorityScore: rawScore, impactLevel, tags, fulfillmentMethod, aiReasoning };
};
