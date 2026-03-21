export type ImpactLevel      = "High" | "Medium" | "Low";
export type FulfillmentMethod = "Staffed" | "Mailed";
export type TaskStatus        = "pending" | "accepted" | "in_progress" | "complete" | "conflict";
export type StaffStatus       = "available" | "busy" | "off_duty";

export interface CountyData {
  name: string;
  serviceIndex: number;
  population: number;
}

export interface ResourceRequest {
  id: string;
  name: string;
  eventDate: string;
  zipCode: string;
  city: string;
  county: string;
  attendeeCount: number;
  needs: string[];
  priorityScore: number;
  impactLevel: ImpactLevel;
  tags: string[];
  fulfillmentMethod: FulfillmentMethod;
  aiReasoning: string;
  coordinates: [number, number];
  submittedAt: string;
}

export interface FormData {
  requestor_name: string;
  requestor_email: string;
  requestor_phone: string;
  event_name: string;
  event_date: string;
  event_time: string;
  event_city: string;
  event_zip: string;
  county: string;
  fulfillment_type: "staff" | "mail" | "pickup" | "";
  mailing_address: string;
  estimated_attendees: string;
  materials_requested: string[];
  special_instructions: string;
}

export interface TriageResult {
  priorityScore: number;
  impactLevel: ImpactLevel;
  tags: string[];
  fulfillmentMethod: FulfillmentMethod;
  aiReasoning: string;
}

export interface DayAvailability {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun, 1=Mon … 6=Sat
  startTime: string; // "08:00"
  endTime: string;   // "17:00"
}

export interface StaffProfile {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  county: string;
  coordinates: [number, number];
  availability: DayAvailability[];
  maxTasksPerDay: number;
  status: StaffStatus;
}

export interface StaffTask {
  id: string;
  requestId: string;
  partnerName: string;
  location: string;
  city: string;
  county: string;
  coordinates: [number, number];
  eventDate: string;
  eventTime: string;
  needs: string[];
  status: TaskStatus;
  priority: ImpactLevel;
  attendeeCount: number;
  fulfillmentMethod: FulfillmentMethod;
  travelMinutes: number;
  notes: string;
  isShared?: boolean;
}

// ── Shift Assignments (Calendar) ─────────────────────────────
export interface ShiftAssignment {
  id: string;
  user_id: string;
  user_name: string;
  user_classification: string | null;
  date: string;
  start_time: string;
  end_time: string;
  location_id: string | null;
  location_name: string | null;
  shift_type: string;
  status: string;
  request_id: string | null;
  request_name: string | null;
  color: string | null;
  notes: string | null;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
  is_default: boolean;
}

export interface CalendarEmployee {
  id: string;
  full_name: string;
  classification: string | null;
  classification_display: string | null;
  is_on_duty: boolean;
  current_workload: number;
  max_workload: number;
}

export interface CalendarTask {
  request_id: string;
  event_name: string;
  event_date: string;
  event_time: string | null;
  event_city: string;
  assigned_users: { user_id: string; user_name: string; role: string }[];
  urgency_level: string;
  priority_score: number | null;
  status: string;
  fulfillment_type: string;
}

export interface CoverageCell {
  date: string;
  hour: number;
  scheduled_count: number;
  task_count: number;
  coverage_ratio: number;
  level: "over" | "balanced" | "under" | "critical";
}

export interface AIScheduleSuggestion {
  user_id: string;
  user_name: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
  confidence: number;
  fills_gap: boolean;
}

export interface RequestAssignmentInfo {
  id: string;
  request_id: string;
  user_id: string;
  user_name: string;
  user_classification: string | null;
  role: string;
  assigned_at: string | null;
  notes: string | null;
}
