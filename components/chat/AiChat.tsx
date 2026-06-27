"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, BarChart2, Megaphone, FileText, MessageSquare } from "lucide-react";
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
}

const SUGGESTIONS = [
  "How are my campaigns performing?",
  "What content should I post this week?",
  "Analyze my Instagram engagement",
  "Which platform gets the best results?",
  "Give me a posting schedule for next week",
];

function AnalyticsCard({ card }: { card: Extract<Card, { type: "analytics" }> }) {
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "7px" }}>
        <BarChart2 size={14} color="var(--accent)" />
        <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--fg)" }}>{card.title}</span>
      </div>
      <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "10px" }}>
        {(card.metrics ?? []).map((m, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "18px", fontWeight: "700", color: m.trend === "up" ? "var(--green)" : m.trend === "down" ? "var(--red)" : "var(--fg)" }}>
              {m.value} {m.trend === "up" ? "↑" : m.trend === "down" ? "↓" : ""}
            </div>
            <div style={{ fontSize: "10px", color: "var(--fg-muted)", marginTop: "2px" }}>{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CampaignCard({ card }: { card: Extract<Card, { type: "campaign_summary" }> }) {
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
        <Megaphone size={13} color="var(--accent)" />
        <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--fg)" }}>{card.name}</span>
      </div>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {(card.platforms ?? []).map((p: string) => (
          <span key={p} className="badge badge-blue">{p}</span>
        ))}
      </div>
      {card.stats && (
        <div style={{ display: "flex", gap: "16px", marginTop: "10px", fontSize: "12px", color: "var(--fg-muted)" }}>
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
    <div style={{ background: "var(--bg)", border: `1px solid ${color}40`, borderRadius: "10px", overflow: "hidden" }}>
      <div style={{ padding: "8px 14px", borderBottom: `1px solid ${color}20`, display: "flex", alignItems: "center", gap: "7px", background: `${color}08` }}>
        <FileText size={13} color={color} />
        <span style={{ fontSize: "12px", fontWeight: "700", color }}>{card.platform.charAt(0).toUpperCase() + card.platform.slice(1)} Post</span>
      </div>
      <div style={{ padding: "12px 14px", fontSize: "13px", color: "var(--fg)", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
        {card.content}
      </div>
    </div>
  );
}

function TextCard({ content }: { content: string }) {
  return (
    <div style={{ fontSize: "13px", color: "var(--fg)", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
      {content}
    </div>
  );
}

function renderCards(cards: Card[]) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {cards.map((card, i) => {
        if (card.type === "analytics") return <AnalyticsCard key={i} card={card as any} />;
        if (card.type === "campaign_summary") return <CampaignCard key={i} card={card as any} />;
        if (card.type === "post_preview") return <PostPreviewCard key={i} card={card as any} />;
        return <TextCard key={i} content={(card as any).content ?? JSON.stringify(card)} />;
      })}
    </div>
  );
}

export function AiChat({ initialMessages, productName }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const msg = text ?? input.trim();
    if (!msg || loading) return;
    setInput("");
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
    } catch (err) {
      toast.error("Failed to get response");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", maxHeight: "calc(100vh - 0px)" }}>
      {/* Header */}
      <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bot size={18} color="var(--accent)" />
          </div>
          <div>
            <h1 style={{ fontSize: "16px", fontWeight: "700", color: "var(--fg)" }}>AI Strategist</h1>
            <p style={{ fontSize: "11px", color: "var(--fg-muted)" }}>Knows everything about {productName} — campaigns, content & analytics</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <MessageSquare size={24} color="var(--accent)" />
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--fg)", marginBottom: "6px" }}>Start a conversation</h3>
            <p style={{ fontSize: "13px", color: "var(--fg-muted)", marginBottom: "20px" }}>Ask me anything about your campaigns, content, or strategy.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "360px", margin: "0 auto" }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => sendMessage(s)}
                  style={{ padding: "9px 14px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", cursor: "pointer", fontSize: "13px", textAlign: "left", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { (e.currentTarget).style.borderColor = "var(--accent)"; (e.currentTarget).style.background = "var(--accent-bg)"; }}
                  onMouseLeave={(e) => { (e.currentTarget).style.borderColor = "var(--border)"; (e.currentTarget).style.background = "var(--bg)"; }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{ display: "flex", gap: "10px", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "assistant" && (
              <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                <Bot size={14} color="var(--accent)" />
              </div>
            )}
            <div style={{ maxWidth: "75%" }}>
              {msg.role === "user" ? (
                <div style={{ background: "var(--accent)", color: "#fff", padding: "10px 14px", borderRadius: "12px 12px 2px 12px", fontSize: "13px", lineHeight: "1.5" }}>
                  {msg.text}
                </div>
              ) : (
                <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", padding: "14px", borderRadius: "2px 12px 12px 12px" }}>
                  {msg.cards ? renderCards(msg.cards) : <TextCard content={msg.text} />}
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                <User size={14} color="var(--fg-muted)" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Bot size={14} color="var(--accent)" />
            </div>
            <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", padding: "14px", borderRadius: "2px 12px 12px 12px", display: "flex", gap: "4px", alignItems: "center" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s ease-in-out infinite" }} />
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s ease-in-out infinite", animationDelay: "0.2s" }} />
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s ease-in-out infinite", animationDelay: "0.4s" }} />
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "16px 28px", borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} style={{ display: "flex", gap: "10px" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your campaigns, analytics, or get content ideas…"
            className="input-field"
            style={{ flex: 1, fontSize: "13px" }}
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: "10px 16px", flexShrink: 0 }} disabled={loading || !input.trim()}>
            {loading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={15} />}
          </button>
        </form>
      </div>
    </div>
  );
}
