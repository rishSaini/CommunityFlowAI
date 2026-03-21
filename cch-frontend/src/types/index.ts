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
  name: string;
  eventDate: string;
  city: string;
  county: string;
  zipCode: string;
  attendeeCount: string;
  needs: string[];
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
}
