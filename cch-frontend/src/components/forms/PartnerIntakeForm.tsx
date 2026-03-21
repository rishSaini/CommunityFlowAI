import { useState, useEffect } from "react";
import {
  Send, Loader2, CheckCircle2, Building2,
  CalendarDays, MapPin, Users, Package,
  UserCheck, ChevronDown, Sparkles,
} from "lucide-react";
import { utahCountyData, triageRequest, countyCoordinates } from "../../data/mockData";
import type { ResourceRequest, FormData } from "../../types/index";

const NEEDS = [
  { label: "Nutrition Toolkits",       icon: "🥗", staff: false },
  { label: "Vaccine Info Packets",     icon: "💉", staff: false },
  { label: "Mental Health Resources",  icon: "🧠", staff: false },
  { label: "Diabetes Prevention Kits", icon: "🩺", staff: false },
  { label: "Dental Health Kits",       icon: "🦷", staff: false },
  { label: "Substance Abuse Toolkits", icon: "🌿", staff: false },
  { label: "On-site Staff",            icon: "👨‍⚕️", staff: true  },
];

const COUNTIES = Object.values(utahCountyData).map((c) => c.name).sort();

const EMPTY: FormData = {
  name: "", eventDate: "", city: "", county: "",
  zipCode: "", attendeeCount: "", needs: [],
};

interface Props {
  autofillData: Partial<FormData> | null;
  onSubmit: (req: ResourceRequest) => void;
}

export default function PartnerIntakeForm({ autofillData, onSubmit }: Props) {
  const [form, setForm]           = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [autofilled, setAutofilled] = useState(false);

  useEffect(() => {
    if (!autofillData) return;
    setForm((prev) => ({
      ...prev,
      name:          autofillData.name          ?? prev.name,
      eventDate:     autofillData.eventDate     ?? prev.eventDate,
      city:          autofillData.city          ?? prev.city,
      county:        autofillData.county        ?? prev.county,
      zipCode:       autofillData.zipCode       ?? prev.zipCode,
      attendeeCount: autofillData.attendeeCount ?? prev.attendeeCount,
      needs:         autofillData.needs?.length ? autofillData.needs : prev.needs,
    }));
    setAutofilled(true);
    setTimeout(() => setAutofilled(false), 4000);
  }, [autofillData]);

  const set = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleNeed = (need: string) =>
    setForm((prev) => ({
      ...prev,
      needs: prev.needs.includes(need)
        ? prev.needs.filter((n) => n !== need)
        : [...prev.needs, need],
    }));

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
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setForm(EMPTY); }, 3500);
  };

  const isValid = form.name && form.eventDate && form.city && form.county &&
    form.zipCode && form.attendeeCount && form.needs.length > 0;

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-100">
          <CheckCircle2 size={28} className="text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-1.5">Request Submitted!</h3>
        <p className="text-slate-500 text-sm text-center max-w-xs leading-relaxed">
          Our AI is triaging your request now. Check the dashboard to see your priority score.
        </p>
        <div className="mt-5 flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium border border-indigo-200">
          <Sparkles size={13} />
          AI triage in progress…
        </div>
      </div>
    );
  }

  return (
    <div>
      {autofilled && (
        <div className="mb-5 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-2xl px-4 py-3 flex items-center gap-3 animate-slide-up shadow-sm">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <Sparkles size={13} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-indigo-800">Form auto-filled by AI Assistant</p>
            <p className="text-xs text-indigo-500">Review the details and submit when ready.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Organization Name *
          </label>
          <div className="relative">
            <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g., San Juan School District"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 focus:bg-white transition-all"
              required
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Event Date *
          </label>
          <div className="relative">
            <CalendarDays size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="date" value={form.eventDate}
              onChange={(e) => set("eventDate", e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 focus:bg-white transition-all"
              required
            />
          </div>
        </div>

        {/* City + County */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">City *</label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Blanding"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 focus:bg-white transition-all"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">County *</label>
            <div className="relative">
              <select
                value={form.county}
                onChange={(e) => set("county", e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 focus:bg-white transition-all appearance-none"
                required
              >
                <option value="">Select…</option>
                {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Zip + Attendees */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Zip Code *</label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" value={form.zipCode}
                onChange={(e) => set("zipCode", e.target.value)}
                placeholder="84511" maxLength={5}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 focus:bg-white transition-all"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Attendees *</label>
            <div className="relative">
              <Users size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number" value={form.attendeeCount}
                onChange={(e) => set("attendeeCount", e.target.value)}
                placeholder="150" min={1}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 focus:bg-white transition-all"
                required
              />
            </div>
          </div>
        </div>

        {/* Needs */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Resources Needed * <span className="normal-case font-normal">(select all that apply)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {NEEDS.map(({ label, icon, staff }) => {
              const sel = form.needs.includes(label);
              return (
                <button
                  key={label} type="button"
                  onClick={() => toggleNeed(label)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 text-left ${
                    sel
                      ? staff
                        ? "border-violet-300 bg-violet-50 text-violet-800 shadow-sm shadow-violet-100"
                        : "border-indigo-300 bg-indigo-50 text-indigo-800 shadow-sm shadow-indigo-100"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/80"
                  }`}
                >
                  <span className="text-base leading-none">{icon}</span>
                  <span className="leading-tight text-xs">{label}</span>
                  {sel && (
                    <div className={`ml-auto w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${staff ? "bg-violet-500" : "bg-indigo-500"}`}>
                      <svg viewBox="0 0 8 8" className="w-2.5 h-2.5"><path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
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
          className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-300 ${
            isValid && !submitting
              ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          {submitting ? (
            <><Loader2 size={15} className="animate-spin" />AI Processing Request…</>
          ) : (
            <><Send size={15} />Submit Resource Request</>
          )}
        </button>
      </form>
    </div>
  );
}
