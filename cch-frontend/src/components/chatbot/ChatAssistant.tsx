import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, X, Sparkles, RotateCcw, MessageCircle } from "lucide-react";
import type { FormData } from "../../types/index";

interface Message { id: number; role: "bot" | "user"; text: string; }

type StepId = "greeting"|"eventDate"|"city"|"zipCode"|"attendeeCount"|"needs"|"confirm";

interface Step {
  id: StepId;
  botMessage: string | ((v: string) => string);
  field: keyof FormData | null;
  expectsInput: boolean;
  actions?: string[];
}

const STEPS: Step[] = [
  { id: "greeting",      botMessage: "Hi there! 👋 I'm your AI resource assistant. I can auto-fill the request form in seconds.\n\nWhat's your organization's name?",                                field: null,            expectsInput: true  },
  { id: "eventDate",     botMessage: (name)  => `Great to meet you, ${name}! 🌟\n\nWhen is your event? (e.g., April 15, 2026)`,                                                                field: "name",          expectsInput: true  },
  { id: "city",          botMessage: ()      => "What city will the event be held in?",                                                                                                         field: "eventDate",     expectsInput: true  },
  { id: "zipCode",       botMessage: (city)  => `Got it — ${city}! What's the zip code?`,                                                                                                       field: "city",          expectsInput: true  },
  { id: "attendeeCount", botMessage: ()      => "How many attendees are you expecting?",                                                                                                        field: "zipCode",        expectsInput: true  },
  { id: "needs",         botMessage: (count) => `${count} attendees — great! 🎉\n\nWhat resources do you need? List any that apply:\n• Nutrition Toolkits\n• Vaccine Info Packets\n• Mental Health Resources\n• Diabetes Prevention Kits\n• Dental Health Kits\n• Substance Abuse Toolkits\n• On-site Staff`, field: "attendeeCount", expectsInput: true  },
  { id: "confirm",       botMessage: ()      => "Perfect! I have everything. Ready to auto-fill the form?",                                                                                     field: "needs",          expectsInput: false, actions: ["Yes, fill it!", "Start over"] },
];

const ALL_NEEDS = ["Nutrition Toolkits","Vaccine Info Packets","Mental Health Resources","Diabetes Prevention Kits","Dental Health Kits","Substance Abuse Toolkits","On-site Staff"];

const CITY_COUNTY: Record<string, string> = {
  "blanding":"San Juan","moab":"Grand","torrey":"Wayne","castle dale":"Emery","junction":"Piute","tooele":"Tooele","logan":"Cache","salt lake city":"Salt Lake","salt lake":"Salt Lake","provo":"Utah","ogden":"Weber","st george":"Washington","saint george":"Washington","cedar city":"Iron","price":"Carbon","vernal":"Uintah","richfield":"Sevier","nephi":"Juab","fillmore":"Millard","kanab":"Kane","panguitch":"Garfield","escalante":"Garfield","monticello":"San Juan","green river":"Emery","delta":"Millard","brigham city":"Box Elder","layton":"Davis","bountiful":"Davis","murray":"Salt Lake","west valley city":"Salt Lake","taylorsville":"Salt Lake","park city":"Summit","heber city":"Wasatch","roosevelt":"Duchesne","duchesne":"Duchesne","manila":"Daggett","coalville":"Summit","randolph":"Rich","morgan":"Morgan","farmington":"Davis","kaysville":"Davis","american fork":"Utah","lehi":"Utah","orem":"Utah","springville":"Utah","spanish fork":"Utah",
};

function parseDate(s: string): string {
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  const m = s.match(/(\w+)\s+(\d+)[,\s]+(\d{4})/);
  if (m) { const d2 = new Date(`${m[1]} ${m[2]}, ${m[3]}`); if (!isNaN(d2.getTime())) return d2.toISOString().split("T")[0]; }
  return s;
}
function parseNeeds(s: string): string[] {
  const l = s.toLowerCase();
  return ALL_NEEDS.filter((n) => l.includes(n.toLowerCase().split(" ")[0]));
}
function inferCounty(city: string): string {
  return CITY_COUNTY[city.toLowerCase().trim()] ?? "Salt Lake";
}

interface Props { onAutofill: (data: Partial<FormData>) => void; }

