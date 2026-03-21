import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, RotateCcw, CheckCircle2, Bot } from "lucide-react";
import {
  parseMessage, buildBotReply, getMissingFields, FIELD_LABELS,
} from "../../lib/chatbotParser";
import { chatbotApi } from "../../lib/api";
import type { FormData } from "../../types/index";
import type { FieldKey } from "../../lib/chatbotParser";
import type { ChatMessage } from "../../lib/api";

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
  `Tell me about your event in plain language and I'll fill the form for you.\n\n*Example: "I'm from Hillcrest High School and we're hosting a mental health event for about 200 students on April 22nd."*`;

const FIELD_DISPLAY: Record<FieldKey, string> = {
  requestor_name:      "Organization",
  event_date:          "Event Date",
  event_city:          "City",
  county:              "County",
  event_zip:           "Zip Code",
  estimated_attendees: "Attendees",
  materials_requested: "Resources",
};

function ProgressBar({ form }: { form: FormData }) {
  const all: FieldKey[] = ["requestor_name", "event_date", "event_city", "county", "event_zip", "estimated_attendees", "materials_requested"];
  const filled = all.filter((f) => {
    if (f === "materials_requested") return (form.materials_requested?.length ?? 0) > 0;
    return !!(form as Record<string, unknown>)[f];
  });
  const pct = Math.round((filled.length / all.length) * 100);

  return (
    <div className="px-4 pb-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide">Form completion</span>
        <span className="text-[10px] font-bold text-sage-700">{pct}%</span>
      </div>
      <div className="h-0.5 bg-sand-200 overflow-hidden">
        <div
          className="h-full bg-sage-600 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {all.map((f) => {
          const done = f === "materials_requested" ? (form.materials_requested?.length ?? 0) > 0 : !!(form as Record<string, unknown>)[f];
          return (
            <span
              key={f}
              className={`text-[10px] px-1.5 py-0.5 font-medium transition-all duration-300 ${
                done
                  ? "bg-sage-50 text-sage-700 border border-sage-200"
                  : "bg-sand-50 text-ink-faint border border-sand-200"
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
  // Keep API-format chat history for the backend
  const chatHistory = useRef<ChatMessage[]>([]);

  const addBot = useCallback((text: string, delay = 700): Promise<void> =>
    new Promise((res) => {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setMessages((p) => [...p, { id: Date.now() + Math.random(), role: "bot", text }]);
        res();
      }, delay);
    }), []);

  useEffect(() => { addBot(WELCOME, 400); }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const handleSend = async (text = input.trim()) => {
    if (!text || typing) return;
    setInput("");
    setMessages((p) => [...p, { id: Date.now(), role: "user", text }]);

    // Always do local parse for instant field autofill
    const parsed   = parseMessage(text, form);
    const updates  = parsed.extracted;
    const detected = parsed.detectedFields;

    const updatedForm: FormData = {
      ...form,
      ...updates,
      materials_requested: updates.materials_requested ?? form.materials_requested,
    };

    if (Object.keys(updates).length > 0) {
      onAutofill(updates);
      setHighlights(detected);
      setTimeout(() => setHighlights([]), 2500);
    }

    // Try real backend chatbot; fall back to local parser reply
    chatHistory.current.push({ role: "user", content: text });
    try {
      const currentFormState = Object.fromEntries(
        Object.entries(updatedForm).filter(([, v]) => v !== "" && v !== null && (Array.isArray(v) ? v.length > 0 : true))
      );
      const res = await chatbotApi.sendMessage(chatHistory.current, currentFormState);

      // Apply any field_updates from the backend
      if (res.field_updates && Object.keys(res.field_updates).length > 0) {
        const backendUpdates = res.field_updates as Partial<FormData>;
        onAutofill(backendUpdates);
        const newFields = Object.keys(backendUpdates);
        setHighlights((h) => [...new Set([...h, ...newFields])]);
        setTimeout(() => setHighlights([]), 2500);
      }

      const replyText = res.reply;
      chatHistory.current.push({ role: "assistant", content: replyText });
      setTyping(false);
      setMessages((p) => [...p, { id: Date.now() + Math.random(), role: "bot", text: replyText }]);
    } catch {
      // Backend unavailable — fall back to local reply
      const reply = buildBotReply(parsed, updatedForm, isFirst.current);
      isFirst.current = false;
      await addBot(reply, detected.length > 0 ? 800 : 600);
    }

    inputRef.current?.focus();
  };

  const handleReset = () => {
    setMessages([]);
    chatHistory.current = [];
    isFirst.current = true;
    setTimeout(() => addBot(WELCOME, 300), 100);
  };

  const missing = getMissingFields(form);
  const allDone = missing.length === 0;

  return (
    <div className="flex flex-col h-full bg-white border border-sand-200 overflow-hidden">

      {/* Header */}
      <div className="bg-sage-800 px-4 py-3.5 flex items-center gap-3 flex-shrink-0">
        <div className="w-7 h-7 bg-white/15 flex items-center justify-center flex-shrink-0">
          <Bot size={14} className="text-paper" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-paper font-semibold text-sm leading-tight">AI Form Assistant</p>
          <p className="text-paper/50 text-[10px] tracking-wide">
            {allDone ? "All fields complete" : `${missing.length} field${missing.length !== 1 ? "s" : ""} remaining`}
          </p>
        </div>
        <button
          onClick={handleReset}
          className="p-1.5 hover:bg-white/10 transition-colors flex-shrink-0"
          title="Restart"
        >
          <RotateCcw size={12} className="text-paper/60" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="pt-3 flex-shrink-0 border-b border-sand-100">
        <ProgressBar form={form} />
      </div>

      {/* Autofill banner */}
      {highlights.length > 0 && (
        <div className="mx-4 my-2 bg-sage-50 border border-sage-200 px-3 py-2 flex items-center gap-2 animate-fade-in flex-shrink-0">
          <CheckCircle2 size={12} className="text-sage-600 flex-shrink-0" />
          <p className="text-[11px] text-sage-700 font-medium">
            Auto-filled: {highlights.map((f) => FIELD_LABELS[f as FieldKey] ?? f).join(", ")}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scroll min-h-0">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            {msg.role === "bot" && (
              <div className="w-5 h-5 bg-sage-600 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                <Sparkles size={10} className="text-paper" />
              </div>
            )}
            <div
              className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-ink text-paper"
                  : "bg-sand-50 text-ink border border-sand-200"
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
            <div className="w-5 h-5 bg-sage-600 flex items-center justify-center flex-shrink-0">
              <Sparkles size={10} className="text-paper" />
            </div>
            <div className="bg-sand-50 border border-sand-200 px-3 py-2 flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 bg-sage-400"
                  style={{ animation: `bounce-dot 1.2s ${i * 0.18}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quick-fill chips */}
        {!typing && !allDone && messages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-7 animate-fade-in">
            {missing.slice(0, 3).map((f) => (
              <button
                key={f}
                onClick={() => {
                  const prompts: Record<FieldKey, string> = {
                    requestor_name:      "We're from [Organization Name]",
                    event_date:          "The event is on April 22, 2026",
                    event_city:          "It's in Salt Lake City",
                    county:              "Salt Lake County",
                    event_zip:           "Zip code is 84101",
                    estimated_attendees: "About 150 people will attend",
                    materials_requested: "We need mental health resources",
                  };
                  setInput(prompts[f]);
                  inputRef.current?.focus();
                }}
                className="text-[10px] bg-sage-50 text-sage-700 border border-sage-200 px-2 py-1 font-medium hover:bg-sage-100 transition-colors"
              >
                + {FIELD_LABELS[f]}
              </button>
            ))}
          </div>
        )}

        {allDone && !typing && (
          <div className="flex justify-center animate-fade-in">
            <div className="flex items-center gap-2 bg-sage-50 border border-sage-200 text-sage-700 text-xs font-semibold px-3 py-2">
              <CheckCircle2 size={12} />
              All fields complete — ready to submit
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-sand-200 flex-shrink-0">
        <div className="flex items-center gap-2 bg-paper border border-sand-200 focus-within:border-sage-600 transition-all">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Describe your event…"
            className="flex-1 bg-transparent text-xs text-ink placeholder-ink-faint outline-none px-3 py-2.5"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || typing}
            className={`w-8 h-8 flex items-center justify-center transition-all flex-shrink-0 mr-1 ${
              input.trim() && !typing
                ? "bg-sage-800 text-paper hover:bg-sage-900"
                : "bg-sand-100 text-ink-faint"
            }`}
          >
            <Send size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
