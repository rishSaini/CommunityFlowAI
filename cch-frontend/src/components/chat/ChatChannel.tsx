import { useState, useEffect, useRef } from "react";
import { Send, Loader2, MessageCircle, User, ArrowLeft } from "lucide-react";
import { messagesApi } from "../../lib/api";
import type { MessageResponse, ChannelResponse } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

interface Props {
  channel: ChannelResponse;
  onBack?: () => void;
}

export default function ChatChannel({ channel, onBack }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [newMsg, setNewMsg]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // Determine who the "other person" is
  const isPartner = user?.role === "partner";
  const otherName = isPartner ? (channel.staff_name || "CCH Representative") : channel.partner_name;

  // Load messages
  const loadMessages = async () => {
    try {
      const msgs = await messagesApi.getMessages(channel.request_id);
      setMessages(msgs);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    // Poll every 5s for new messages
    pollRef.current = setInterval(loadMessages, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [channel.request_id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMsg.trim() || sending) return;
    setSending(true);
    try {
      const msg = await messagesApi.sendMessage(channel.request_id, newMsg.trim());
      setMessages((prev) => [...prev, msg]);
      setNewMsg("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Channel header */}
      <div className="px-4 py-3 border-b border-sand-100 flex items-center gap-3 flex-shrink-0">
        {onBack && (
          <button onClick={onBack} className="p-1 rounded-lg hover:bg-sand-100 transition-colors">
            <ArrowLeft size={14} className="text-ink-muted" />
          </button>
        )}
        <div className="w-8 h-8 rounded-full bg-sage-100 border border-sage-200 flex items-center justify-center text-sage-700 flex-shrink-0">
          <User size={12} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{otherName}</p>
          <p className="text-[10px] text-ink-muted truncate">{channel.event_name} · {channel.event_city}</p>
        </div>
        <div className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
          channel.status === "dispatched" ? "bg-blue-50 text-blue-700 border border-blue-200"
          : channel.status === "in_progress" ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
          : channel.status === "approved" ? "bg-amber-50 text-amber-700 border border-amber-200"
          : "bg-sage-50 text-sage-700 border border-sage-200"
        }`}>
          {channel.status.replace("_", " ")}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scroll">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={18} className="animate-spin text-ink-muted" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-ink-faint">
            <MessageCircle size={28} className="mb-2 opacity-30" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs mt-1">Send a message to start the conversation</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                isMe
                  ? "bg-sage-700 text-white rounded-br-md"
                  : "bg-sand-100 text-ink rounded-bl-md"
              }`}>
                {!isMe && (
                  <p className={`text-[10px] font-semibold mb-0.5 ${
                    msg.sender_role === "staff" ? "text-sage-600" : "text-ink-muted"
                  }`}>
                    {msg.sender_name}
                    {msg.sender_role === "staff" && <span className="ml-1 opacity-60">· CCH Staff</span>}
                  </p>
                )}
                <p className={`text-[13px] leading-relaxed ${isMe ? "text-white" : "text-ink"}`}>
                  {msg.content}
                </p>
                <p className={`text-[9px] mt-1 ${isMe ? "text-white/50" : "text-ink-faint"}`}>
                  {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-sand-100 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${otherName}...`}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-sand-200 bg-white px-3.5 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-sage-500 transition-colors"
            style={{ minHeight: 40, maxHeight: 100 }}
          />
          <button
            onClick={handleSend}
            disabled={!newMsg.trim() || sending}
            className="w-9 h-9 rounded-xl bg-sage-700 text-white flex items-center justify-center hover:bg-sage-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}
