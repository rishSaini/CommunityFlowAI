/**
 * CommunityFlow AI — Frontend API Service Layer
 * Connects to FastAPI backend at VITE_API_BASE
 */

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api";

// ── Token helpers ─────────────────────────────────────────────────────────
export const getToken = () => localStorage.getItem("cch_token");
export const setToken = (t: string) => localStorage.setItem("cch_token", t);
export const clearToken = () => localStorage.removeItem("cch_token");

// ── Base fetch wrapper ────────────────────────────────────────────────────
async function req<T>(
  path: string,
  opts: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> ?? {}),
  };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body?.detail ?? res.statusText, res.status);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// ── Types ─────────────────────────────────────────────────────────────────
export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "staff" | "partner";
  classification?: string;
  classification_display?: string;
  phone?: string;
  is_on_duty: boolean;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface RequestResponse {
  id: string;
  status: string;
  fulfillment_type: string;
  urgency_level: string;
  ai_priority_score?: number;
  requestor_name: string;
  requestor_email: string;
  requestor_phone: string;
  event_name: string;
  event_date: string;
  event_time?: string;
  event_city: string;
  event_zip: string;
  estimated_attendees?: number;
  materials_requested?: string[];
  ai_summary?: string;
  ai_tags?: string[];
  special_instructions?: string;
  created_at?: string;
}

export interface RequestListResponse {
  requests: RequestResponse[];
  total: number;
  page: number;
  per_page: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatbotResponse {
  reply: string;
  field_updates: Record<string, unknown>;
}

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    req<TokenResponse>("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, false),

  me: () => req<UserResponse>("/me"),
};

// ── Requests ──────────────────────────────────────────────────────────────
export const requestsApi = {
  list: (page = 1, perPage = 50) =>
    req<RequestListResponse>(`/requests?page=${page}&per_page=${perPage}`),

  get: (id: string) => req<RequestResponse>(`/requests/${id}`),

  create: (data: Record<string, unknown>) =>
    req<RequestResponse>("/requests", {
      method: "POST",
      body: JSON.stringify(data),
    }, false), // public endpoint

  updateStatus: (id: string, status: string) =>
    req(`/requests/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  statusTracker: (token: string) =>
    req(`/requests/status/${token}`, {}, false),
};

// ── Chatbot ───────────────────────────────────────────────────────────────
export const chatbotApi = {
  sendMessage: (messages: ChatMessage[], currentFormState: Record<string, unknown>) =>
    req<ChatbotResponse>("/chatbot", {
      method: "POST",
      body: JSON.stringify({ messages, current_form_state: currentFormState }),
    }, false),
};

// ── Employees ─────────────────────────────────────────────────────────────
export const employeesApi = {
  list: () => req<{ employees: UserResponse[]; total: number }>("/employees"),

  get: (id: string) => req<UserResponse>(`/employees/${id}`),

  update: (id: string, data: Partial<UserResponse>) =>
    req<UserResponse>(`/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  checkin: (lat: number, lng: number) =>
    req("/staff/checkin", {
      method: "POST",
      body: JSON.stringify({ lat, lng }),
    }),
};

// ── Admin ─────────────────────────────────────────────────────────────────
export const adminApi = {
  overridePriority: (id: string, score: number, justification: string) =>
    req(`/admin/requests/${id}/priority`, {
      method: "PATCH",
      body: JSON.stringify({ priority_score: score, justification }),
    }),

  notificationLog: (page = 1) =>
    req(`/admin/notifications/log?page=${page}`),
};
