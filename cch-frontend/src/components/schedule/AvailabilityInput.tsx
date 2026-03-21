import { useState } from "react";
import { Save, User, Mail, Phone, MapPin, Clock, ChevronDown } from "lucide-react";
import { utahCountyData } from "../../data/mockData";
import type { StaffProfile, DayAvailability } from "../../types/index";

interface Props {
  profile: StaffProfile;
  onSave: (updated: StaffProfile) => void;
}

const DAYS = [
  { day: 0 as const, label: "Sunday"    },
  { day: 1 as const, label: "Monday"    },
  { day: 2 as const, label: "Tuesday"   },
  { day: 3 as const, label: "Wednesday" },
  { day: 4 as const, label: "Thursday"  },
  { day: 5 as const, label: "Friday"    },
  { day: 6 as const, label: "Saturday"  },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return `${h}:00`;
});

const COUNTIES = Object.values(utahCountyData).map((c) => c.name).sort();

export default function AvailabilityInput({ profile, onSave }: Props) {
  const [form, setForm] = useState<StaffProfile>(profile);
  const [saved, setSaved] = useState(false);

  const setField = (key: keyof StaffProfile, value: string | number) =>
    setForm((p) => ({ ...p, [key]: value }));

  const toggleDay = (day: DayAvailability["day"]) => {
    const exists = form.availability.find((a) => a.day === day);
    if (exists) {
      setForm((p) => ({ ...p, availability: p.availability.filter((a) => a.day !== day) }));
    } else {
      const newAvail: DayAvailability = { day, startTime: "08:00", endTime: "17:00" };
      setForm((p) => ({
        ...p,
        availability: [...p.availability, newAvail].sort((a, b) => a.day - b.day),
      }));
    }
  };

  const updateTime = (day: DayAvailability["day"], key: "startTime" | "endTime", value: string) =>
    setForm((p) => ({
      ...p,
      availability: p.availability.map((a) => a.day === day ? { ...a, [key]: value } : a),
    }));

  const handleSave = () => {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Personal info */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Personal Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Name */}
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
            <input
              type="text" value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Full name"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          {/* Email */}
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
            <input
              type="email" value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="Email"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          {/* Phone */}
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
            <input
              type="tel" value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="Phone"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          {/* Max tasks */}
          <div className="relative">
            <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
            <select
              value={form.maxTasksPerDay}
              onChange={(e) => setField("maxTasksPerDay", parseInt(e.target.value))}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n} task{n !== 1 ? "s" : ""} per day (max)</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Home base */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Home Base (for routing)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
            <input
              type="text" value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="Street address"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          <div className="relative">
            <select
              value={form.county}
              onChange={(e) => setField("county", e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none"
            >
              {COUNTIES.map((c) => <option key={c} value={c}>{c} County</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Weekly availability */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Weekly Availability</p>
        <div className="space-y-2">
          {DAYS.map(({ day, label }) => {
            const avail = form.availability.find((a) => a.day === day);
            const active = !!avail;
            return (
              <div
                key={day}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                  active ? "border-indigo-200 bg-indigo-50/60" : "border-slate-100 bg-slate-50/30"
                }`}
              >
                {/* Day toggle */}
                <button
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`flex items-center justify-center w-[88px] py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                      : "bg-white border border-slate-200 text-slate-400 hover:border-slate-300"
                  }`}
                >
                  {label.slice(0, 3)}
                </button>

                {active ? (
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <Clock size={12} className="text-indigo-400 flex-shrink-0" />
                    <select
                      value={avail.startTime}
                      onChange={(e) => updateTime(day, "startTime", e.target.value)}
                      className="flex-1 min-w-[80px] py-1.5 px-2 rounded-lg border border-indigo-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-indigo-400 transition-all"
                    >
                      {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span className="text-xs text-slate-400 font-medium">to</span>
                    <select
                      value={avail.endTime}
                      onChange={(e) => updateTime(day, "endTime", e.target.value)}
                      className="flex-1 min-w-[80px] py-1.5 px-2 rounded-lg border border-indigo-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-indigo-400 transition-all"
                    >
                      {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Not available</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-300 ${
          saved
            ? "bg-emerald-600 text-white shadow-md shadow-emerald-100"
            : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5"
        }`}
      >
        <Save size={14} />
        {saved ? "Profile Saved" : "Save Profile"}
      </button>
    </div>
  );
}