export default function ChatAssistant({ onAutofill }: Props) {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [stepIdx, setStepIdx]     = useState(0);
  const [collected, setCollected] = useState<Partial<FormData>>({});
  const [typing, setTyping]       = useState(false);
  const [done, setDone]           = useState(false);
  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollBot = () => endRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollBot, [messages, typing]);

  const addBot = useCallback((text: string, delay = 650): Promise<void> =>
    new Promise((res) => {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setMessages((p) => [...p, { id: Date.now(), role: "bot", text }]);
        res();
      }, delay);
    }), []);

  const restart = useCallback(async () => {
    setMessages([]); setCollected({}); setStepIdx(0); setDone(false); setInput("");
    await addBot(STEPS[0].botMessage as string, 300);
  }, [addBot]);

  useEffect(() => { if (open && messages.length === 0) restart(); }, [open]);

  const handleSend = async (text = input.trim()) => {
    if (!text) return;
    setInput("");
    setMessages((p) => [...p, { id: Date.now(), role: "user", text }]);

    const cur  = STEPS[stepIdx];
    const next = stepIdx + 1;

    let val: string | string[] = text;
    if (cur.field === "eventDate") val = parseDate(text);
    if (cur.field === "needs")     val = parseNeeds(text);

    const newData: Partial<FormData> = cur.field
      ? { ...collected, [cur.field]: val }
      : { ...collected, name: text };
    setCollected(newData);

    if (next < STEPS.length) {
      const ns = STEPS[next];
      const msg = typeof ns.botMessage === "function" ? ns.botMessage(text) : ns.botMessage;
      setStepIdx(next);
      await addBot(msg);
      if (ns.expectsInput) setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleAction = async (action: string) => {
    setMessages((p) => [...p, { id: Date.now(), role: "user", text: action }]);
    if (action === "Start over") { setTimeout(restart, 300); return; }
    if (action === "Yes, fill it!") {
      const county = inferCounty(collected.city ?? "");
      const payload: Partial<FormData> = { ...collected, county };
      await addBot("✨ Filling the form now…", 350);
      await addBot(
        `Done! I've filled in:\n• **${payload.name}**\n• ${payload.city}, ${county} Co.\n• ${payload.attendeeCount} attendees\n• ${Array.isArray(payload.needs) && payload.needs.length ? payload.needs.join(", ") : "no specific needs"}\n\nReview the form and hit Submit! 🚀`,
        900,
      );
      onAutofill(payload);
      setDone(true);
    }
  };

  const cur = STEPS[stepIdx];
  const showActions = !typing && cur && !cur.expectsInput && cur.actions;

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-300 z-40 ${
          open
            ? "bg-slate-800 hover:bg-slate-700"
            : "bg-gradient-to-br from-indigo-600 to-violet-600 hover:scale-110 hover:shadow-indigo-300 hover:shadow-2xl"
        }`}
        aria-label="Toggle AI Assistant"
      >
        {open
          ? <X size={20} className="text-white" />
          : <MessageCircle size={20} className="text-white" />}
        {!open && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 rounded-full border-2 border-white text-white text-[9px] flex items-center justify-center font-black shadow-sm">
            AI
          </span>
        )}
      </button>

      {/* Window */}
      {open && (
        <div className="fixed bottom-24 right-6 w-[360px] max-h-[560px] flex flex-col rounded-3xl shadow-2xl border border-slate-200/60 z-40 animate-chat-open overflow-hidden bg-white/95 backdrop-blur-xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Bot size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Resource AI Assistant</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <p className="text-white/70 text-xs">Online · Powered by AI</p>
              </div>
            </div>
            <button
              onClick={restart}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              title="Restart"
            >
              <RotateCcw size={13} className="text-white/80" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll min-h-0 bg-slate-50/50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                {msg.role === "bot" && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5 shadow-sm">
                    <Sparkles size={12} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line shadow-sm ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-sm"
                    : "bg-white text-slate-700 rounded-tl-sm border border-slate-100"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex items-start gap-2 animate-fade-in">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Sparkles size={12} className="text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center shadow-sm border border-slate-100">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                      style={{ animation: `bounce-dot 1.2s ${i * 0.18}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {showActions && (
              <div className="flex flex-wrap gap-2 pl-9 animate-fade-in">
                {cur.actions!.map((action) => (
                  <button
                    key={action}
                    onClick={() => handleAction(action)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 shadow-sm ${
                      action === "Yes, fill it!"
                        ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-md hover:shadow-indigo-200 hover:-translate-y-0.5"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          {!done && cur?.expectsInput && (
            <div className="p-3 bg-white border-t border-slate-100">
              <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-3.5 py-2 border border-slate-200 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type your reply…"
                  className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                    input.trim()
                      ? "bg-gradient-to-br from-indigo-600 to-violet-600 hover:shadow-sm hover:shadow-indigo-200"
                      : "bg-slate-100"
                  }`}
                >
                  <Send size={12} className={input.trim() ? "text-white" : "text-slate-400"} />
                </button>
              </div>
            </div>
          )}
          {done && (
            <div className="p-3 bg-white border-t border-slate-100">
              <button
                onClick={restart}
                className="w-full py-2 text-sm text-indigo-600 font-semibold hover:bg-indigo-50 rounded-xl transition-colors"
              >
                Start a new request
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
