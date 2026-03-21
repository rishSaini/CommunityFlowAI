import { useState } from "react";
import {
  LayoutDashboard, FileInput, MapPin, Sparkles,
  Bell, Globe, ChevronRight, TrendingUp, Shield,
  Zap, ArrowRight,
} from "lucide-react";
import PartnerIntakeForm from "./components/forms/PartnerIntakeForm";
import ChatAssistant from "./components/chatbot/ChatAssistant";
import UtahMap from "./components/map/UtahMap";
import LiveFeed from "./components/dashboard/LiveFeed";
import StatsPanel from "./components/analytics/StatsPanel";
import { initialRequests } from "./data/mockData";
import type { ResourceRequest, FormData } from "./types/index";

type View = "intake" | "dashboard";

export default function App() {
  const [view, setView]           = useState<View>("intake");
  const [requests, setRequests]   = useState<ResourceRequest[]>(initialRequests);
  const [autofill, setAutofill]   = useState<Partial<FormData> | null>(null);
  const [banner, setBanner]       = useState<ResourceRequest | null>(null);

  const handleNewRequest = (req: ResourceRequest) => {
    setRequests((p) => [req, ...p]);
    setBanner(req);
    setTimeout(() => setBanner(null), 5000);
    setTimeout(() => setView("dashboard"), 1400);
  };

  const handleAutofill = (data: Partial<FormData>) => {
    setAutofill(data);
    setView("intake");
  };

  const highCount = requests.filter((r) => r.impactLevel === "High").length;

  return (
    <div className="min-h-screen page-bg flex flex-col">

      {/* ── Sticky nav ── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-6 flex items-center h-16 gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0">
              <Globe size={17} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm leading-tight tracking-tight">Community Resource</p>
              <p className="text-[11px] text-slate-400 leading-tight font-medium">Intelligence Portal · Utah</p>
            </div>
          </div>

          {/* Pill nav */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-2xl p-1 ml-2">
            {([
              { id: "intake",    label: "Submit Request",  icon: FileInput       },
              { id: "dashboard", label: "Admin Dashboard", icon: LayoutDashboard },
            ] as { id: View; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  view === id
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon size={14} />
                {label}
                {id === "dashboard" && requests.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    view === id ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600"
                  }`}>
                    {requests.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Alert bell */}
            <div className="relative">
              <button className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-500">
                <Bell size={16} />
              </button>
              {highCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 border-2 border-white text-white text-[8px] flex items-center justify-center font-black">
                  {highCount}
                </span>
              )}
            </div>
            {/* AI badge */}
            <div className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full">
              <Sparkles size={11} />
              AI-Powered
            </div>
          </div>
        </div>
      </header>

      {/* ── Success banner ── */}
      {banner && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3.5 border border-white/10">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Zap size={15} className="text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">{banner.name}</p>
              <p className="text-slate-400 text-xs mt-0.5">Priority score: <span className="text-emerald-400 font-bold">{banner.priorityScore}</span> · {banner.impactLevel} Impact</p>
            </div>
            <button
              onClick={() => { setView("dashboard"); setBanner(null); }}
              className="ml-2 flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
            >
              View <ChevronRight size={11} />
            </button>
          </div>
        </div>
      )}

      {/* ── Main ── */}
      <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 py-8">

        {/* INTAKE */}
        {view === "intake" && (
          <div className="animate-fade-in">
            {/* Hero section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-8 mb-8 shadow-xl shadow-indigo-200">
              {/* Decorative circles */}
              <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5" />
              <div className="absolute -bottom-16 -left-8 w-48 h-48 rounded-full bg-white/5" />
              <div className="absolute top-4 right-32 w-20 h-20 rounded-full bg-violet-400/20" />

              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Utah Community Health</span>
                  </div>
                  <h1 className="text-3xl font-extrabold text-white leading-tight tracking-tight mb-3">
                    Request Community<br />
                    <span className="text-indigo-300">Health Resources</span>
                  </h1>
                  <p className="text-indigo-200 text-sm leading-relaxed max-w-md">
                    Submit your event and our AI instantly triages the request — ensuring the highest-need communities receive support first.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {["AI-Powered Triage", "29 Utah Counties", "Equity-First"].map((tag) => (
                      <span key={tag} className="bg-white/10 text-indigo-200 text-xs font-semibold px-3 py-1 rounded-full border border-white/10">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 md:grid-cols-1 md:gap-2">
                  {[
                    { icon: "⚡", v: "2–4 hrs",  l: "Avg Response"        },
                    { icon: "🏅", v: "98%",       l: "Partner Satisfaction" },
                    { icon: "📍", v: "29",         l: "Counties Covered"    },
                  ].map(({ icon, v, l }) => (
                    <div key={l} className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/10">
                      <div className="text-xl mb-0.5">{icon}</div>
                      <p className="font-extrabold text-white text-lg leading-tight">{v}</p>
                      <p className="text-indigo-300 text-[11px] font-medium">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Form + sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Form */}
              <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-7">
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <FileInput size={15} className="text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 text-base leading-tight">Submit a Resource Request</h2>
                    <p className="text-xs text-slate-400">All fields marked * are required</p>
                  </div>
                </div>
                <PartnerIntakeForm autofillData={autofill} onSubmit={handleNewRequest} />
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                {/* AI tip card */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                      <Sparkles size={13} className="text-white" />
                    </div>
                    <p className="font-bold text-slate-700 text-sm">Try the AI Assistant</p>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Tap the floating button in the bottom-right corner. Answer a few quick questions and watch the form fill itself instantly.
                  </p>
                  <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-3 border border-indigo-100">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-black">AI</span>
                      </div>
                      <div>
                        <p className="text-xs text-indigo-800 font-semibold">"Hi! What's your organization's name?"</p>
                        <p className="text-[10px] text-indigo-400 mt-1">→ answers 6 questions → form fills automatically</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* How it works */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
                  <p className="font-bold text-slate-700 text-sm mb-4">How It Works</p>
                  <div className="space-y-3">
                    {[
                      { icon: <FileInput size={13} />, title: "Submit Request",   desc: "Fill the form or use the AI assistant" },
                      { icon: <Zap size={13} />,        title: "AI Triage",        desc: "Instant equity-based priority scoring"  },
                      { icon: <TrendingUp size={13} />, title: "Map Visualisation",desc: "See geographic allocation in real-time"  },
                      { icon: <Shield size={13} />,     title: "Equitable Delivery",desc: "Rural & underserved areas prioritised"  },
                    ].map((s, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          {s.icon}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700">{s.title}</p>
                          <p className="text-[11px] text-slate-400">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Equity note */}
                <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-3xl border border-teal-200/70 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-teal-500" />
                    <p className="text-xs font-bold text-teal-700 uppercase tracking-wide">Equity-First Allocation</p>
                  </div>
                  <p className="text-xs text-teal-700 leading-relaxed">
                    Our AI weights geographic data to prioritise underserved rural communities — especially San Juan, Grand, Wayne, and Emery counties.
                  </p>
                  <button
                    onClick={() => setView("dashboard")}
                    className="mt-3 flex items-center gap-1.5 text-xs text-teal-700 font-bold hover:text-teal-900 transition-colors"
                  >
                    View equity map <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DASHBOARD */}
        {view === "dashboard" && (
          <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
                  <LayoutDashboard size={22} className="text-indigo-600" />
                  Admin Dashboard
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  AI-powered geographic equity intelligence · {requests.length} active requests
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-white border border-slate-200 text-slate-600 font-semibold px-3 py-1.5 rounded-full">
                  {new Date().toLocaleDateString("en-US",{ month:"long", day:"numeric", year:"numeric" })}
                </span>
                <span className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
            </div>

            {/* Stats grid */}
            <StatsPanel requests={requests} />

            {/* Map + Feed */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              {/* Map */}
              <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center">
                      <MapPin size={15} className="text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Geographic Equity Map</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Hover counties · drag to pan · scroll to zoom</p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" /> Over-served</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-700 inline-block" /> Underserved</span>
                  </div>
                </div>
                <div style={{ height: 520 }}>
                  <UtahMap requests={requests} />
                </div>
              </div>

              {/* Live Feed */}
              <div
                className="xl:col-span-1 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 flex flex-col"
                style={{ height: 600 }}
              >
                <LiveFeed requests={requests} />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/60 backdrop-blur-sm py-4 px-6 mt-4">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <p className="text-xs text-slate-400">
            © 2026 Community Resource Intelligence Portal · Utah Community Health Org
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Sparkles size={10} className="text-indigo-400" />
            Equity Engine v2.0
          </div>
        </div>
      </footer>

      <ChatAssistant onAutofill={handleAutofill} />
    </div>
  );
}
