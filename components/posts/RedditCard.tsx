"use client";

import { useState } from "react";
import { ArrowUp, MessageSquare, Share2, Award, MoreHorizontal, ArrowDown } from "lucide-react";

interface Props {
  draft: {
    id: string;
    body: string;
    subject?: string | null;
    status: string;
    mediaUrl?: string | null;
    engagements?: { likes: number; comments: number; shares: number; reach: number } | null;
    scheduledDay?: string | null;
    scheduledTime?: string | null;
  };
  onSave?: (id: string, body: string, subject?: string) => void;
  onApprove?: (id: string) => void;
  onSchedule?: (id: string) => void;
}

export function RedditCard({ draft, onSave, onApprove, onSchedule }: Props) {
  const [title, setTitle] = useState(draft.subject ?? "");
  const [body, setBody] = useState(draft.body);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingBody, setEditingBody] = useState(false);
  const [votes, setVotes] = useState(1);
  const [voted, setVoted] = useState<"up" | "down" | null>(null);

  const eng = draft.engagements ?? { likes: 0, comments: 0, shares: 0, reach: 0 };

  function handleVote(dir: "up" | "down") {
    if (voted === dir) { setVoted(null); setVotes(1); }
    else { setVoted(dir); setVotes(dir === "up" ? votes + 1 : votes - 1); }
  }

  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden", width: "100%" }}>
      {/* Subreddit bar */}
      <div style={{ background: "#ff450010", padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#ff4500", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "11px", color: "#fff", fontWeight: "700" }}>r</span>
        </div>
        <span style={{ fontSize: "12px", fontWeight: "700", color: "#ff4500" }}>r/entrepreneur</span>
        <span style={{ fontSize: "11px", color: "var(--fg-muted)" }}>· Posted by u/reachly_founder · just now</span>
        <MoreHorizontal size={14} color="var(--fg-muted)" style={{ marginLeft: "auto" }} />
      </div>

      <div style={{ display: "flex", gap: "0" }}>
        {/* Vote column */}
        <div style={{ width: "40px", background: "var(--bg-subtle)", display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0", gap: "2px", flexShrink: 0 }}>
          <button onClick={() => handleVote("up")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: "4px", display: "flex" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--border)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
            <ArrowUp size={16} fill={voted === "up" ? "#ff4500" : "none"} color={voted === "up" ? "#ff4500" : "var(--fg-muted)"} />
          </button>
          <span style={{ fontSize: "12px", fontWeight: "700", color: voted === "up" ? "#ff4500" : voted === "down" ? "#7193ff" : "var(--fg-muted)" }}>{votes}</span>
          <button onClick={() => handleVote("down")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: "4px", display: "flex" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--border)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
            <ArrowDown size={16} fill={voted === "down" ? "#7193ff" : "none"} color={voted === "down" ? "#7193ff" : "var(--fg-muted)"} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "12px 14px" }}>
          {/* Title */}
          {editingTitle ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => { setEditingTitle(false); onSave?.(draft.id, body, title); }}
              autoFocus
              style={{ fontSize: "15px", fontWeight: "600", color: "var(--fg)", background: "var(--bg-subtle)", border: "1px solid #ff4500", borderRadius: "5px", padding: "4px 8px", width: "100%", fontFamily: "inherit", outline: "none" }}
            />
          ) : (
            <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--fg)", lineHeight: "1.4", marginBottom: "8px", cursor: "text" }}
              onClick={() => setEditingTitle(true)} title="Click to edit title">
              {title || "Post title…"}
            </div>
          )}

          {/* Body */}
          {editingBody ? (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onBlur={() => { setEditingBody(false); onSave?.(draft.id, body, title); }}
              autoFocus
              style={{ fontSize: "13px", color: "var(--fg)", lineHeight: "1.6", background: "var(--bg-subtle)", border: "1px solid #ff4500", borderRadius: "5px", padding: "6px 8px", width: "100%", resize: "vertical", minHeight: "100px", fontFamily: "inherit", outline: "none" }}
            />
          ) : (
            <p style={{ fontSize: "13px", color: "var(--fg)", lineHeight: "1.6", whiteSpace: "pre-wrap", cursor: "text", margin: 0 }}
              onClick={() => setEditingBody(true)} title="Click to edit body">
              {body}
            </p>
          )}

          {/* Image display */}
          {draft.mediaUrl && (
            <div style={{ marginTop: "12px", width: "100%", maxHeight: "300px", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
              <img
                src={draft.mediaUrl}
                alt="Reddit post content"
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "auto", maxHeight: "300px", objectFit: "contain", display: "block" }}
              />
            </div>
          )}

          {/* Post actions */}
          <div style={{ display: "flex", gap: "4px", marginTop: "12px" }}>
            {[
              { icon: <MessageSquare size={13} />, label: `${eng.comments} Comments` },
              { icon: <Share2 size={13} />, label: "Share" },
              { icon: <Award size={13} />, label: "Award" },
            ].map(({ icon, label }) => (
              <button key={label} style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", padding: "5px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", transition: "background 0.1s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
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
