import { useState, useEffect, useRef } from "react";
import {
  Instagram, Linkedin, FileText, Copy, Check,
  Sparkles, Printer, Mail, ExternalLink, Share2,
} from "lucide-react";
import type { FormData } from "../../types/index";

interface Props {
  form: FormData;
  priorityScore: number;
}

type PostTab = "instagram" | "linkedin" | "email" | "flyer";

// ── LinkedIn company page ─────────────────────────────────────────────────
const LINKEDIN_PAGE = "https://www.linkedin.com/company/communityflow-ai";

// ── Content generators ────────────────────────────────────────────────────
function buildInstagramCaption(form: FormData): string {
  const needs     = form.materials_requested.filter((n) => n !== "On-site Staff");
  const shortTags = needs.map((n) =>
    n.replace(" Toolkits","").replace(" Resources","").replace(" Packets","").replace(" Kits","")
  );
  const dateStr   = new Date((form.event_date || "2026-01-01") + "T12:00:00")
    .toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const org       = form.event_name || form.requestor_name;

  return `Free community health resources are coming to ${form.event_city}! 💚\n\nJoin ${org} and CommunityFlow AI on ${dateStr} for a free health event.\n\nWhat's available:\n${needs.map((n) => `✅ ${n}`).join("\n")}\n\nOpen to everyone — no insurance or appointment needed. We're bringing health equity to every corner of Utah.\n\n📍 ${form.event_city}, ${form.county} County\n👥 ${form.estimated_attendees || "?"} community members served\n\n#CommunityHealth #Utah #HealthEquity #FreeResources #${(form.county || "Utah").replace(" ","")}Utah #PublicHealth${shortTags.slice(0,2).map((t) => ` #${t.replace(/\s+/g,"")}`).join("")}`;
}

function buildLinkedInPost(form: FormData): string {
  const dateStr  = new Date((form.event_date || "2026-01-01") + "T12:00:00")
    .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const needs    = form.materials_requested;
  const hasStaff = needs.includes("On-site Staff");
  const org      = form.event_name || form.requestor_name;

  return `We're proud to partner with CommunityFlow AI to bring free health resources directly to our community.\n\n${org} is hosting a community health event on ${dateStr} in ${form.event_city}, ${form.county} County, Utah.\n\nAt this event, community members will have access to:\n${needs.filter((n) => n !== "On-site Staff").map((n) => `  • ${n}`).join("\n")}${hasStaff ? "\n  • On-site health professionals" : ""}\n\nEstimated reach: ${parseInt(form.estimated_attendees || "0").toLocaleString()} community members.\n\n${form.county} County is among Utah's underserved regions — events like this are a critical step toward closing the health equity gap. No appointment, insurance, or referral needed.\n\nWe believe every Utahn deserves access to quality health education, regardless of where they live.\n\nFollow CommunityFlow AI on LinkedIn for updates on our community partnerships across Utah → linkedin.com/company/communityflow-ai\n\n#HealthEquity #CommunityHealth #Utah #PublicHealth #CommunityFlowAI #${(form.county || "Utah").replace(" ","")}UT`;
}

function buildEmail(form: FormData): { subject: string; body: string } {
  const dateStr  = new Date((form.event_date || "2026-01-01") + "T12:00:00")
    .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const timeStr  = form.event_time
    ? new Date(`2000-01-01T${form.event_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "";
  const needs    = form.materials_requested.filter((n) => n !== "On-site Staff");
  const org      = form.event_name || form.requestor_name;

  const subject = `You're Invited — Free Health Resources in ${form.event_city} on ${new Date((form.event_date || "2026-01-01") + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  const body = `Dear ${form.event_city} Community,

We are excited to invite you to a free community health event hosted by ${org} in partnership with CommunityFlow AI.

━━━ EVENT DETAILS ━━━
📅  ${dateStr}${timeStr ? `  at  ${timeStr}` : ""}
📍  ${form.event_city}, ${form.county} County, Utah ${form.event_zip}
👥  Serving up to ${parseInt(form.estimated_attendees || "0").toLocaleString()} community members

━━━ FREE RESOURCES AVAILABLE ━━━
${needs.map((n) => `  •  ${n}`).join("\n")}

This event is completely free and open to all members of the community. No appointment, insurance card, or referral is required.

━━━ WHY THIS MATTERS ━━━
${form.county} County is among Utah's underserved regions for health resources. Together, we are working to ensure that every community member — regardless of zip code or income — has access to the health education and materials they deserve.

This event is made possible through CommunityFlow AI's community health equity program, which connects local organizations with health resources across all 29 Utah counties.

━━━ LEARN MORE ━━━
Visit us online: communityflow.ai
Follow us on LinkedIn: linkedin.com/company/communityflow-ai

We look forward to seeing you there.

Warm regards,
${org}
${form.requestor_email}${form.requestor_phone ? `\n${form.requestor_phone}` : ""}

—
Powered by CommunityFlow AI · Utah Community Health Dispatch`;

  return { subject, body };
}

// ── Sub-components ────────────────────────────────────────────────────────
function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-all ${
        copied
          ? "bg-sage-50 text-sage-700 border-sage-200"
          : "bg-paper text-ink-muted border-sand-200 hover:border-sand-300 hover:text-ink"
      }`}
    >
      {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> {label}</>}
    </button>
  );
}

