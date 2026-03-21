export type ImpactLevel = "High" | "Medium" | "Low";
export type FulfillmentMethod = "Staffed" | "Mailed";

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
