import { useState, useCallback } from "react";
import {
  LayoutDashboard, FileInput, MapPin, Sparkles,
  Bell, Globe, ChevronRight, TrendingUp, Shield,
  Zap, ArrowRight, Stethoscope,
} from "lucide-react";
import PartnerIntakeForm from "./components/forms/PartnerIntakeForm";
import InlineChatbot from "./components/chatbot/InlineChatbot";
import UtahMap from "./components/map/UtahMap";
import LiveFeed from "./components/dashboard/LiveFeed";
import StatsPanel from "./components/analytics/StatsPanel";
import StaffDashboard from "./pages/StaffDashboard";
import { initialRequests } from "./data/mockData";
import type { ResourceRequest, FormData } from "./types/index";

type View = "intake" | "dashboard" | "staff";

const EMPTY_FORM: FormData = {
  name: "", eventDate: "", city: "", county: "",
  zipCode: "", attendeeCount: "", needs: [],
};

export default function App() {
  const [view, setView]         = useState<View>("intake");
  const [requests, setRequests] = useState<ResourceRequest[]>(initialRequests);
  const [banner, setBanner]     = useState<ResourceRequest | null>(null);

  const [form, setForm]               = useState<FormData>(EMPTY_FORM);
  const [flashFields, setFlashFields] = useState<Array<keyof FormData>>([]);

  const handleFormChange = useCallback((updates: Partial<FormData>) => {
    setForm((prev) => ({ ...prev, ...updates, needs: updates.needs ?? prev.needs }));
  }, []);

  const handleChatAutofill = useCallback((updates: Partial<FormData>) => {
    handleFormChange(updates);
    const fields = Object.keys(updates) as Array<keyof FormData>;
    setFlashFields(fields);
    setTimeout(() => setFlashFields([]), 2000);
  }, [handleFormChange]);

  const handleReset = useCallback(() => setForm(EMPTY_FORM), []);

  const handleNewRequest = (req: ResourceRequest) => {
    setRequests((p) => [req, ...p]);
    setBanner(req);
    setTimeout(() => setBanner(null), 5000);
    setTimeout(() => setView("dashboard"), 1400);
    setForm(EMPTY_FORM);
  };

  const highCount = requests.filter((r) => r.impactLevel === "High").length;

  const NAV_TABS: { id: View; label: string; icon: React.ElementType }[] = [
    { id: "intake",    label: "Submit Request",  icon: FileInput       },
    { id: "dashboard", label: "Admin Dashboard", icon: LayoutDashboard },
    { id: "staff",     label: "Staff Portal",    icon: Stethoscope     },
  ];

  return (
    <div className="min-h-screen page-bg flex flex-col">

      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 glass-warm">
        <div className="max-w-[1440px] mx-auto px-6 flex items-center h-[64px] gap-6">

          {/* Brand */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-2xl bg-sage-800 flex items-center justify-center shadow-sm">
              <Globe size={15} className="text-paper" />
            </div>
            <div>
              <p className="font-semibold text-ink text-sm leading-tight tracking-tight" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                Community Resource
              </p>
              <p className="text-[10px] text-ink-muted leading-tight font-medium tracking-wide uppercase">
                Intelligence Portal · Utah
              </p>
            </div>
          </div>

          {/* Nav tabs */}
          <nav className="hidden sm:flex items-center gap-1 bg-sand-100/70 rounded-2xl p-1 ml-2">
            {NAV_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                  view === id
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon size={13} />
                {label}
                {id === "dashboard" && requests.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    view === id ? "bg-sage-100 text-sage-800" : "bg-sand-200 text-ink-muted"
                  }`}>
                    {requests.length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-3">
            <div className="relative">
              <button className="w-9 h-9 rounded-xl bg-sand-100/70 hover:bg-sand-200/80 transition-colors flex items-center justify-center text-ink-muted">
                <Bell size={14} />
              </button>
              {highCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-clay-600 border-2 border-paper text-paper text-[8px] flex items-center justify-center font-black">
                  {highCount}
                </span>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-1.5 border border-sage-200 bg-sage-50 text-sage-800 text-[11px] font-semibold px-3 py-1.5 rounded-full">
              <Sparkles size={10} /> AI-Powered
            </div>
          </div>
        </div>
      </header>

      {/* ── Banner ─────────────────────────────────────────────────────── */}
      {banner && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-ink text-paper px-5 py-3.5 shadow-xl flex items-center gap-3.5 border border-white/10">
            <div className="w-7 h-7 bg-sage-600 flex items-center justify-center flex-shrink-0">
              <Zap size={13} className="text-paper" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">{banner.name}</p>
              <p className="text-paper/50 text-xs mt-0.5">
                Priority: <span className="text-sage-300 font-bold">{banner.priorityScore}</span> · {banner.impactLevel} Impact
              </p>
            </div>
            <button
              onClick={() => { setView("dashboard"); setBanner(null); }}
              className="ml-2 flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              View <ChevronRight size={11} />
            </button>
          </div>
        </div>
      )}

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 py-8">

        {/* ── INTAKE VIEW ──────────────────────────────────────────────── */}
        {view === "intake" && (
          <div className="animate-fade-in space-y-6">

            {/* Editorial Hero */}
            <div className="bg-sage-900 relative overflow-hidden rounded-3xl shadow-lg">
              {/* Subtle texture strip */}
              <div className="absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 39px, #fff 39px, #fff 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, #fff 39px, #fff 40px)" }}
              />
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-0">
                {/* Main copy */}
                <div className="md:col-span-2 p-8 md:p-10 border-r border-white/10">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="w-1.5 h-1.5 bg-sage-300 animate-pulse" />
                    <span className="text-sage-300 text-[10px] font-semibold uppercase tracking-[0.2em]">Utah Community Health · Active</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-semibold text-paper leading-[1.1] mb-3"
                    style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                    Request Community<br />
                    <span className="text-sage-300 italic">Health Resources</span>
                  </h1>
                  <p className="text-paper/60 text-sm leading-relaxed max-w-md mt-4">
                    Describe your event to the AI assistant in plain language — it will complete the form on your behalf and route your request to the right team.
                  </p>
                </div>
                {/* Stats column */}
                <div className="grid grid-cols-3 md:grid-cols-1 divide-x md:divide-x-0 md:divide-y divide-white/10">
                  {[
                    { v: "2–4 hrs",  l: "Avg Response"     },
                    { v: "98%",       l: "Satisfaction"      },
                    { v: "29",        l: "Counties Covered"  },
                  ].map(({ v, l }) => (
                    <div key={l} className="p-6 flex flex-col justify-center">
                      <p className="text-2xl font-bold text-paper leading-tight"
                        style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>{v}</p>
                      <p className="text-paper/50 text-[11px] font-medium mt-0.5 tracking-wide uppercase">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Form + Chatbot */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Left: Form */}
              <div className="bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-sand-100 flex items-center gap-3">
                  <FileInput size={14} className="text-sage-600" />
                  <div>
                    <h2 className="font-semibold text-ink text-sm leading-tight">Resource Request Form</h2>
                    <p className="text-[11px] text-ink-muted mt-0.5">Fill manually or use the AI assistant</p>
                  </div>
                </div>
                <div className="p-6">
                  <PartnerIntakeForm
                    form={form}
                    onChange={handleFormChange}
                    flashFields={flashFields}
                    onSubmit={handleNewRequest}
                    onReset={handleReset}
                  />
                </div>
              </div>

              {/* Right: Chatbot */}
              <div style={{ minHeight: 600 }}>
                <InlineChatbot form={form} onAutofill={handleChatAutofill} />
              </div>
            </div>

            {/* How it works + Equity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl p-6 shadow-sm">
                <h3 className="font-semibold text-ink text-sm mb-4 pb-3 border-b border-sand-100">How It Works</h3>
                <div className="space-y-4">
                  {[
                    { icon: <FileInput size={12} />,  title: "Describe Your Event",  desc: "Tell the AI assistant in plain English"           },
                    { icon: <Sparkles size={12} />,   title: "AI Fills the Form",    desc: "Fields populate automatically as you chat"         },
                    { icon: <Zap size={12} />,         title: "AI Triage",            desc: "Instant equity-based priority scoring"             },
                    { icon: <TrendingUp size={12} />,  title: "Track on Dashboard",  desc: "See geographic allocation in real-time"            },
                    { icon: <Shield size={12} />,      title: "Equitable Delivery",  desc: "Rural and underserved areas prioritised"           },
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-sage-50 border border-sage-100 text-sage-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {s.icon}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-ink">{s.title}</p>
                        <p className="text-[11px] text-ink-muted mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-sage-900 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-1.5 bg-sage-300" />
                    <p className="text-[10px] font-semibold text-sage-300 uppercase tracking-[0.15em]">Equity-First Allocation</p>
                  </div>
                  <p className="text-xs text-paper/70 leading-relaxed">
                    Our AI weights geographic equity data to prioritise underserved rural communities — especially San Juan, Grand, Wayne, and Emery counties — over well-resourced urban areas.
                  </p>
                </div>
                <button
                  onClick={() => setView("dashboard")}
                  className="mt-6 flex items-center gap-1.5 text-xs text-sage-300 hover:text-paper font-semibold transition-colors"
                >
                  View equity map <ArrowRight size={11} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── DASHBOARD VIEW ───────────────────────────────────────────── */}
        {view === "dashboard" && (
          <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-ink flex items-center gap-2.5"
                  style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                  <LayoutDashboard size={20} className="text-sage-600" />
                  Admin Dashboard
                </h2>
                <p className="text-sm text-ink-muted mt-1">
                  AI-powered geographic equity intelligence · {requests.length} active requests
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-xs bg-sage-50 text-sage-800 border border-sage-200 font-semibold px-3 py-1.5">
                <span className="w-1.5 h-1.5 bg-sage-500 animate-pulse" /> Live
              </span>
            </div>

            <StatsPanel requests={requests} />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <div className="xl:col-span-2 bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-sand-100 flex items-center gap-2.5">
                  <MapPin size={14} className="text-sage-600" />
                  <div>
                    <h3 className="font-semibold text-ink text-sm">Geographic Equity Map</h3>
                    <p className="text-[11px] text-ink-muted mt-0.5">Hover counties · drag to pan · scroll to zoom</p>
                  </div>
                </div>
                <div style={{ height: 520 }}>
                  <UtahMap requests={requests} />
                </div>
              </div>
              <div className="xl:col-span-1 bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl p-5 flex flex-col shadow-sm" style={{ height: 600 }}>
                <LiveFeed requests={requests} />
              </div>
            </div>
          </div>
        )}

        {/* ── STAFF VIEW ───────────────────────────────────────────────── */}
        {view === "staff" && (
          <StaffDashboard />
        )}

      </main>

      <footer className="border-t border-sand-200 bg-paper py-4 px-6 mt-4">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <p className="text-xs text-ink-faint">© 2026 Community Resource Intelligence Portal · Utah</p>
          <div className="flex items-center gap-1.5 text-xs text-ink-faint">
            <Sparkles size={10} className="text-sage-400" /> Equity Engine v2.0
          </div>
        </div>
      </footer>
    </div>
  );
}
