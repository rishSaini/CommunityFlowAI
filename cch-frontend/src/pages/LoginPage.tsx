import { useState } from "react";
import { Loader2, Activity, Lock, Mail, Eye, EyeOff, ArrowRight, Users, Stethoscope, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";

type LoginRole = "staff" | "admin" | "partner";

interface Props {
  onPartnerContinue: () => void;
}

export default function LoginPage({ onPartnerContinue }: Props) {
  const { login, logout } = useAuth();
  const [mode, setMode]         = useState<LoginRole | null>(null);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const u = await login(email, password);
      if (mode === "partner" && u.role !== "partner") {
        logout();
        setError("This is a staff/admin account. Use the Staff or Administrator login.");
        setLoading(false);
        return;
      }
      if (mode === "staff" && u.role === "admin") {
        logout();
        setError("This account has admin access. Use the Administrator login instead.");
        setLoading(false);
        return;
      }
      if (mode === "staff" && u.role === "partner") {
        logout();
        setError("This is a partner account. Use the Community Partner login.");
        setLoading(false);
        return;
      }
      if (mode === "admin" && u.role !== "admin") {
        logout();
        setError("This account does not have admin access.");
        setLoading(false);
        return;
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message === "Incorrect email or password" ? "Invalid email or password." : err.message);
      } else {
        setError("Login failed. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputBase = "w-full py-3.5 px-4 rounded-xl border border-sand-200 bg-white text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-sage-600 transition-all";

  return (
    <div className="min-h-screen page-bg flex flex-col">

      {/* Nav */}
      <header className="glass-warm sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-8 flex items-center h-[68px] gap-3">
          <div className="w-9 h-9 rounded-2xl bg-sage-800 flex items-center justify-center shadow-sm">
            <Activity size={16} className="text-paper" />
          </div>
          <div>
            <p className="font-semibold text-ink text-sm leading-tight" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
              CommunityFlow AI
            </p>
            <p className="text-[10px] text-ink-muted leading-tight font-medium tracking-wide uppercase">
              Health Dispatch · Utah
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-6 md:px-12 py-10">

        {/* Role selection */}
        {!mode && (
          <>
            {/* Hero */}
            <div className="mb-10">
              <p className="text-[11px] font-semibold text-sage-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-sage-500 rounded-full animate-pulse" />
                Utah Community Health · Active
              </p>
              <h1 className="text-6xl md:text-7xl font-semibold text-ink leading-[1.05] mb-4"
                style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                Welcome to<br />
                <span className="text-sage-700 italic">CommunityFlow.</span>
              </h1>
              <p className="text-ink-muted text-base max-w-lg leading-relaxed">
                AI-powered health resource dispatch across Utah. Select your role to continue.
              </p>
            </div>

            {/* Cards — full width, equal height */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">

              {/* Community Partner */}
              <div className="group bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl p-10 text-left flex flex-col">
                <div className="w-14 h-14 rounded-2xl bg-sand-100 flex items-center justify-center mb-8 flex-shrink-0">
                  <Users size={24} className="text-ink-muted" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-ink text-2xl mb-2"
                    style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                    Community Partner
                  </h3>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    Submit a resource request or sign in to chat with your assigned CCH representative.
                  </p>
                </div>
                <div className="flex flex-col gap-2 mt-8">
                  <button
                    onClick={() => { setMode("partner"); setError(null); }}
                    className="flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-sage-700 hover:bg-sage-800 px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <Lock size={12} /> Sign in
                  </button>
                  <button
                    onClick={onPartnerContinue}
                    className="flex items-center justify-center gap-1.5 text-sm font-semibold text-sage-700 hover:text-sage-800 px-4 py-2 rounded-xl border border-sage-200 hover:border-sage-300 transition-colors"
                  >
                    Continue as guest <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Staff */}
              <button
                onClick={() => { setMode("staff"); setError(null); }}
                className="group bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl p-10 text-left hover:-translate-y-1 hover:shadow-xl transition-all duration-200 flex flex-col"
              >
                <div className="w-14 h-14 rounded-2xl bg-sage-50 group-hover:bg-sage-100 flex items-center justify-center mb-8 transition-colors flex-shrink-0">
                  <Stethoscope size={24} className="text-sage-700" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-ink text-2xl mb-2"
                    style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                    Staff Member
                  </h3>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    View your assigned tasks, auto-generated schedule, and check in to events across Utah.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-sage-700 mt-8 group-hover:gap-2.5 transition-all">
                  Sign in <ArrowRight size={14} />
                </div>
              </button>

              {/* Admin */}
              <button
                onClick={() => { setMode("admin"); setError(null); }}
                className="group bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl p-10 text-left hover:-translate-y-1 hover:shadow-xl transition-all duration-200 flex flex-col"
              >
                <div className="w-14 h-14 rounded-2xl bg-clay-50 group-hover:bg-clay-100 flex items-center justify-center mb-8 transition-colors flex-shrink-0">
                  <Shield size={24} className="text-clay-700" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-ink text-2xl mb-2"
                    style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                    Administrator
                  </h3>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    Manage requests, staff profiles, priority dispatch, and full system analytics.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-clay-700 mt-8 group-hover:gap-2.5 transition-all">
                  Sign in <ArrowRight size={14} />
                </div>
              </button>
            </div>
          </>
        )}

        {/* Login form */}
        {mode && (
          <div className="flex-1 flex flex-col md:flex-row gap-10 md:gap-16 animate-fade-in">

            {/* Left — branding panel */}
            <div className="md:w-1/2 flex flex-col justify-between">
              <button
                onClick={() => { setMode(null); setError(null); setEmail(""); setPassword(""); }}
                className="text-sm text-ink-muted hover:text-ink flex items-center gap-1.5 mb-10 self-start transition-colors"
              >
                ← Back to roles
              </button>

              <div className="flex-1 flex flex-col justify-center">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-8 ${
                  mode === "admin" ? "bg-clay-50 border border-clay-200" : "bg-sage-50 border border-sage-200"
                }`}>
                  {mode === "admin"
                    ? <Shield size={28} className="text-clay-700" />
                    : <Stethoscope size={28} className="text-sage-700" />}
                </div>
                <h2 className="text-5xl md:text-6xl font-semibold text-ink leading-[1.05] mb-4"
                  style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                  {mode === "admin" ? "Admin\nPortal" : "Staff\nPortal"}
                </h2>
                <p className="text-ink-muted text-base leading-relaxed max-w-sm">
                  {mode === "admin"
                    ? "Full system access — requests, dispatch, analytics, and team management."
                    : "Your tasks, schedule, map, and availability settings — all in one place."}
                </p>

                {/* Stats decoration */}
                {(() => {
                  const stats = mode === "admin"
                    ? [{ v: "29", l: "Counties" }, { v: "100%", l: "Coverage" }, { v: "AI", l: "Triage" }]
                    : [{ v: "Real-time", l: "Dispatch" }, { v: "Auto", l: "Schedule" }, { v: "GPS", l: "Routing" }];
                  return (
                    <div className="flex gap-8 mt-12">
                      {stats.map(({ v, l }) => (
                        <div key={l}>
                          <p className="text-2xl font-semibold text-ink" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>{v}</p>
                          <p className="text-[11px] text-ink-muted uppercase tracking-wide font-medium mt-0.5">{l}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Right — form */}
            <div className="md:w-1/2 flex flex-col justify-center">
              <div className="bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl p-10 shadow-sm">
                <h3 className="text-2xl font-semibold text-ink mb-1" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                  Sign in
                </h3>
                <p className="text-sm text-ink-muted mb-8">
                  {mode === "admin"
                    ? "Use your administrator credentials."
                    : "Use your CommunityFlow-issued credentials."}
                </p>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-[0.1em] mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={mode === "admin" ? "admin@cch.org" : "you@cch.org"}
                        className={`${inputBase} pl-11`}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-[0.1em] mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`${inputBase} pl-11 pr-12`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
                      >
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 ${
                      loading
                        ? "bg-sand-100 text-ink-faint cursor-not-allowed"
                        : mode === "admin"
                          ? "bg-clay-600 text-paper hover:bg-clay-700 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
                          : "bg-sage-800 text-paper hover:bg-sage-900 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
                    }`}
                  >
                    {loading ? <><Loader2 size={15} className="animate-spin" />Signing in…</> : "Sign In"}
                  </button>
                </form>

                {/* Demo hint */}
                <div className="mt-6 p-4 bg-sand-50 border border-sand-200 rounded-2xl">
                  <p className="text-[10px] text-ink-muted font-semibold uppercase tracking-wide mb-1.5">Demo credentials</p>
                  {mode === "admin"
                    ? <p className="text-sm text-ink-muted font-mono">admin@cch.org / password123</p>
                    : <p className="text-sm text-ink-muted font-mono">emily.r@cch.org / password123</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
