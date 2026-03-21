import { useState } from "react";
import {
  Send, Loader2, CheckCircle2, Building2,
  CalendarDays, MapPin, Users, UserCheck,
  ChevronDown, Sparkles, Utensils, ShieldCheck,
  Heart, Activity, Smile, Leaf, Mail, Phone,
  Tag, FileText, Clock, Share2,
} from "lucide-react";
import { utahCountyData, countyCoordinates, triageRequest } from "../../data/mockData";
import { requestsApi } from "../../lib/api";
import type { ResourceRequest, FormData } from "../../types/index";

const NEEDS: { label: string; icon: React.ReactNode; staff: boolean }[] = [
  { label: "Nutrition Toolkits",       icon: <Utensils    size={13} />, staff: false },
  { label: "Vaccine Info Packets",     icon: <ShieldCheck size={13} />, staff: false },
  { label: "Mental Health Resources",  icon: <Heart       size={13} />, staff: false },
  { label: "Diabetes Prevention Kits", icon: <Activity    size={13} />, staff: false },
  { label: "Dental Health Kits",       icon: <Smile       size={13} />, staff: false },
  { label: "Substance Abuse Toolkits", icon: <Leaf        size={13} />, staff: false },
  { label: "On-site Staff",            icon: <UserCheck   size={13} />, staff: true  },
];

const COUNTIES = Object.values(utahCountyData).map((c) => c.name).sort();

type FlashField = keyof FormData;

interface Props {
  form: FormData;
  onChange: (updates: Partial<FormData>) => void;
  flashFields?: FlashField[];
  onSubmit: (req: ResourceRequest, submittedForm: FormData, score: number) => void;
  onReset: () => void;
}

