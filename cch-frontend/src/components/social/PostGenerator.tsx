import { useState, useEffect, useRef } from "react";
import {
  Instagram, Linkedin, FileText, Copy, Check,
  Sparkles, Printer,
} from "lucide-react";
import type { FormData } from "../../types/index";

interface Props {
  form: FormData;
  priorityScore: number;
}

type PostTab = "instagram" | "linkedin" | "flyer";

function buildInstagramCaption(form: FormData): string {
  const needs = form.materials_requested;
  const needsShort = needs
    .filter((n) => n !== "On-site Staff")
    .map((n) => n.replace(" Toolkits", "").replace(" Resources", "").replace(" Packets", "").replace(" Kits", ""))
    .join(", ");
  const dateObj = new Date((form.event_date || "2026-01-01") + "T12:00:00");
  const dateStr = dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const orgName = form.event_name || form.requestor_name;
  return `Free community health resources are coming to ${form.event_city}!\n\nJoin ${orgName} and Intermountain Community Health on ${dateStr} for a free health event featuring:\n\n${needs.filter(n => n !== "On-site Staff").map(n => `· ${n}`).join("\n")}\n\nThis event is open to everyone — no insurance or appointment needed. We're committed to bringing health equity to every corner of Utah.\n\n📍 ${form.event_city}, ${form.county} County\n👥 Serving up to ${form.estimated_attendees || "?"} community members\n\n#CommunityHealth #Utah #HealthEquity #FreeResources #${(form.county || "Utah").replace(" ", "")}Utah #PublicHealth #${(needsShort.split(",")[0] || "Health").trim().replace(/\s+/g, "")}`;
}

function buildLinkedInPost(form: FormData): string {
  const dateObj = new Date((form.event_date || "2026-01-01") + "T12:00:00");
  const dateStr = dateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const needs = form.materials_requested;
  const hasStaff = needs.includes("On-site Staff");
  const orgName = form.event_name || form.requestor_name;
  return `We're proud to partner with Intermountain Community Health to bring free health resources directly to our community.\n\n${orgName} will be hosting a community health event on ${dateStr} in ${form.event_city}, ${form.county} County, Utah.\n\nThis event will provide:\n${needs.filter(n => n !== "On-site Staff").map(n => `  • ${n}`).join("\n")}${hasStaff ? "\n  • On-site health professionals" : ""}\n\nEstimated reach: ${parseInt(form.estimated_attendees || "0").toLocaleString()} community members.\n\n${form.county} County is among Utah's underserved regions — events like this are a critical step toward closing the health equity gap. No appointment, insurance, or referral needed.\n\nWe believe every Utahn deserves access to quality health education and resources, regardless of where they live.\n\nLearn more about CCH's community outreach program at intermountainhealthcare.org.\n\n#HealthEquity #CommunityHealth #Utah #PublicHealth #Intermountain #${(form.county || "Utah").replace(" ", "")}UT`;
}

