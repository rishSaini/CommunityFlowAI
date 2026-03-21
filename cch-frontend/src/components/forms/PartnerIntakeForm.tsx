import { useState } from "react";
import {
  Send, Loader2, CheckCircle2, Building2,
  CalendarDays, MapPin, Users, UserCheck,
  ChevronDown, Sparkles, Utensils, ShieldCheck,
  Heart, Activity, Smile, Leaf,
} from "lucide-react";
import { utahCountyData, triageRequest, countyCoordinates } from "../../data/mockData";
import type { ResourceRequest, FormData } from "../../types/index";
import PostGenerator from "../social/PostGenerator";

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
  onSubmit: (req: ResourceRequest) => void;
  onReset: () => void;
}

export default function PartnerIntakeForm({ form, onChange, flashFields = [], onSubmit, onReset }: Props) {
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [savedForm, setSavedForm]     = useState<FormData | null>(null);
  const [savedScore, setSavedScore]   = useState(0);

  const set = (field: keyof FormData, value: string) =>
    onChange({ [field]: value });

  const toggleNeed = (need: string) =>
    onChange({
      needs: form.needs.includes(need)
        ? form.needs.filter((n) => n !== need)
        : [...form.needs, need],
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1800));
    const triage = triageRequest({ ...form });
    const coords = countyCoordinates[form.county] ?? [-111.5, 39.5];
    onSubmit({
      id: `req-${Date.now()}`,
      ...form,
      attendeeCount: parseInt(form.attendeeCount) || 0,
      coordinates: coords as [number, number],
      ...triage,
      submittedAt: new Date().toISOString(),
    });
    setSavedForm({ ...form });
    setSavedScore(triage.priorityScore);
    setSubmitting(false);
    setSubmitted(true);
  };

  const isValid = form.name && form.eventDate && form.city && form.county &&
    form.zipCode && form.attendeeCount && form.needs.length > 0;

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
      <div className="animate-fade-in space-y-5">
        {/* Success header */}
        <div className="flex items-center gap-4 p-5 bg-sage-50 border border-sage-200 rounded-3xl">
          <div className="w-12 h-12 rounded-2xl bg-sage-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={22} className="text-paper" />
          </div>
          <div>
            <h3 className="font-semibold text-ink text-base" style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "18px" }}>
              Request Submitted
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Priority score: <span className="font-bold text-sage-700">{savedScore}</span> · AI triage in progress
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-[11px] text-sage-700 font-semibold">
            <Sparkles size={11} /> AI-powered
          </div>
        </div>
        {/* Social post generator */}
        <PostGenerator form={savedForm} priorityScore={savedScore} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Organization Name */}
      <div>
        <label className={labelBase}>Organization Name *</label>
        <div className="relative">
          <Building2 size={14} className={iconLeft} />
          <input
            type="text" value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g., Hillcrest High School"
            className={`${inputBase} pl-9 pr-4 ${flash("name")}`}
            required
          />
        </div>
      </div>

      {/* Event Date */}
      <div>
        <label className={labelBase}>Event Date *</label>
        <div className="relative">
          <CalendarDays size={14} className={iconLeft} />
          <input
            type="date" value={form.eventDate}
            onChange={(e) => set("eventDate", e.target.value)}
            className={`${inputBase} pl-9 pr-4 ${flash("eventDate")}`}
            required
          />
        </div>
      </div>

      {/* City + County */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelBase}>City *</label>
          <div className="relative">
            <MapPin size={14} className={iconLeft} />
            <input
              type="text" value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Midvale"
              className={`${inputBase} pl-9 pr-3 ${flash("city")}`}
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
              type="text" value={form.zipCode}
              onChange={(e) => set("zipCode", e.target.value)}
              placeholder="84047" maxLength={5}
              className={`${inputBase} pl-9 pr-3 ${flash("zipCode")}`}
              required
            />
          </div>
        </div>
        <div>
          <label className={labelBase}>Attendees *</label>
          <div className="relative">
            <Users size={14} className={iconLeft} />
            <input
              type="number" value={form.attendeeCount}
              onChange={(e) => set("attendeeCount", e.target.value)}
              placeholder="150" min={1}
              className={`${inputBase} pl-9 pr-3 ${flash("attendeeCount")}`}
              required
            />
          </div>
        </div>
      </div>

      {/* Resources Needed */}
      <div>
        <label className={labelBase}>
          Resources Needed * <span className="normal-case font-normal text-ink-faint">— select all that apply</span>
        </label>
        <div className={`grid grid-cols-2 gap-1.5 p-2 transition-all duration-300 ${
          flashFields.includes("needs") ? "bg-sage-50 ring-2 ring-sage-100" : ""
        }`}>
          {NEEDS.map(({ label, icon, staff }) => {
            const sel = form.needs.includes(label);
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