function InstagramPreview({ form }: { form: FormData }) {
  const dateStr = new Date((form.event_date || "2026-01-01") + "T12:00:00")
    .toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const org = form.event_name || form.requestor_name;

  return (
    <div className="max-w-[320px] mx-auto">
      <div className="aspect-square bg-gradient-to-br from-sage-800 to-sage-900 relative overflow-hidden rounded-2xl shadow-lg">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 39px, #fff 39px, #fff 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, #fff 39px, #fff 40px)" }}
        />
        <div className="relative z-10 h-full flex flex-col justify-between p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sage-300 text-[9px] font-semibold uppercase tracking-[0.2em]">Community Health</p>
              <p className="text-paper/30 text-[8px] uppercase tracking-widest mt-0.5">CommunityFlow · Utah</p>
            </div>
            <div className="w-8 h-8 bg-white/10 border border-white/20 flex items-center justify-center rounded-full">
              <span className="text-paper text-[10px] font-black">CF</span>
            </div>
          </div>
          <div>
            <p className="text-sage-300 text-xs font-semibold mb-1" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
              Free Health Resources
            </p>
            <h2 className="text-paper text-xl font-bold leading-tight mb-3" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
              {org}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {form.materials_requested.filter((n) => n !== "On-site Staff").slice(0, 4).map((n) => (
                <span key={n} className="text-[9px] bg-white/10 text-paper/80 px-2 py-0.5 rounded-full border border-white/15">
                  {n}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-paper font-bold text-lg leading-none" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                {dateStr}
              </p>
              <p className="text-paper/50 text-[10px] mt-0.5">{form.event_city}, {form.county} County</p>
              <p className="text-sage-300 text-[9px] mt-1 font-semibold uppercase tracking-wide">Free · No appointment needed</p>
            </div>
            <div className="text-right">
              <p className="text-paper/40 text-[9px] uppercase tracking-widest">Reach</p>
              <p className="text-paper font-bold text-xl leading-none" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                {parseInt(form.estimated_attendees || "0").toLocaleString()}+
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmailPreview({ form }: { form: FormData }) {
  const { subject, body } = buildEmail(form);
  const org   = form.event_name || form.requestor_name;
  const dateStr = new Date((form.event_date || "2026-01-01") + "T12:00:00")
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="border border-sand-200 rounded-2xl overflow-hidden">
      {/* Email client chrome */}
      <div className="bg-slate-50 border-b border-sand-200 px-4 py-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-ink-muted w-12 flex-shrink-0">From</span>
          <span className="text-[11px] text-ink">{org} &lt;{form.requestor_email || "contact@org.com"}&gt;</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-ink-muted w-12 flex-shrink-0">To</span>
          <span className="text-[11px] text-ink-muted italic">Community mailing list</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-ink-muted w-12 flex-shrink-0">Subject</span>
          <span className="text-[11px] font-semibold text-ink">{subject}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-ink-muted w-12 flex-shrink-0">Date</span>
          <span className="text-[10px] text-ink-faint">{dateStr}</span>
        </div>
      </div>
      {/* Email body preview */}
      <div className="p-4 bg-white max-h-56 overflow-y-auto custom-scroll">
        <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">{body}</p>
      </div>
    </div>
  );
}

function FlyerPreview({ form }: { form: FormData }) {
  const flyerRef = useRef<HTMLDivElement>(null);
  const dateStr  = new Date((form.event_date || "2026-01-01") + "T12:00:00")
    .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const org = form.event_name || form.requestor_name;

  const handlePrint = () => {
    const el = flyerRef.current;
    if (!el) return;
    const win = window.open("", "_blank")!;
    win.document.write(`<html><head><title>Event Flyer — ${org}</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Outfit:wght@400;500;600;700&display=swap');
      body { margin: 0; padding: 0; }
    </style></head><body>${el.outerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="space-y-3">
      <div ref={flyerRef} className="bg-paper border border-sand-200 max-w-[440px] mx-auto overflow-hidden shadow-sm">
        <div className="bg-sage-900 px-6 py-5">
          <p className="text-sage-300 text-[9px] uppercase tracking-[0.25em] font-semibold mb-1">
            CommunityFlow AI · Utah
          </p>
          <h1 className="text-paper text-2xl font-semibold leading-tight" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
            Free Community<br />Health Event
          </h1>
        </div>
        <div className="px-6 py-4 border-b border-sand-200 bg-sage-50">
          <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-0.5">Hosted by</p>
          <p className="text-ink font-semibold text-lg" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>{org}</p>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 gap-4 border-b border-sand-200">
          <div>
            <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-1">Date</p>
            <p className="text-sm font-medium text-ink">{dateStr}</p>
            {form.event_time && <p className="text-xs text-ink-muted mt-0.5">{new Date(`2000-01-01T${form.event_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-1">Location</p>
            <p className="text-sm font-medium text-ink">{form.event_city}, {form.county} County, Utah</p>
            <p className="text-xs text-ink-muted">{form.event_zip}</p>
          </div>
        </div>
        <div className="px-6 py-4 border-b border-sand-200">
          <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-3">Free Resources Available</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {form.materials_requested.map((n) => (
              <div key={n} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-sage-600 flex-shrink-0" />
                <p className="text-xs text-ink">{n}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 bg-clay-50">
          <p className="text-sm font-semibold text-ink" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
            Open to all community members.
          </p>
          <p className="text-xs text-ink-muted mt-0.5">No appointment, insurance, or referral required.</p>
          <p className="text-[10px] text-clay-700 font-semibold mt-3 uppercase tracking-wider">
            Serving up to {parseInt(form.estimated_attendees || "0").toLocaleString()} attendees · communityflow.ai
          </p>
        </div>
      </div>
      <button
        onClick={handlePrint}
        className="w-full max-w-[440px] mx-auto flex items-center justify-center gap-2 py-2.5 bg-ink text-paper text-xs font-semibold hover:bg-sage-900 transition-colors"
      >
        <Printer size={13} /> Print / Save as PDF
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function PostGenerator({ form, priorityScore }: Props) {
  const [tab, setTab]             = useState<PostTab>("instagram");
  const [generating, setGenerating] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setGenerating(false), 2400);
    return () => clearTimeout(t);
  }, []);

  void priorityScore;

  const igCaption        = buildInstagramCaption(form);
  const liPost           = buildLinkedInPost(form);
  const { subject, body } = buildEmail(form);
  const org              = form.event_name || form.requestor_name;

  const TABS: { id: PostTab; label: string; icon: React.ElementType }[] = [
    { id: "instagram", label: "Instagram", icon: Instagram },
    { id: "linkedin",  label: "LinkedIn",  icon: Linkedin  },
    { id: "email",     label: "Email",     icon: Mail      },
    { id: "flyer",     label: "Flyer",     icon: FileText  },
  ];

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-sand-200 rounded-3xl overflow-hidden shadow-sm mt-5">

      {/* Header */}
      <div className="px-5 py-4 border-b border-sand-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-2xl bg-sage-50 border border-sage-200 flex items-center justify-center">
          <Sparkles size={14} className="text-sage-700" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-ink leading-tight" style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "17px" }}>
            AI Marketing Materials
          </h3>
          <p className="text-[11px] text-ink-muted mt-0.5">Generated for your event · ready to share</p>
        </div>
        {/* LinkedIn page CTA */}
        <a
          href={LINKEDIN_PAGE}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] font-semibold bg-[#0A66C2] text-white px-3 py-1.5 rounded-lg hover:bg-[#094d9b] transition-colors flex-shrink-0"
        >
          <Linkedin size={11} /> Our LinkedIn
          <ExternalLink size={9} className="opacity-70" />
        </a>
      </div>

      {generating ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-sage-400"
                style={{ animation: `bounce-dot 1.2s ${i * 0.2}s infinite` }} />
            ))}
          </div>
          <p className="text-xs text-ink-muted font-medium">Generating your event marketing materials…</p>
          <p className="text-[10px] text-ink-faint">Instagram · LinkedIn · Email · Print Flyer</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex border-b border-sand-100">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-all border-r border-sand-100 last:border-r-0 ${
                  tab === id
                    ? "bg-sage-50 text-sage-800 border-b-2 border-b-sage-600"
                    : "text-ink-muted hover:text-ink hover:bg-sand-50"
                }`}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>

          <div className="p-5">

            {/* ── Instagram ────────────────────────────────────────── */}
            {tab === "instagram" && (
              <div className="space-y-4 animate-fade-in">
                <InstagramPreview form={form} />
                <div className="bg-sand-50 border border-sand-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Caption</p>
                    <div className="flex items-center gap-1.5">
                      <CopyButton text={igCaption} label="Copy Caption" />
                    </div>
                  </div>
                  <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto custom-scroll">{igCaption}</p>
                </div>
                <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-xl">
                  <Instagram size={14} className="text-purple-600 flex-shrink-0" />
                  <p className="text-[11px] text-purple-800 flex-1">Copy the caption above, then post to Instagram with the generated graphic.</p>
                </div>
              </div>
            )}

            {/* ── LinkedIn ─────────────────────────────────────────── */}
            {tab === "linkedin" && (
              <div className="space-y-3 animate-fade-in">
                {/* Post preview */}
                <div className="border border-sand-200 rounded-2xl overflow-hidden">
                  <div className="bg-[#0A66C2] px-4 py-2.5 flex items-center gap-2">
                    <Linkedin size={14} className="text-white" />
                    <p className="text-white text-[11px] font-semibold">LinkedIn Post Preview</p>
                  </div>
                  <div className="p-4 bg-white">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 bg-sage-100 border border-sage-200 rounded-full flex items-center justify-center text-xs font-bold text-sage-800">
                        {org.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-ink">{org}</p>
                        <p className="text-[10px] text-ink-faint">Community Partner · Just now</p>
                      </div>
                    </div>
                    <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap line-clamp-6">{liPost}</p>
                    <p className="text-[10px] text-[#0A66C2] mt-2 font-medium">…see more</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <CopyButton text={liPost} label="Copy Post" />
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://communityflow.ai")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0A66C2] text-white hover:bg-[#094d9b] transition-colors"
                  >
                    <Share2 size={10} /> Share on LinkedIn
                  </a>
                </div>

                {/* Full post copy box */}
                <div className="bg-sand-50 border border-sand-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Full Post Text</p>
                  </div>
                  <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap max-h-44 overflow-y-auto custom-scroll">{liPost}</p>
                </div>

                {/* Company page callout */}
                <a
                  href={LINKEDIN_PAGE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3.5 bg-[#EEF3FB] border border-[#c5d8f5] rounded-xl hover:bg-[#dce8f8] transition-colors group"
                >
                  <div className="w-9 h-9 bg-[#0A66C2] rounded-full flex items-center justify-center flex-shrink-0">
                    <Linkedin size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#0A66C2]">CommunityFlow AI · LinkedIn</p>
                    <p className="text-[10px] text-[#0A66C2]/70 mt-0.5">
                      Follow us to see all partner events and community health updates across Utah.
                    </p>
                  </div>
                  <ExternalLink size={13} className="text-[#0A66C2]/60 flex-shrink-0 group-hover:text-[#0A66C2] transition-colors" />
                </a>
              </div>
            )}

            {/* ── Email ────────────────────────────────────────────── */}
            {tab === "email" && (
              <div className="space-y-3 animate-fade-in">
                <EmailPreview form={form} />

                {/* Subject + body copy */}
                <div className="grid grid-cols-1 gap-2">
                  <div className="bg-sand-50 border border-sand-200 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-0.5">Subject Line</p>
                      <p className="text-xs text-ink truncate">{subject}</p>
                    </div>
                    <CopyButton text={subject} label="Copy" />
                  </div>
                  <div className="flex gap-2">
                    <CopyButton text={body} label="Copy Email Body" />
                    <a
                      href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sage-800 text-paper hover:bg-sage-900 transition-colors"
                    >
                      <Mail size={10} /> Open in Mail App
                    </a>
                  </div>
                </div>

                <div className="p-3 bg-sage-50 border border-sage-100 rounded-xl">
                  <p className="text-[11px] text-sage-800 leading-relaxed">
                    <span className="font-semibold">Tip:</span> Paste this email into your organization's mailing list platform (Mailchimp, Constant Contact, etc.) and adjust the "To" field before sending.
                  </p>
                </div>
              </div>
            )}

            {/* ── Flyer ────────────────────────────────────────────── */}
            {tab === "flyer" && (
              <div className="animate-fade-in">
                <FlyerPreview form={form} />
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
}
