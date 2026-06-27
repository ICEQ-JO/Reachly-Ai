"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, BarChart2, Megaphone, FileText, Sparkles, TrendingUp, Calendar, Lightbulb, LineChart } from "lucide-react";
import { toast } from "sonner";

type Card =
  | { type: "text"; content: string }
  | { type: "analytics"; title: string; metrics: { label: string; value: string; trend: "up" | "down" | "neutral" }[] }
  | { type: "campaign_summary"; name: string; platforms: string[]; stats: { posts: number; approved: number } }
  | { type: "post_preview"; platform: string; content: string }
  | { type: string; [key: string]: unknown };

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  cards?: Card[];
};

interface Props {
  initialMessages: Message[];
  productName: string;
  suggestions?: string[];
}

const DEFAULT_SUGGESTIONS = [
  "How are my campaigns performing?",
  "What content should I post this week?",
  "Analyze my engagement",
  "Which platform gets the best results?",
];

// Rotate a small icon set across the suggestion cards for visual texture.
const SUGGESTION_ICONS = [TrendingUp, Lightbulb, LineChart, Calendar, Sparkles, BarChart2];

const COL = 760; // centered conversation column width

function AnalyticsCard({ card }: { card: Extract<Card, { type: "analytics" }> }) {
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-subtle)" }}>
        <BarChart2 size={15} color="var(--accent)" />
        <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--fg)" }}>{card.title}</span>
      </div>
      <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "12px" }}>
        {(card.metrics ?? []).map((m, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "22px", fontWeight: "750", letterSpacing: "-0.01em", color: m.trend === "up" ? "var(--green)" : m.trend === "down" ? "var(--red)" : "var(--fg)" }}>
              {m.value} {m.trend === "up" ? "↑" : m.trend === "down" ? "↓" : ""}
            </div>
            <div style={{ fontSize: "11px", color: "var(--fg-muted)", marginTop: "3px" }}>{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CampaignCard({ card }: { card: Extract<Card, { type: "campaign_summary" }> }) {
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <Megaphone size={14} color="var(--accent)" />
        <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--fg)" }}>{card.name}</span>
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {(card.platforms ?? []).map((p: string) => (
          <span key={p} className="badge badge-blue">{p}</span>
        ))}
      </div>
      {card.stats && (
        <div style={{ display: "flex", gap: "16px", marginTop: "12px", fontSize: "12px", color: "var(--fg-muted)" }}>
          <span><b style={{ color: "var(--fg)" }}>{card.stats.posts}</b> posts</span>
          <span><b style={{ color: "var(--green)" }}>{card.stats.approved}</b> approved</span>
        </div>
      )}
    </div>
  );
}

