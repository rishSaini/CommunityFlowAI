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
  assigned_location_ids?: string[];
  is_on_duty: boolean;
  is_active: boolean;
  current_workload: number;
  max_workload: number;
  hire_date?: string;
  created_at: string;
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
  priority_score?: number;
  ai_priority_score?: number;
  requestor_name: string;
  requestor_email: string;
  requestor_phone: string;
  event_name: string;
  event_date: string;
  event_time?: string;
  event_city: string;
  event_zip: string;
  event_lat?: number;
  event_lng?: number;
  estimated_attendees?: number;
  materials_requested?: Array<string | { material_id: string; quantity: number }>;
  ai_summary?: string;
  ai_tags?: string[];
  ai_flags?: Record<string, unknown>;
  priority_justification?: string;
  special_instructions?: string;
  assigned_staff_id?: string;
  chatbot_used?: boolean;
  created_at: string;
  updated_at?: string;
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
  list: () => req<UserResponse[]>("/employees"),

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

// ── Notifications (SMS) ──────────────────────────────────────────────────
export interface NotificationLogEntry {
  id: string;
  request_id: string | null;
  recipient_phone: string | null;
  recipient_name: string | null;
  channel: string | null;
  urgency_level: string | null;
  message_body: string | null;
  sent_at: string | null;
  status: string;
  queued_until: string | null;
}

export interface NotificationLogList {
  notifications: NotificationLogEntry[];
  total: number;
  page: number;
  per_page: number;
}

export interface SMSTemplate {
  key: string;
  template: string;
  description: string;
}

export interface SendSMSResult {
  success: boolean;
  sid: string | null;
  error: string | null;
  message_preview: string;
}

export const notificationsApi = {
  getLog: (page = 1, filters?: { channel?: string; status?: string; urgency?: string; search?: string }) => {
    const params = new URLSearchParams({ page: String(page) });
    if (filters?.channel) params.set("channel", filters.channel);
    if (filters?.status) params.set("notification_status", filters.status);
    if (filters?.urgency) params.set("urgency_level", filters.urgency);
    if (filters?.search) params.set("search", filters.search);
    return req<NotificationLogList>(`/notifications/log?${params}`);
  },

  getTemplates: () => req<SMSTemplate[]>("/notifications/templates"),

  sendSMS: (toPhone: string, message: string, recipientName = "Manual", requestId?: string) =>
    req<SendSMSResult>("/notifications/send-sms", {
      method: "POST",
      body: JSON.stringify({ to_phone: toPhone, message, recipient_name: recipientName, request_id: requestId }),
    }),

  sendTest: (toPhone: string) =>
    req<SendSMSResult>("/notifications/test", {
      method: "POST",
      body: JSON.stringify({ to_phone: toPhone }),
    }),
};

// ── Schedule & Calendar ──────────────────────────────────────────────────
import type {
  ShiftAssignment, ShiftTemplate, CalendarEmployee, CalendarTask,
  CoverageCell, AIScheduleSuggestion, RequestAssignmentInfo,
} from "../types/index";

interface TeamCalendarData {
  shifts: ShiftAssignment[];
  tasks: CalendarTask[];
  employees: CalendarEmployee[];
}

interface MyCalendarData {
  shifts: ShiftAssignment[];
  tasks: CalendarTask[];
}

interface CoverageData {
  cells: CoverageCell[];
  summary: { total_gaps: number; worst_day: string | null; suggestion_count: number };
}

interface AISuggestData {
  suggestions: AIScheduleSuggestion[];
  narrative: string;
}

export const scheduleApi = {
  // Team calendar (admin)
  getTeamCalendar: (start: string, end: string) =>
    req<TeamCalendarData>(`/schedule/team?start=${start}&end=${end}`),

  // Personal calendar (staff)
  getMyCalendar: (start: string, end: string) =>
    req<MyCalendarData>(`/schedule/me?start=${start}&end=${end}`),

  // Shift CRUD
  createShift: (data: {
    user_id: string; date: string; start_time: string; end_time: string;
    location_id?: string; shift_type?: string; request_id?: string;
    color?: string; notes?: string;
  }) =>
    req<ShiftAssignment>("/schedule/shifts", { method: "POST", body: JSON.stringify(data) }),

  createShiftsBulk: (shifts: Array<{
    user_id: string; date: string; start_time: string; end_time: string;
    location_id?: string; shift_type?: string; color?: string;
  }>) =>
    req<{ created: number; skipped: number }>("/schedule/shifts/bulk", {
      method: "POST", body: JSON.stringify({ shifts }),
    }),

  updateShift: (id: string, data: Record<string, unknown>) =>
    req<ShiftAssignment>(`/schedule/shifts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteShift: (id: string) =>
    req<{ message: string }>(`/schedule/shifts/${id}`, { method: "DELETE" }),

  // Generate from patterns
  generate: (startDate: string, endDate: string, userIds?: string[], overwrite = false) =>
    req<{ created: number; skipped: number; details: string }>("/schedule/generate", {
      method: "POST",
      body: JSON.stringify({ start_date: startDate, end_date: endDate, user_ids: userIds, overwrite }),
    }),

  // Coverage
  getCoverage: (start: string, end: string) =>
    req<CoverageData>(`/schedule/coverage?start=${start}&end=${end}`),

  // AI suggestions
  getAISuggestions: (startDate: string, endDate: string) =>
    req<AISuggestData>("/schedule/ai-suggest", {
      method: "POST",
      body: JSON.stringify({ start_date: startDate, end_date: endDate }),
    }),

  // Templates
  getTemplates: () => req<ShiftTemplate[]>("/schedule/templates"),

  createTemplate: (data: { name: string; start_time: string; end_time: string; color?: string }) =>
    req<ShiftTemplate>("/schedule/templates", { method: "POST", body: JSON.stringify(data) }),

  deleteTemplate: (id: string) =>
    req<{ message: string }>(`/schedule/templates/${id}`, { method: "DELETE" }),
};

// ── Dispatch (multi-staff) ──────────────────────────────────────────────
export const dispatchApi = {
  getCandidates: (requestId: string) =>
    req<{ candidates: unknown[]; cluster_opportunities: unknown[] }>(`/dispatch/${requestId}/candidates`),

  assignTeam: (requestId: string, staffId: string, additionalStaffIds: string[] = [], roles?: Record<string, string>) =>
    req<RequestResponse>(`/dispatch/${requestId}/assign`, {
      method: "POST",
      body: JSON.stringify({
        staff_id: staffId,
        additional_staff_ids: additionalStaffIds,
        roles,
      }),
    }),

  getTeam: (requestId: string) =>
    req<RequestAssignmentInfo[]>(`/dispatch/${requestId}/team`),

  addTeamMembers: (requestId: string, staffIds: string[], roles?: Record<string, string>) =>
    req<{ added: unknown[]; count: number }>(`/dispatch/${requestId}/team/add`, {
      method: "POST",
      body: JSON.stringify({ staff_ids: staffIds, roles }),
    }),

  removeTeamMember: (requestId: string, userId: string) =>
    req<{ message: string }>(`/dispatch/${requestId}/team/${userId}`, { method: "DELETE" }),
};
