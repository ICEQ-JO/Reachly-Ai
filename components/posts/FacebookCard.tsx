"use client";

import { useState } from "react";
import { Globe, ThumbsUp, MessageCircle, Share2, MoreHorizontal } from "lucide-react";

interface Props {
  draft: {
    id: string;
    body: string;
    status: string;
    mediaUrl?: string | null;
    engagements?: { likes: number; comments: number; shares: number; reach: number } | null;
    scheduledDay?: string | null;
    scheduledTime?: string | null;
  };
  onSave?: (id: string, body: string) => void;
  onApprove?: (id: string) => void;
  onSchedule?: (id: string) => void;
}

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

export function FacebookCard({ draft, onSave, onApprove, onSchedule }: Props) {
  const [body, setBody] = useState(draft.body);
  const [editing, setEditing] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState(false);

  const eng = draft.engagements ?? { likes: 0, comments: 0, shares: 0, reach: 0 };
  const totalReactions = eng.likes + (reaction ? 1 : 0);

  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", width: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "14px 14px 10px" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#1877f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ color: "#fff", fontWeight: "700", fontSize: "14px" }}>R</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#1877f2" }}>Reachly</div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--fg-muted)" }}>
            <span>Just now</span>
            <span>·</span>
            <Globe size={10} />
          </div>
        </div>
        <MoreHorizontal size={16} color="var(--fg-muted)" />
      </div>

      {/* Body */}
      <div style={{ padding: "0 14px 12px" }}>
        {editing ? (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={() => { setEditing(false); onSave?.(draft.id, body); }}
            autoFocus
            style={{ fontSize: "13px", color: "var(--fg)", lineHeight: "1.6", background: "var(--bg-subtle)", border: "1px solid #1877f2", borderRadius: "6px", padding: "8px", width: "100%", resize: "vertical", minHeight: "100px", fontFamily: "inherit", outline: "none" }}
          />
        ) : (
          <p
            style={{ fontSize: "13px", color: "var(--fg)", lineHeight: "1.6", whiteSpace: "pre-wrap", cursor: "text", margin: 0 }}
            onClick={() => setEditing(true)}
            title="Click to edit"
          >
            {body}
          </p>
        )}
      </div>

      {/* Image display */}
      <div style={{ width: "100%", aspectRatio: "1.91 / 1", position: "relative", background: "var(--bg-subtle)", overflow: "hidden", borderTop: "1px solid var(--border)" }}>
        {draft.mediaUrl ? (
          <img
            src={draft.mediaUrl}
            alt="Facebook post content"
            loading="lazy"
            decoding="async"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <span style={{ fontSize: "28px" }}>🖼️</span>
            <span style={{ fontSize: "11px", color: "var(--fg-faint)" }}>Image will be added</span>
          </div>
        )}
      </div>

      {/* Reaction count */}
      {totalReactions > 0 && (
        <div style={{ padding: "8px 14px 0", fontSize: "12px", color: "var(--fg-muted)", display: "flex", justifyContent: "space-between" }}>
          <span>👍 {totalReactions}</span>
          <span>{eng.comments} comments · {eng.shares} shares</span>
        </div>
      )}

      {/* Action bar */}
      <div style={{ padding: "4px 14px 8px", borderTop: "1px solid var(--border)", display: "flex", gap: "4px", position: "relative" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <button
            style={{ display: "flex", alignItems: "center", gap: "5px", background: reaction ? "#e7f0fd" : "none", border: "none", cursor: "pointer", padding: "7px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", color: reaction ? "#1877f2" : "var(--fg-muted)", width: "100%", justifyContent: "center", transition: "all 0.15s" }}
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setShowReactions(false)}
            onClick={() => setReaction(reaction ? null : "👍")}
          >
            {reaction ?? <ThumbsUp size={14} />} Like
          </button>
          {showReactions && (
            <div style={{ position: "absolute", bottom: "100%", left: 0, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "24px", padding: "6px 10px", display: "flex", gap: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 10 }}
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() => setShowReactions(false)}>
              {REACTIONS.map((r) => (
                <button key={r} onClick={() => { setReaction(r); setShowReactions(false); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", transition: "transform 0.1s", padding: "2px" }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.3) translateY(-4px)")}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}>
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
        <button style={{ flex: 1, display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", padding: "7px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", color: "var(--fg-muted)", justifyContent: "center" }}>
          <MessageCircle size={14} /> Comment
        </button>
        <button style={{ flex: 1, display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", padding: "7px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", color: "var(--fg-muted)", justifyContent: "center" }}>
          <Share2 size={14} /> Share
        </button>
      </div>

      {/* Status + Actions */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", background: "var(--bg-subtle)", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <span className={`badge badge-${draft.status === "approved" ? "green" : draft.status === "scheduled" ? "blue" : "gray"}`}>{draft.status}</span>
        {draft.scheduledDay && <span style={{ fontSize: "10px", color: "var(--fg-muted)" }}>{draft.scheduledDay} {draft.scheduledTime}</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
          {draft.status === "draft" && (
            <button className="btn btn-primary" style={{ padding: "4px 10px", fontSize: "11px" }} onClick={() => onApprove?.(draft.id)}>Approve</button>
          )}
          {(draft.status === "draft" || draft.status === "approved") && (
            <button className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: "11px" }} onClick={() => onSchedule?.(draft.id)}>Schedule</button>
          )}
        </div>
      </div>
    </div>
  );
}
