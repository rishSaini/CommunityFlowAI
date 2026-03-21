import { useState } from "react";
import { Loader2, Globe, Lock, Mail, Eye, EyeOff, ArrowRight, Users, Stethoscope, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";

type LoginRole = "staff" | "admin";

interface Props {
  onPartnerContinue: () => void;
}

export default function LoginPage({ onPartnerContinue }: Props) {
  const { login } = useAuth();
  const [mode, setMode]       = useState<LoginRole | null>(null);
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      // Parent App.tsx will detect auth state change and redirect
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

  const inputBase = "w-full py-3 px-4 rounded-xl border border-sand-200 bg-white text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-sage-600 transition-all";

  return (
    <div className="min-h-screen page-bg flex flex-col">

      {/* Nav */}
      <header className="glass-warm sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-6 flex items-center h-[64px] gap-3">
          <div className="w-9 h-9 rounded-2xl bg-sage-800 flex items-center justify-center shadow-sm">
            <Globe size={15} className="text-paper" />
          </div>
          <div>
            <p className="font-semibold text-ink text-sm leading-tight" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
              Community Resource
            </p>
            <p className="text-[10px] text-ink-muted leading-tight font-medium tracking-wide uppercase">
              Intelligence Portal · Utah
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-4xl">

          {/* Hero */}
          {!mode && (
            <div className="text-center mb-10">
              <h1 className="text-5xl font-semibold text-ink mb-3"
                style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                Welcome Back
              </h1>
              <p className="text-ink-muted text-sm">Select how you'd like to continue</p>
            </div>
          )}

          {/* Role selection */}
          {!mode && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              {/* Community Partner */}
              <button
                onClick={onPartnerContinue}
                className="group bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl p-7 text-left hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-2xl bg-sand-100 group-hover:bg-sage-50 flex items-center justify-center mb-5 transition-colors">
                  <Users size={20} className="text-ink-muted group-hover:text-sage-700 transition-colors" />
                </div>
                <h3 className="font-semibold text-ink text-lg mb-1.5"
                  style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                  Community Partner
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed mb-5">
                  Submit a resource request for your event. No account required.
                </p>
                <div className="flex items-center gap-1 text-xs font-semibold text-sage-700">
                  Continue as guest <ArrowRight size={12} />
                </div>
              </button>

              {/* Staff */}
              <button
                onClick={() => { setMode("staff"); setError(null); }}
                className="group bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl p-7 text-left hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-2xl bg-sage-50 group-hover:bg-sage-100 flex items-center justify-center mb-5 transition-colors">
                  <Stethoscope size={20} className="text-sage-700" />
                </div>
                <h3 className="font-semibold text-ink text-lg mb-1.5"
                  style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                  Staff Member
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed mb-5">
                  View your tasks, schedule, and check in to assignments across Utah.
                </p>
                <div className="flex items-center gap-1 text-xs font-semibold text-sage-700">
                  Sign in <ArrowRight size={12} />
                </div>
              </button>

              {/* Admin */}
              <button
                onClick={() => { setMode("admin"); setError(null); }}
                className="group bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl p-7 text-left hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-2xl bg-clay-50 group-hover:bg-clay-100 flex items-center justify-center mb-5 transition-colors">
                  <Shield size={20} className="text-clay-700" />
                </div>
                <h3 className="font-semibold text-ink text-lg mb-1.5"
                  style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                  Administrator
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed mb-5">
                  Manage requests, staff profiles, dispatch, and system settings.
                </p>
                <div className="flex items-center gap-1 text-xs font-semibold text-clay-700">
                  Sign in <ArrowRight size={12} />
                </div>
              </button>
            </div>
          )}

          {/* Login form */}
          {mode && (
            <div className="max-w-sm mx-auto animate-fade-in">
              <button
                onClick={() => { setMode(null); setError(null); setEmail(""); setPassword(""); }}
                className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 mb-6 transition-colors"
              >
                ← Back
              </button>

              <div className="bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl p-8 shadow-sm">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${
                  mode === "admin" ? "bg-clay-50" : "bg-sage-50"
                }`}>
                  {mode === "admin"
                    ? <Shield size={22} className="text-clay-700" />
                    : <Stethoscope size={22} className="text-sage-700" />}
                </div>

                <h2 className="text-2xl font-semibold text-ink mb-1"
                  style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                  {mode === "admin" ? "Administrator Login" : "Staff Login"}
                </h2>
                <p className="text-xs text-ink-muted mb-6">
                  {mode === "admin"
                    ? "Full system access. Contact IT if you need a reset."
                    : "Use your CCH-issued credentials."}
                </p>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-[0.1em] mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={mode === "admin" ? "admin@cch.org" : "you@cch.org"}
                        className={`${inputBase} pl-9`}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-[0.1em] mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`${inputBase} pl-9 pr-10`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
                      >
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 mt-2 ${
                      loading
                        ? "bg-sand-100 text-ink-faint cursor-not-allowed"
                        : mode === "admin"
                          ? "bg-clay-600 text-paper hover:bg-clay-700 shadow-sm"
                          : "bg-sage-800 text-paper hover:bg-sage-900 shadow-sm"
                    }`}
                  >
                    {loading ? <><Loader2 size={14} className="animate-spin" />Signing in…</> : "Sign In"}
                  </button>
                </form>

                {/* Demo hint */}
                <div className="mt-5 p-3 bg-sand-50 border border-sand-200 rounded-xl">
                  <p className="text-[10px] text-ink-muted font-medium uppercase tracking-wide mb-1">Demo credentials</p>
                  {mode === "admin"
                    ? <p className="text-xs text-ink-muted font-mono">admin@cch.org / password123</p>
                    : <p className="text-xs text-ink-muted font-mono">emily.r@cch.org / password123</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
