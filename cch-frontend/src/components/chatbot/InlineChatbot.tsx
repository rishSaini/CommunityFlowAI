import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, RotateCcw, CheckCircle2, Bot } from "lucide-react";
import {
  parseMessage, buildBotReply, getMissingFields, FIELD_LABELS,
} from "../../lib/chatbotParser";
import type { FormData } from "../../types/index";
import type { FieldKey } from "../../lib/chatbotParser";

interface Message {
  id: number;
  role: "bot" | "user";
  text: string;
}

interface Props {
  form: FormData;
  onAutofill: (updates: Partial<FormData>) => void;
}

const WELCOME =
  `Hi! 👋 Tell me about your event in plain language and I'll fill the form for you.\n\nFor example: *"I'm from Hillcrest High School and we're hosting a mental health event for about 200 students on April 22nd."*`;

const FIELD_DISPLAY: Record<FieldKey, string> = {
  name:          "Organization",
  eventDate:     "Event Date",
  city:          "City",
  county:        "County",
  zipCode:       "Zip Code",
  attendeeCount: "Attendees",
  needs:         "Resources",
};

function ProgressBar({ form }: { form: FormData }) {
  const all: FieldKey[] = ["name", "eventDate", "city", "county", "zipCode", "attendeeCount", "needs"];
  const filled = all.filter((f) => {
    if (f === "needs") return (form.needs?.length ?? 0) > 0;
    return !!form[f];
  });
  const pct = Math.round((filled.length / all.length) * 100);

  return (
    <div className="px-4 pb-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-slate-500">Form completion</span>
        <span className="text-[11px] font-bold text-indigo-600">{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {all.map((f) => {
          const done = f === "needs" ? (form.needs?.length ?? 0) > 0 : !!form[f];
          return (
            <span
              key={f}
              className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold transition-all duration-300 ${
                done
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {done ? "✓ " : ""}{FIELD_DISPLAY[f]}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function InlineChatbot({ form, onAutofill }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [typing, setTyping]     = useState(false);
  const [highlights, setHighlights] = useState<string[]>([]);
  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFirst  = useRef(true);

  const addBot = useCallback((text: string, delay = 700): Promise<void> =>
    new Promise((res) => {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setMessages((p) => [...p, { id: Date.now() + Math.random(), role: "bot", text }]);
        res();
      }, delay);
    }), []);

  // Welcome message on mount
  useEffect(() => {
    addBot(WELCOME, 400);
  }, []);

  // Scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const handleSend = async (text = input.trim()) => {
    if (!text || typing) return;
    setInput("");
    setMessages((p) => [...p, { id: Date.now(), role: "user", text }]);

    const parsed   = parseMessage(text, form);
    const updates  = parsed.extracted;
    const detected = parsed.detectedFields;

    // Merge updates into current form for reply generation
    const updatedForm: FormData = {
      ...form,
      ...updates,
      needs: updates.needs ?? form.needs,
    };

    // Apply autofill
    if (Object.keys(updates).length > 0) {
      onAutofill(updates);
      // Briefly highlight the filled fields
      setHighlights(detected);
      setTimeout(() => setHighlights([]), 2500);
    }

    const reply = buildBotReply(parsed, updatedForm, isFirst.current);
    isFirst.current = false;
    await addBot(reply, detected.length > 0 ? 800 : 600);
    inputRef.current?.focus();
  };

  const handleReset = () => {
    setMessages([]);
    isFirst.current = true;
    setTimeout(() => addBot(WELCOME, 300), 100);
  };

  const missing = getMissingFields(form);
  const allDone = missing.length === 0;

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Bot size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight">AI Form Assistant</p>
          <p className="text-white/60 text-[11px]">
            {allDone ? "All fields complete 🎉" : `${missing.length} field${missing.length !== 1 ? "s" : ""} remaining`}
          </p>
        </div>
        <button
          onClick={handleReset}
          className="p-1.5 rounded-xl bg-white/10 hover:bg-white/25 transition-colors flex-shrink-0"
          title="Restart"
        >
          <RotateCcw size={13} className="text-white/80" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="pt-3 flex-shrink-0">
        <ProgressBar form={form} />
      </div>

      {/* Highlights banner */}
      {highlights.length > 0 && (
        <div className="mx-4 mb-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center gap-2 animate-fade-in flex-shrink-0">
          <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
          <p className="text-[11px] text-emerald-700 font-semibold">
            Auto-filled: {highlights.map((f) => FIELD_LABELS[f as FieldKey] ?? f).join(", ")}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 custom-scroll min-h-0">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            {msg.role === "bot" && (
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5 shadow-sm">
                <Sparkles size={11} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-sm shadow-sm"
                  : "bg-slate-50 text-slate-700 rounded-tl-sm border border-slate-100"
              }`}
              dangerouslySetInnerHTML={{
                __html: msg.role === "bot"
                  ? msg.text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")
                  : msg.text,
              }}
            />
          </div>
        ))}

        {typing && (
          <div className="flex items-start gap-2 animate-fade-in">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Sparkles size={11} className="text-white" />
            </div>
            <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-3 py-2 border border-slate-100 flex gap-1 items-center">
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

        {/* Quick-fill chips when fields are missing */}
        {!typing && !allDone && messages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-8 animate-fade-in">
            {missing.slice(0, 3).map((f) => (
              <button
                key={f}
                onClick={() => {
                  const prompts: Record<FieldKey, string> = {
                    name:          "We're from [Organization Name]",
                    eventDate:     "The event is on April 22, 2026",
                    city:          "It's in Salt Lake City",
                    county:        "Salt Lake County",
                    zipCode:       "Zip code is 84101",
                    attendeeCount: "About 150 people will attend",
                    needs:         "We need mental health resources",
                  };
                  setInput(prompts[f]);
                  inputRef.current?.focus();
                }}
                className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-1 rounded-full font-semibold hover:bg-indigo-100 transition-colors"
              >
                + {FIELD_LABELS[f]}
              </button>
            ))}
          </div>
        )}

        {allDone && !typing && (
          <div className="flex justify-center animate-fade-in">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-2 rounded-full">
              <CheckCircle2 size={13} />
              All fields complete — ready to submit!
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2 bg-slate-50 rounded-2xl pl-3.5 pr-1.5 py-1.5 border border-slate-200 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Describe your event…"
            className="flex-1 bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || typing}
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
              input.trim() && !typing
                ? "bg-gradient-to-br from-indigo-600 to-violet-600 hover:shadow-sm hover:shadow-indigo-200"
                : "bg-slate-100"
            }`}
          >
            <Send size={12} className={input.trim() && !typing ? "text-white" : "text-slate-400"} />
          </button>
        </div>
      </div>
    </div>
  );
}
