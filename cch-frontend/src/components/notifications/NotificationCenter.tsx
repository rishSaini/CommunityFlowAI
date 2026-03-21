import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Phone as PhoneIcon, Send, Search, Filter,
  CheckCircle2, XCircle, Clock, Loader2, ChevronLeft, ChevronRight,
  Bell, Volume2, Mail, Zap, AlertTriangle, RefreshCw,
} from "lucide-react";
import {
  notificationsApi,
  type NotificationLogEntry,
  type SMSTemplate,
  type SendSMSResult,
} from "../../lib/api";

// ── Notification Log Panel ───────────────────────────────────────────────
function NotificationLog() {
  const [entries, setEntries] = useState<NotificationLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    channel?: string; status?: string; urgency?: string; search?: string;
  }>({});

  const fetchLog = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationsApi.getLog(page, filters);
      setEntries(data.notifications);
      setTotal(data.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  const statusColor = (s: string) => {
    switch (s) {
      case "sent": return "bg-emerald-100 text-emerald-700";
      case "delivered": return "bg-blue-100 text-blue-700";
      case "failed": return "bg-red-100 text-red-700";
      case "queued": return "bg-amber-100 text-amber-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const channelIcon = (ch: string | null) =>
    ch === "voice" ? <Volume2 size={12} /> : <MessageSquare size={12} />;

  const urgencyDot = (u: string | null) => {
    const colors: Record<string, string> = {
      critical: "bg-red-500", high: "bg-orange-500",
      medium: "bg-yellow-500", low: "bg-green-500",
    };
    return <span className={`inline-block w-2 h-2 rounded-full ${colors[u || "low"] || "bg-gray-400"}`} />;
  };

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-3">
      {/* Filters bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            placeholder="Search by name, phone, or message..."
            value={filters.search || ""}
            onChange={(e) => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-sand-200 text-xs focus:outline-none focus:border-sage-500"
          />
        </div>
        <select
          value={filters.channel || ""}
          onChange={(e) => { setFilters(f => ({ ...f, channel: e.target.value || undefined })); setPage(1); }}
          className="px-2 py-1.5 rounded-lg border border-sand-200 text-xs bg-white"
        >
          <option value="">All Channels</option>
          <option value="sms">SMS</option>
          <option value="voice">Voice</option>
        </select>
        <select
          value={filters.status || ""}
          onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value || undefined })); setPage(1); }}
          className="px-2 py-1.5 rounded-lg border border-sand-200 text-xs bg-white"
        >
          <option value="">All Status</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
          <option value="queued">Queued</option>
        </select>
        <select
          value={filters.urgency || ""}
          onChange={(e) => { setFilters(f => ({ ...f, urgency: e.target.value || undefined })); setPage(1); }}
          className="px-2 py-1.5 rounded-lg border border-sand-200 text-xs bg-white"
        >
          <option value="">All Urgency</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button
          onClick={fetchLog}
          className="p-1.5 rounded-lg border border-sand-200 hover:bg-sand-50 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-sage-600" : "text-ink-faint"} />
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-[11px] text-ink-muted">
        <span className="font-semibold text-ink">{total}</span> notifications total
        {entries.filter(e => e.status === "failed").length > 0 && (
          <span className="text-red-600 flex items-center gap-1">
            <AlertTriangle size={10} />
            {entries.filter(e => e.status === "failed").length} failed on this page
          </span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-sage-600" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">
          <Bell size={24} className="mx-auto mb-2 opacity-40" />
          No notifications found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-sand-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-sand-50 text-ink-muted text-[10px] uppercase tracking-wider">
                <th className="px-3 py-2 text-left font-semibold">Time</th>
                <th className="px-3 py-2 text-left font-semibold">Recipient</th>
                <th className="px-3 py-2 text-left font-semibold">Channel</th>
                <th className="px-3 py-2 text-left font-semibold">Message</th>
                <th className="px-3 py-2 text-center font-semibold">Urgency</th>
                <th className="px-3 py-2 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-sand-50/50 transition-colors">
                  <td className="px-3 py-2.5 text-ink-muted whitespace-nowrap">
                    {entry.sent_at
                      ? new Date(entry.sent_at).toLocaleString("en-US", {
                          month: "short", day: "numeric",
                          hour: "numeric", minute: "2-digit",
                        })
                      : <span className="text-amber-600">Queued</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-ink">{entry.recipient_name || "—"}</div>
                    <div className="text-ink-faint">{entry.recipient_phone || "—"}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      entry.channel === "voice"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {channelIcon(entry.channel)}
                      {entry.channel === "voice" ? "Voice" : "SMS"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 max-w-[280px]">
                    <p className="truncate text-ink-muted" title={entry.message_body || ""}>
                      {entry.message_body || "—"}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="flex items-center justify-center gap-1">
                      {urgencyDot(entry.urgency_level)}
                      <span className="capitalize text-[10px]">{entry.urgency_level || "—"}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor(entry.status)}`}>
                      {entry.status === "sent" && <CheckCircle2 size={10} />}
                      {entry.status === "failed" && <XCircle size={10} />}
                      {entry.status === "queued" && <Clock size={10} />}
                      {entry.status === "delivered" && <CheckCircle2 size={10} />}
                      {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-ink-muted">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="p-1 rounded hover:bg-sand-100 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-1 rounded hover:bg-sand-100 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ── SMS Composer ──────────────────────────────────────────────────────────
function SMSComposer({ onSent }: { onSent: () => void }) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendSMSResult | null>(null);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    notificationsApi.getTemplates().then(setTemplates).catch(() => {});
  }, []);

  const handleSend = async () => {
    if (!phone || !message) return;
    setSending(true);
    setResult(null);
    try {
      const r = await notificationsApi.sendSMS(phone, message, recipientName || "Manual");
      setResult(r);
      if (r.success) {
        onSent();
        setTimeout(() => { setMessage(""); setResult(null); }, 3000);
      }
    } catch {
      setResult({ success: false, sid: null, error: "Failed to send", message_preview: "" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-1">
            Recipient Phone *
          </label>
          <div className="relative">
            <PhoneIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+14255550100"
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-sand-200 text-sm focus:outline-none focus:border-sage-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-1">
            Recipient Name
          </label>
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="e.g., Emily Rodriguez"
            className="w-full px-3 py-2 rounded-xl border border-sand-200 text-sm focus:outline-none focus:border-sage-500"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
            Message *
          </label>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-[10px] text-sage-600 hover:text-sage-800 font-medium flex items-center gap-1"
          >
            <Zap size={10} />
            {showTemplates ? "Hide Templates" : "Use Template"}
          </button>
        </div>

        {showTemplates && (
          <div className="mb-2 p-2 bg-sand-50 rounded-xl border border-sand-200 space-y-1 max-h-40 overflow-y-auto">
            {templates.map((t) => (
              <button
                key={t.key}
                onClick={() => { setMessage(t.template); setShowTemplates(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white text-xs transition-colors"
              >
                <span className="font-medium text-ink">{t.key.replace(/_/g, " ")}</span>
                <span className="block text-ink-faint text-[10px] truncate">{t.description}</span>
              </button>
            ))}
          </div>
        )}

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          rows={3}
          className="w-full px-3 py-2 rounded-xl border border-sand-200 text-sm focus:outline-none focus:border-sage-500 resize-none"
        />
        <div className="flex items-center justify-between mt-1">
          <span className={`text-[10px] ${message.length > 160 ? "text-amber-600" : "text-ink-faint"}`}>
            {message.length}/160 chars {message.length > 160 && `(${Math.ceil(message.length / 160)} segments)`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSend}
          disabled={!phone || !message || sending}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            phone && message && !sending
              ? "bg-sage-800 text-white hover:bg-sage-900 shadow-sm"
              : "bg-sand-100 text-ink-faint cursor-not-allowed"
          }`}
        >
          {sending
            ? <><Loader2 size={14} className="animate-spin" />Sending...</>
            : <><Send size={14} />Send SMS</>}
        </button>

        {result && (
          <div className={`flex items-center gap-1.5 text-xs font-medium ${
            result.success ? "text-emerald-600" : "text-red-600"
          }`}>
            {result.success
              ? <><CheckCircle2 size={14} />Sent! SID: {result.sid?.slice(0, 12)}...</>
              : <><XCircle size={14} />{result.error}</>}
          </div>
        )}
      </div>
    </div>
  );
}


// ── Test SMS Button ──────────────────────────────────────────────────────
function TestSMSButton() {
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendSMSResult | null>(null);

  const handleTest = async () => {
    if (!phone) return;
    setSending(true);
    setResult(null);
    try {
      const r = await notificationsApi.sendTest(phone);
      setResult(r);
    } catch {
      setResult({ success: false, sid: null, error: "Failed", message_preview: "" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 bg-sage-50 border border-sage-200 rounded-2xl space-y-3">
      <h4 className="text-xs font-semibold text-sage-800 flex items-center gap-1.5">
        <Zap size={12} /> Test Twilio Integration
      </h4>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <PhoneIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+14255550100"
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-sage-300 text-sm focus:outline-none focus:border-sage-600 bg-white"
          />
        </div>
        <button
          onClick={handleTest}
          disabled={!phone || sending}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            phone && !sending
              ? "bg-sage-700 text-white hover:bg-sage-800"
              : "bg-sand-200 text-ink-faint cursor-not-allowed"
          }`}
        >
          {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Send Test
        </button>
      </div>
      {result && (
        <div className={`flex items-center gap-1.5 text-xs font-medium ${
          result.success ? "text-emerald-600" : "text-red-600"
        }`}>
          {result.success
            ? <><CheckCircle2 size={12} />Test SMS sent successfully!</>
            : <><XCircle size={12} />{result.error}</>}
        </div>
      )}
    </div>
  );
}


// ── Main Notification Center (used as a tab) ─────────────────────────────
export default function NotificationCenter() {
  const [activeTab, setActiveTab] = useState<"log" | "compose" | "templates">("log");
  const [refreshKey, setRefreshKey] = useState(0);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);

  useEffect(() => {
    if (activeTab === "templates") {
      notificationsApi.getTemplates().then(setTemplates).catch(() => {});
    }
  }, [activeTab]);

  const tabs = [
    { id: "log" as const, label: "Notification Log", icon: <Bell size={13} /> },
    { id: "compose" as const, label: "Send SMS", icon: <Send size={13} /> },
    { id: "templates" as const, label: "Templates", icon: <Mail size={13} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Tab selector */}
      <div className="flex items-center gap-1 p-0.5 bg-sand-100 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Test SMS - always visible */}
      <TestSMSButton />

      {/* Tab content */}
      {activeTab === "log" && (
        <div key={refreshKey}>
          <NotificationLog />
        </div>
      )}

      {activeTab === "compose" && (
        <SMSComposer onSent={() => setRefreshKey(k => k + 1)} />
      )}

      {activeTab === "templates" && (
        <div className="space-y-2">
          <p className="text-xs text-ink-muted">Default message templates used by the system. Variables in curly braces are auto-filled.</p>
          {templates.map((t) => (
            <div key={t.key} className="p-3 bg-white border border-sand-200 rounded-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 bg-sage-100 text-sage-700 text-[10px] font-semibold rounded-full uppercase">
                  {t.key.replace(/_/g, " ")}
                </span>
                <span className="text-[10px] text-ink-faint">{t.description}</span>
              </div>
              <p className="text-xs text-ink font-mono bg-sand-50 p-2 rounded-lg">
                {t.template}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
