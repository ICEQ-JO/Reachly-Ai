"use client";

import { useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Smile, Lightbulb } from "lucide-react";

interface Props {
  draft: {
    id: string;
    body: string;
    subject?: string | null;
    status: string;
    mediaUrl?: string | null;
    rationale?: string | null;
    engagements?: { likes: number; comments: number; shares: number; reach: number } | null;
    scheduledDay?: string | null;
    scheduledTime?: string | null;
  };
  onSave?: (id: string, body: string) => void;
  onApprove?: (id: string) => void;
  onSchedule?: (id: string) => void;
  onPublish?: (id: string) => void;
}

export function InstagramCard({ draft, onSave, onApprove, onSchedule, onPublish }: Props) {
  const [body, setBody] = useState(draft.body);
  const [editing, setEditing] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const eng = draft.engagements ?? { likes: 0, comments: 0, shares: 0, reach: 0 };
  const likes = eng.likes + (liked ? 1 : 0);

  // Split caption from hashtags
  const parts = body.split(/\n(?=#)/);
  const caption = parts[0] ?? body;
  const hashtags = parts.slice(1).join("\n");

  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", width: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #f09433,#e6683c,#dc2743,#cc2366,#bc1888)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--fg)" }}>reachly_brand</div>
          <div style={{ fontSize: "10px", color: "var(--fg-muted)" }}>Sponsored</div>
        </div>
        <MoreHorizontal size={16} color="var(--fg-muted)" />
      </div>

      {/* Image display */}
      <div style={{ width: "100%", paddingBottom: "100%", position: "relative", background: "var(--bg-subtle)", overflow: "hidden" }}>
        {draft.mediaUrl ? (
          <img
            src={draft.mediaUrl}
            alt="Instagram post content"
            loading="lazy"
            decoding="async"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <div style={{ fontSize: "32px" }}>🖼️</div>
            <div style={{ fontSize: "11px", color: "var(--fg-faint)", fontWeight: "500" }}>Image will be added</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: "10px 12px 4px", display: "flex", alignItems: "center", gap: "14px" }}>
        <button onClick={() => setLiked(!liked)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 0, transition: "transform 0.15s" }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}>
          <Heart size={22} fill={liked ? "#e1306c" : "none"} color={liked ? "#e1306c" : "var(--fg)"} />
        </button>
        <MessageCircle size={22} color="var(--fg)" />
        <Send size={22} color="var(--fg)" />
        <div style={{ marginLeft: "auto" }}>
          <button onClick={() => setSaved(!saved)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <Bookmark size={22} fill={saved ? "var(--fg)" : "none"} color="var(--fg)" />
          </button>
        </div>
      </div>

      {/* Likes */}
      <div style={{ padding: "0 12px 6px", fontSize: "12px", fontWeight: "700", color: "var(--fg)" }}>
        {likes.toLocaleString()} likes
      </div>

      {/* Caption */}
      <div style={{ padding: "0 12px 8px" }}>
        <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--fg)" }}>reachly_brand </span>
        {editing ? (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={() => { setEditing(false); onSave?.(draft.id, body); }}
            autoFocus
            style={{ fontSize: "12px", color: "var(--fg)", lineHeight: "1.5", background: "var(--bg-subtle)", border: "1px solid var(--accent)", borderRadius: "6px", padding: "6px", width: "100%", resize: "vertical", minHeight: "80px", fontFamily: "inherit", outline: "none" }}
          />
        ) : (
          <span
            style={{ fontSize: "12px", color: "var(--fg)", lineHeight: "1.5", cursor: "text", whiteSpace: "pre-wrap" }}
            onClick={() => setEditing(true)}
            title="Click to edit"
          >
            {caption}
          </span>
        )}
        {!editing && hashtags && (
          <div style={{ fontSize: "12px", color: "#385898", marginTop: "4px", lineHeight: "1.5" }}>{hashtags}</div>
        )}
      </div>

      {/* Engagement mock */}
      {eng.comments > 0 && (
        <div style={{ padding: "0 12px 4px", fontSize: "11px", color: "var(--fg-muted)" }}>View all {eng.comments} comments</div>
      )}

      {/* Comment input */}
      <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border)", display: "flex", gap: "8px", alignItems: "center" }}>
        <Smile size={16} color="var(--fg-muted)" />
        <span style={{ fontSize: "12px", color: "var(--fg-faint)", flex: 1 }}>Add a comment…</span>
      </div>

      {/* Why this post */}
      {draft.rationale && (
        <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border)", display: "flex", gap: "6px", alignItems: "flex-start" }}>
          <Lightbulb size={12} color="var(--accent)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <span style={{ fontSize: "11px", color: "var(--fg-muted)", lineHeight: 1.4 }}><b style={{ color: "var(--fg)" }}>Why:</b> {draft.rationale}</span>
        </div>
      )}

      {/* Status + Actions */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", background: "var(--bg-subtle)", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <span className={`badge badge-${draft.status === "posted" ? "green" : draft.status === "scheduled" ? "blue" : draft.status === "approved" ? "green" : "gray"}`}>{draft.status === "posted" ? "● Live" : draft.status}</span>
        {draft.scheduledDay && draft.status !== "posted" && <span style={{ fontSize: "10px", color: "var(--fg-muted)" }}>{draft.scheduledDay} {draft.scheduledTime}</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
          {draft.status === "draft" && (
            <button className="btn btn-primary" style={{ padding: "4px 10px", fontSize: "11px" }} onClick={() => onApprove?.(draft.id)}>Approve</button>
          )}
          {draft.status === "scheduled" && (
            <button className="btn btn-primary" style={{ padding: "4px 10px", fontSize: "11px" }} onClick={() => onPublish?.(draft.id)}>Publish now</button>
          )}
          {(draft.status === "draft" || draft.status === "approved") && (
            <button className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: "11px" }} onClick={() => onSchedule?.(draft.id)}>Schedule</button>
          )}
        </div>
      </div>
    </div>
  );
}