export default function PartnerIntakeForm({ form, onChange, flashFields = [], onSubmit, onReset }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [savedForm, setSavedForm]   = useState<FormData | null>(null);
  const [savedScore, setSavedScore] = useState(0);
  const [error, setError]           = useState<string | null>(null);

  const set = (field: keyof FormData, value: string) => onChange({ [field]: value });

  const toggleNeed = (need: string) =>
    onChange({
      materials_requested: form.materials_requested.includes(need)
        ? form.materials_requested.filter((n) => n !== need)
        : [...form.materials_requested, need],
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Build the request payload matching the backend schema
      const fType = form.fulfillment_type || "staff";
      const payload = {
        requestor_name:       form.requestor_name,
        requestor_email:      form.requestor_email,
        requestor_phone:      form.requestor_phone,
        event_name:           form.event_name || form.requestor_name,
        event_date:           form.event_date,
        event_time:           form.event_time || null,
        event_city:           form.event_city,
        event_zip:            form.event_zip,
        fulfillment_type:     fType,
        mailing_address:      fType === "mail" ? (form.mailing_address || `${form.event_city}, UT ${form.event_zip}`) : null,
        estimated_attendees:  parseInt(form.estimated_attendees) || null,
        materials_requested:  form.materials_requested,
        special_instructions: form.special_instructions || null,
      };

      const response = await requestsApi.create(payload as Record<string, unknown>);

      // Build local ResourceRequest for the dashboard (use backend fields + triage fallback)
      const triage = triageRequest({ ...form });
      const coords = countyCoordinates[form.county] ?? [-111.5, 39.5];

      const req: ResourceRequest = {
        id:              response.id,
        name:            form.requestor_name,
        eventDate:       form.event_date,
        zipCode:         form.event_zip,
        city:            form.event_city,
        county:          form.county,
        attendeeCount:   parseInt(form.estimated_attendees) || 0,
        needs:           form.materials_requested,
        priorityScore:   response.priority_score ?? triage.priorityScore,
        impactLevel:     triage.impactLevel,
        tags:            response.ai_tags ?? triage.tags,
        fulfillmentMethod: form.fulfillment_type === "staff" ? "Staffed" : "Mailed",
        aiReasoning:     response.ai_summary ?? triage.aiReasoning,
        coordinates:     coords as [number, number],
        submittedAt:     response.created_at ?? new Date().toISOString(),
      };

      const snapshot = { ...form };
      onSubmit(req, snapshot, req.priorityScore);
      setSavedForm(snapshot);
      setSavedScore(req.priorityScore);
      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Submission failed. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const isValid =
    form.requestor_name &&
    form.requestor_email &&
    form.event_date &&
    form.event_city &&
    form.county &&
    form.event_zip &&
    form.estimated_attendees &&
    form.materials_requested.length > 0 &&
    (form.fulfillment_type !== "mail" || form.mailing_address);

  // Flash = autofilled by chatbot → gentle sage highlight
  const flash = (field: FlashField) =>
    flashFields.includes(field)
      ? "border-sage-600 bg-sage-50 ring-2 ring-sage-100"
      : "border-sand-200 bg-white focus:border-sage-600 focus:bg-white focus:ring-0";

  const inputBase = "w-full py-2.5 rounded-xl border text-sm text-ink placeholder-ink-faint focus:outline-none transition-all duration-200";
  const labelBase = "block text-[10px] font-semibold text-ink-muted uppercase tracking-[0.1em] mb-1.5";
  const iconLeft  = "absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint z-10";

  if (submitted && savedForm) {
    return (
      <div className="animate-fade-in space-y-4">
        <div className="flex items-center gap-4 p-5 bg-sage-50 border border-sage-200 rounded-3xl">
          <div className="w-12 h-12 rounded-2xl bg-sage-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={22} className="text-paper" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-ink text-base" style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "18px" }}>
              Request Submitted
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Priority score: <span className="font-bold text-sage-700">{savedScore}</span> · AI triage in progress
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-sage-700 font-semibold">
            <Sparkles size={11} /> AI-powered
          </div>
        </div>

        <div className="p-4 bg-white border border-sand-200 rounded-3xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-sand-100 flex items-center justify-center flex-shrink-0">
            <Share2 size={16} className="text-ink-muted" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">Your marketing kit is ready</p>
            <p className="text-xs text-ink-muted mt-0.5">LinkedIn post · Instagram caption · Email template · Print flyer</p>
          </div>
        </div>

        <button
          onClick={() => { setSubmitted(false); onReset(); }}
          className="w-full py-2.5 rounded-2xl border border-sand-200 text-sm text-ink-muted hover:text-ink hover:border-sand-300 transition-colors"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Organization + Contact */}
      <div>
        <label className={labelBase}>Organization Name *</label>
        <div className="relative">
          <Building2 size={14} className={iconLeft} />
          <input
            type="text" value={form.requestor_name}
            onChange={(e) => set("requestor_name", e.target.value)}
            placeholder="e.g., Hillcrest High School"
            className={`${inputBase} pl-9 pr-4 ${flash("requestor_name")}`}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelBase}>Contact Email *</label>
          <div className="relative">
            <Mail size={14} className={iconLeft} />
            <input
              type="email" value={form.requestor_email}
              onChange={(e) => set("requestor_email", e.target.value)}
              placeholder="name@org.com"
              className={`${inputBase} pl-9 pr-3 ${flash("requestor_email")}`}
              required
            />
          </div>
        </div>
        <div>
          <label className={labelBase}>Phone</label>
          <div className="relative">
            <Phone size={14} className={iconLeft} />
            <input
              type="tel" value={form.requestor_phone}
              onChange={(e) => set("requestor_phone", e.target.value)}
              placeholder="(801) 555-0100"
              className={`${inputBase} pl-9 pr-3 ${flash("requestor_phone")}`}
            />
          </div>
        </div>
      </div>

      {/* Event Name */}
      <div>
        <label className={labelBase}>Event Name</label>
        <div className="relative">
          <Tag size={14} className={iconLeft} />
          <input
            type="text" value={form.event_name}
            onChange={(e) => set("event_name", e.target.value)}
            placeholder="e.g., Community Health Fair 2026"
            className={`${inputBase} pl-9 pr-4 ${flash("event_name")}`}
          />
        </div>
      </div>

      {/* Event Date + Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelBase}>Event Date *</label>
          <div className="relative">
            <CalendarDays size={14} className={iconLeft} />
            <input
              type="date" value={form.event_date}
              onChange={(e) => set("event_date", e.target.value)}
              className={`${inputBase} pl-9 pr-4 ${flash("event_date")}`}
              required
            />
          </div>
        </div>
        <div>
          <label className={labelBase}>Start Time</label>
          <div className="relative">
            <Clock size={14} className={iconLeft} />
            <input
              type="time" value={form.event_time}
              onChange={(e) => set("event_time", e.target.value)}
              className={`${inputBase} pl-9 pr-3 ${flash("event_time")}`}
            />
          </div>
        </div>
      </div>

      {/* City + County */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelBase}>City *</label>
          <div className="relative">
            <MapPin size={14} className={iconLeft} />
            <input
              type="text" value={form.event_city}
              onChange={(e) => set("event_city", e.target.value)}
              placeholder="Midvale"
              className={`${inputBase} pl-9 pr-3 ${flash("event_city")}`}
              required
            />
          </div>
        </div>
        <div>
          <label className={labelBase}>County *</label>
          <div className="relative">
            <select
              value={form.county}
              onChange={(e) => set("county", e.target.value)}
              className={`${inputBase} pl-3 pr-8 appearance-none ${flash("county")}`}
              required
            >
              <option value="">Select…</option>
              {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Zip + Attendees */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelBase}>Zip Code *</label>
          <div className="relative">
            <MapPin size={14} className={iconLeft} />
            <input
              type="text" value={form.event_zip}
              onChange={(e) => set("event_zip", e.target.value)}
              placeholder="84047" maxLength={5}
              className={`${inputBase} pl-9 pr-3 ${flash("event_zip")}`}
              required
            />
          </div>
        </div>
        <div>
          <label className={labelBase}>Attendees *</label>
          <div className="relative">
            <Users size={14} className={iconLeft} />
            <input
              type="number" value={form.estimated_attendees}
              onChange={(e) => set("estimated_attendees", e.target.value)}
              placeholder="150" min={1}
              className={`${inputBase} pl-9 pr-3 ${flash("estimated_attendees")}`}
              required
            />
          </div>
        </div>
      </div>

      {/* Fulfillment Type */}
      <div>
        <label className={labelBase}>Fulfillment Preference</label>
        <div className="grid grid-cols-3 gap-2">
          {(["mail", "staff", "pickup"] as const).map((type) => {
            const labels = { mail: "Mailed Kit", staff: "On-site Staff", pickup: "Pickup" };
            const sel = form.fulfillment_type === type;
            return (
              <button
                key={type} type="button"
                onClick={() => set("fulfillment_type", type)}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  sel
                    ? "border-sage-600 bg-sage-50 text-sage-800"
                    : "border-sand-200 bg-white text-ink-muted hover:border-sand-300"
                }`}
              >
                {labels[type]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mailing address — only when mail fulfillment */}
      {form.fulfillment_type === "mail" && (
        <div>
          <label className={labelBase}>Mailing Address *</label>
          <div className="relative">
            <MapPin size={14} className={iconLeft} />
            <input
              type="text" value={form.mailing_address}
              onChange={(e) => set("mailing_address", e.target.value)}
              placeholder="123 Main St, Salt Lake City, UT 84101"
              className={`${inputBase} pl-9 pr-4 ${flash("mailing_address" as keyof FormData)}`}
              required
            />
          </div>
          <p className="text-[10px] text-ink-faint mt-1">Where should materials be shipped?</p>
        </div>
      )}

      {/* Resources Needed */}
      <div>
        <label className={labelBase}>
          Resources Needed * <span className="normal-case font-normal text-ink-faint">— select all that apply</span>
        </label>
        <div className={`grid grid-cols-2 gap-1.5 p-2 transition-all duration-300 ${
          flashFields.includes("materials_requested") ? "bg-sage-50 ring-2 ring-sage-100" : ""
        }`}>
          {NEEDS.map(({ label, icon, staff }) => {
            const sel = form.materials_requested.includes(label);
            return (
              <button
                key={label} type="button"
                onClick={() => toggleNeed(label)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-xs font-medium transition-all duration-150 text-left ${
                  sel
                    ? staff
                      ? "border-clay-600 bg-clay-50 text-clay-700"
                      : "border-sage-600 bg-sage-50 text-sage-800"
                    : "border-sand-200 bg-white text-ink-muted hover:border-sand-300 hover:text-ink"
                }`}
              >
                <span className="flex-shrink-0">{icon}</span>
                <span className="leading-tight flex-1">{label}</span>
                {sel && (
                  <div className={`w-3.5 h-3.5 flex items-center justify-center flex-shrink-0 ${staff ? "text-clay-600" : "text-sage-600"}`}>
                    <svg viewBox="0 0 8 8" className="w-2.5 h-2.5">
                      <path d="M1.5 4L3 5.5L6.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Special Instructions */}
      <div>
        <label className={labelBase}>Special Instructions</label>
        <div className="relative">
          <FileText size={14} className="absolute left-3 top-3 text-ink-faint z-10" />
          <textarea
            value={form.special_instructions}
            onChange={(e) => set("special_instructions", e.target.value)}
            placeholder="Any accessibility needs, parking info, preferred contact window…"
            rows={3}
            className={`${inputBase} pl-9 pr-4 pt-2.5 resize-none ${flash("special_instructions")}`}
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!isValid || submitting}
        className={`w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 ${
          isValid && !submitting
            ? "bg-sage-800 text-paper hover:bg-sage-900 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
            : "bg-sand-100 text-ink-faint cursor-not-allowed border border-sand-200"
        }`}
      >
        {submitting
          ? <><Loader2 size={14} className="animate-spin" />Processing…</>
          : <><Send size={14} />Submit Resource Request</>}
      </button>
    </form>
  );
}