function PostPreviewCard({ card }: { card: Extract<Card, { type: "post_preview" }> }) {
  const colors: Record<string, string> = { instagram: "#e1306c", facebook: "#1877f2", reddit: "#ff4500", linkedin: "#0a66c2" };
  const color = colors[card.platform] ?? "var(--accent)";
  return (
    <div style={{ background: "var(--bg)", border: `1px solid ${color}40`, borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ padding: "9px 16px", borderBottom: `1px solid ${color}20`, display: "flex", alignItems: "center", gap: "8px", background: `${color}0d` }}>
        <FileText size={14} color={color} />
        <span style={{ fontSize: "12px", fontWeight: "700", color }}>{card.platform.charAt(0).toUpperCase() + card.platform.slice(1)} Post</span>
      </div>
      <div style={{ padding: "14px 16px", fontSize: "14px", color: "var(--fg)", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
        {card.content}
      </div>
    </div>
  );
}

function TextCard({ content }: { content: string }) {
  return (
    <div style={{ fontSize: "15px", color: "var(--fg)", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
      {content}
    </div>
  );
}

function renderCards(cards: Card[]) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {cards.map((card, i) => {
        if (card.type === "analytics") return <AnalyticsCard key={i} card={card as any} />;
        if (card.type === "campaign_summary") return <CampaignCard key={i} card={card as any} />;
        if (card.type === "post_preview") return <PostPreviewCard key={i} card={card as any} />;
        return <TextCard key={i} content={(card as any).content ?? JSON.stringify(card)} />;
      })}
    </div>
  );
}

export function AiChat({ initialMessages, productName, suggestions }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const tips = suggestions && suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS;
  const isEmpty = messages.length === 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-grow the textarea up to a cap.
  function autoGrow() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }
  useEffect(autoGrow, [input]);

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    setLoading(true);

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: msg };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: "",
        cards: data.cards,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      toast.error("Failed to get response");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)" }}>
      {/* Header */}
      <div style={{ padding: "14px 28px", borderBottom: "1px solid var(--border)", background: "var(--bg)", flexShrink: 0 }}>
        <div style={{ maxWidth: COL, margin: "0 auto", display: "flex", alignItems: "center", gap: "11px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #fff))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent)" }}>
            <Sparkles size={17} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: "15px", fontWeight: "700", color: "var(--fg)", lineHeight: 1.2 }}>AI Strategist</h1>
            <p style={{ fontSize: "11px", color: "var(--fg-muted)" }}>Full context on {productName} — campaigns, content & analytics</p>
          </div>
        </div>
      </div>

      {/* Conversation */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: COL, margin: "0 auto", padding: "28px 24px 8px", display: "flex", flexDirection: "column", gap: "26px" }}>
          {isEmpty && (
            <div style={{ padding: "32px 0 8px" }}>
              <div style={{ textAlign: "center", marginBottom: "28px" }}>
                <div style={{ width: "60px", height: "60px", borderRadius: "18px", background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #fff))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 6px 20px color-mix(in srgb, var(--accent) 35%, transparent)" }}>
                  <Sparkles size={26} color="#fff" />
                </div>
                <h2 style={{ fontSize: "22px", fontWeight: "750", letterSpacing: "-0.02em", color: "var(--fg)", marginBottom: "8px" }}>How can I help with {productName}?</h2>
                <p style={{ fontSize: "14px", color: "var(--fg-muted)" }}>Ask about your campaigns, content, or strategy — or start with one of these.</p>
              </div>

              {/* Suggestion cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                {tips.map((s, i) => {
                  const Icon = SUGGESTION_ICONS[i % SUGGESTION_ICONS.length];
                  return (
                    <button key={s} onClick={() => sendMessage(s)}
                      style={{ display: "flex", alignItems: "flex-start", gap: "11px", padding: "14px 15px", borderRadius: "13px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", cursor: "pointer", fontSize: "13.5px", fontWeight: "500", textAlign: "left", lineHeight: 1.4, transition: "all 0.15s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--accent-bg)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.transform = "translateY(0)"; }}>
                      <Icon size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: "1px" }} />
                      <span>{s}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            msg.role === "user" ? (
              <div key={msg.id} style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ maxWidth: "78%", background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--fg)", padding: "11px 15px", borderRadius: "16px 16px 4px 16px", fontSize: "14.5px", lineHeight: "1.55", whiteSpace: "pre-wrap" }}>
                  {msg.text}
                </div>
              </div>
            ) : (
              <div key={msg.id} style={{ display: "flex", gap: "13px", alignItems: "flex-start" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "9px", background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #fff))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                  <Sparkles size={15} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingTop: "2px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--fg-muted)", marginBottom: "7px" }}>AI Strategist</div>
                  {msg.cards ? renderCards(msg.cards) : <TextCard content={msg.text} />}
                </div>
              </div>
            )
          ))}

          {loading && (
            <div style={{ display: "flex", gap: "13px", alignItems: "flex-start" }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "9px", background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #fff))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Sparkles size={15} color="#fff" />
              </div>
              <div style={{ display: "flex", gap: "5px", alignItems: "center", paddingTop: "10px" }}>
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s ease-in-out infinite" }} />
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s ease-in-out infinite", animationDelay: "0.2s" }} />
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s ease-in-out infinite", animationDelay: "0.4s" }} />
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Composer */}
      <div style={{ padding: "10px 24px 18px", background: "var(--bg)", flexShrink: 0 }}>
        <div style={{ maxWidth: COL, margin: "0 auto" }}>
          {/* Quick chips (shown until the conversation gets going) */}
          {messages.length <= 1 && (
            <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", marginBottom: "10px" }}>
              {tips.slice(0, 4).map((s) => (
                <button key={s} onClick={() => sendMessage(s)} disabled={loading}
                  style={{ padding: "6px 12px", borderRadius: "20px", border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--fg-muted)", cursor: "pointer", fontSize: "12px", fontWeight: "500", whiteSpace: "nowrap", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--fg-muted)"; }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            style={{ display: "flex", alignItems: "flex-end", gap: "8px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "24px", padding: "7px 7px 7px 18px", boxShadow: "0 2px 14px rgba(0,0,0,0.06)" }}>
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={`Message the AI Strategist about ${productName}…`}
              disabled={loading}
              style={{ flex: 1, resize: "none", border: "none", outline: "none", background: "transparent", color: "var(--fg)", fontSize: "14.5px", lineHeight: "1.5", fontFamily: "inherit", maxHeight: "200px", padding: "8px 0" }}
            />
            <button type="submit" disabled={loading || !input.trim()}
              style={{ width: "38px", height: "38px", borderRadius: "50%", border: "none", flexShrink: 0, cursor: input.trim() && !loading ? "pointer" : "default", background: input.trim() && !loading ? "var(--accent)" : "var(--border)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}>
              <Send size={16} />
            </button>
          </form>
          <p style={{ textAlign: "center", fontSize: "10.5px", color: "var(--fg-faint)", marginTop: "8px" }}>
            AI can make mistakes. Verify important numbers in your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