function InstagramPreview({ form }: { form: FormData }) {
  const dateObj = new Date((form.event_date || "2026-01-01") + "T12:00:00");
  const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const orgName = form.event_name || form.requestor_name;

  return (
    <div className="max-w-[340px] mx-auto">
      <div className="aspect-square bg-gradient-to-br from-sage-800 to-sage-900 relative overflow-hidden rounded-2xl shadow-lg">
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle at 30% 70%, #fff 0%, transparent 50%), radial-gradient(circle at 80% 20%, #fff 0%, transparent 40%)" }}
        />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 39px, #fff 39px, #fff 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, #fff 39px, #fff 40px)" }}
        />
        <div className="relative z-10 h-full flex flex-col justify-between p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sage-300 text-[9px] font-semibold uppercase tracking-[0.2em]">Community Health</p>
              <p className="text-paper/30 text-[8px] uppercase tracking-widest mt-0.5">Intermountain · Utah</p>
            </div>
            <div className="w-8 h-8 bg-white/10 border border-white/20 flex items-center justify-center rounded-full">
              <span className="text-paper text-[10px] font-black">CCH</span>
            </div>
          </div>

          <div>
            <p className="text-sage-300 text-sm font-semibold mb-1" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
              Free Health Resources
            </p>
            <h2 className="text-paper text-2xl font-bold leading-tight mb-3" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
              {orgName}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {form.materials_requested.filter(n => n !== "On-site Staff").slice(0, 4).map((n) => (
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

function FlyerPreview({ form }: { form: FormData }) {
  const flyerRef = useRef<HTMLDivElement>(null);
  const dateObj  = new Date((form.event_date || "2026-01-01") + "T12:00:00");
  const dateStr  = dateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const orgName  = form.event_name || form.requestor_name;

  const handlePrint = () => {
    const el = flyerRef.current;
    if (!el) return;
    const win = window.open("", "_blank")!;
    win.document.write(`<html><head><title>Event Flyer</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Outfit:wght@400;500;600;700&display=swap');
      body { margin: 0; padding: 0; }
    </style></head><body>${el.outerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="space-y-3">
      <div ref={flyerRef} className="bg-paper border border-sand-200 max-w-[480px] mx-auto overflow-hidden shadow-sm">
        <div className="bg-sage-900 px-6 py-5">
          <p className="text-sage-300 text-[9px] uppercase tracking-[0.25em] font-semibold mb-1">
            Intermountain Community Children's Health
          </p>
          <h1 className="text-paper text-2xl font-semibold leading-tight" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
            Free Community<br />Health Event
          </h1>
        </div>

        <div className="px-6 py-4 border-b border-sand-200 bg-sage-50">
          <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-0.5">Hosted by</p>
          <p className="text-ink font-semibold text-lg" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
            {orgName}
          </p>
        </div>

        <div className="px-6 py-4 grid grid-cols-2 gap-4 border-b border-sand-200">
          <div>
            <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-1">Date</p>
            <p className="text-sm font-medium text-ink">{dateStr}</p>
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
            Serving up to {parseInt(form.estimated_attendees || "0").toLocaleString()} attendees · intermountainhealthcare.org
          </p>
        </div>
      </div>

      <button
        onClick={handlePrint}
        className="w-full max-w-[480px] mx-auto flex items-center justify-center gap-2 py-2.5 bg-ink text-paper text-xs font-semibold hover:bg-sage-900 transition-colors"
      >
        <Printer size={13} /> Print Flyer
      </button>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-all ${
        copied
          ? "bg-sage-50 text-sage-700 border-sage-200"
          : "bg-paper text-ink-muted border-sand-200 hover:border-sand-300 hover:text-ink"
      }`}
    >
      {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
    </button>
  );
}

export default function PostGenerator({ form, priorityScore }: Props) {
  const [tab, setTab]           = useState<PostTab>("instagram");
  const [generating, setGenerating] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setGenerating(false), 2200);
    return () => clearTimeout(t);
  }, []);

  const igCaption = buildInstagramCaption(form);
  const liPost    = buildLinkedInPost(form);
  const orgName   = form.event_name || form.requestor_name;

  const TABS: { id: PostTab; label: string; icon: React.ElementType }[] = [
    { id: "instagram", label: "Instagram",   icon: Instagram },
    { id: "linkedin",  label: "LinkedIn",    icon: Linkedin  },
    { id: "flyer",     label: "Print Flyer", icon: FileText  },
  ];

  // Suppress unused variable warning
  void priorityScore;

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-sand-200 rounded-3xl overflow-hidden shadow-sm mt-5">
      <div className="px-5 py-4 border-b border-sand-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-2xl bg-sage-50 border border-sage-200 flex items-center justify-center">
          <Sparkles size={14} className="text-sage-700" />
        </div>
        <div>
          <h3 className="font-semibold text-ink text-sm" style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "16px" }}>
            Promotional Materials
          </h3>
          <p className="text-[11px] text-ink-muted">AI-generated for your event · ready to share</p>
        </div>
      </div>

      {generating ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-sage-400"
                style={{ animation: `bounce-dot 1.2s ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
          <p className="text-xs text-ink-muted font-medium">Generating your event materials…</p>
        </div>
      ) : (
        <>
          <div className="flex border-b border-sand-100">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all border-r border-sand-100 last:border-r-0 ${
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
            {tab === "instagram" && (
              <div className="space-y-4 animate-fade-in">
                <InstagramPreview form={form} />
                <div className="bg-sand-50 border border-sand-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Caption</p>
                    <CopyButton text={igCaption} />
                  </div>
                  <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">{igCaption}</p>
                </div>
              </div>
            )}

            {tab === "linkedin" && (
              <div className="space-y-3 animate-fade-in">
                <div className="border border-sand-200 rounded-2xl overflow-hidden">
                  <div className="bg-[#0A66C2] px-4 py-3 flex items-center gap-2">
                    <Linkedin size={16} className="text-white" />
                    <p className="text-white text-xs font-semibold">LinkedIn Post Preview</p>
                  </div>
                  <div className="p-4 bg-white">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 bg-sage-100 border border-sage-200 rounded-full flex items-center justify-center text-xs font-bold text-sage-800">
                        {orgName.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-ink">{orgName}</p>
                        <p className="text-[10px] text-ink-faint">Community Partner · Just now</p>
                      </div>
                    </div>
                    <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap line-clamp-6">{liPost}</p>
                    <p className="text-[10px] text-[#0A66C2] mt-2 font-medium cursor-pointer">…see more</p>
                  </div>
                </div>
                <div className="bg-sand-50 border border-sand-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Full Post</p>
                    <CopyButton text={liPost} />
                  </div>
                  <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto custom-scroll">{liPost}</p>
                </div>
              </div>
            )}

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
