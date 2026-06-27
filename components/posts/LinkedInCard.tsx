"use client";

import { useState } from "react";
import { Globe, ThumbsUp, MessageSquare, Repeat2, Send, MoreHorizontal } from "lucide-react";

interface Props {
  draft: {
    id: string;
    body: string;
    status: string | null;
    engagements?: { likes: number; comments: number; shares: number; reach: number } | null;
    scheduledDay?: string | null;
    scheduledTime?: string | null;
  };
  onSave?: (id: string, body: string) => void;
  onApprove?: (id: string) => void;
  onSchedule?: (id: string) => void;
}

export function LinkedInCard({ draft, onSave, onApprove, onSchedule }: Props) {
  const [body, setBody] = useState(draft.body);
  const [editing, setEditing] = useState(false);
  const [liked, setLiked] = useState(false);

  const eng = draft.engagements ?? { likes: 0, comments: 0, shares: 0, reach: 0 };
  const totalLikes = eng.likes + (liked ? 1 : 0);

  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", width: "100%", maxWidth: "460px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "14px 14px 10px" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "4px", background: "#0a66c2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ color: "#fff", fontWeight: "800", fontSize: "16px" }}>in</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Reachly</span>
            <span style={{ fontSize: "11px", color: "var(--fg-faint)" }}>• 1st</span>
          </div>
          <div style={{ fontSize: "11px", color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            AI-Powered Customer Acquisition & B2B Lead Gen
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--fg-muted)", marginTop: "2px" }}>
            <span>1h •</span>
            <Globe size={10} />
          </div>
        </div>
        <MoreHorizontal size={16} color="var(--fg-muted)" />
      </div>

      {/* Body */}
      <div style={{ padding: "4px 14px 12px" }}>
        {editing ? (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={() => { setEditing(false); onSave?.(draft.id, body); }}
            autoFocus
            style={{ fontSize: "13px", color: "var(--fg)", lineHeight: "1.6", background: "var(--bg-subtle)", border: "1px solid var(--accent)", borderRadius: "6px", padding: "8px", width: "100%", resize: "vertical", minHeight: "120px", fontFamily: "inherit", outline: "none" }}
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

      {/* Stats counter */}
      {totalLikes > 0 && (
        <div style={{ padding: "8px 14px 8px", borderTop: "1px solid var(--border-subtle)", fontSize: "11px", color: "var(--fg-muted)", display: "flex", justifyContent: "space-between" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#0a66c2", borderRadius: "50%", width: "14px", height: "14px", color: "#fff", fontSize: "9px" }}>👍</span>
            <span>{totalLikes}</span>
          </span>
          <span>{eng.comments} comments · {eng.shares} reposts</span>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ padding: "4px 8px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
        <button
          onClick={() => setLiked(!liked)}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", padding: "8px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: "600", color: liked ? "#0a66c2" : "var(--fg-muted)", flex: 1, justifyContent: "center", transition: "all 0.1s" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <ThumbsUp size={14} fill={liked ? "#0a66c2" : "none"} color={liked ? "#0a66c2" : "currentColor"} />
          Like
        </button>
        <button
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", padding: "8px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: "600", color: "var(--fg-muted)", flex: 1, justifyContent: "center" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <MessageSquare size={14} />
          Comment
        </button>
        <button
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", padding: "8px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: "600", color: "var(--fg-muted)", flex: 1, justifyContent: "center" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <Repeat2 size={14} />
          Repost
        </button>
        <button
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", padding: "8px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: "600", color: "var(--fg-muted)", flex: 1, justifyContent: "center" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <Send size={14} />
          Send
        </button>
      </div>

      {/* Status + Actions footer */}
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
