"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { InstagramCard } from "@/components/posts/InstagramCard";
import { FacebookCard } from "@/components/posts/FacebookCard";
import { RedditCard } from "@/components/posts/RedditCard";
import { Globe, MessageCircle, Filter, Heart, Eye, Share2, MessageSquare, Flame, CheckCheck, CalendarClock } from "lucide-react";
import { Instagram } from "@/components/icons/Instagram";
import { toast } from "sonner";
import { slotToDate } from "@/lib/b2c/planner";

type Draft = {
  id: string;
  channel: string;
  platform: string | null;
  body: string;
  subject: string | null;
  status: string;
  mediaUrl?: string | null;
  campaignId: string | null;
  engagements: { likes: number; comments: number; shares: number; reach: number } | null;
  scheduledDay: string | null;
  scheduledTime: string | null;
  scheduledAt?: string | Date | null;
  rationale?: string | null;
  createdAt: Date;
};

// Client-side mock engagement for the "Publish now" action (mirrors the server tick).
function mockEngagement(platform: string) {
  const R: Record<string, [number, number][]> = {
    instagram: [[180, 2600], [12, 150], [8, 90], [3000, 42000]],
    facebook:  [[60, 720], [8, 110], [10, 130], [1800, 22000]],
    reddit:    [[40, 480], [15, 240], [0, 0], [0, 0]],
  };
  const [l, c, s, r] = R[platform] ?? R.instagram;
  const pick = ([min, max]: [number, number]) => Math.floor(min + Math.random() * (max - min));
  return { likes: pick(l), comments: pick(c), shares: pick(s), reach: pick(r) };
}

type Campaign = { id: string; name: string };

interface Props {
  drafts: Draft[];
  campaigns: Campaign[];
  selectedCampaign?: string;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram size={13} color="#e1306c" />,
  facebook:  <Globe size={13} color="#1877f2" />,
  reddit:    <MessageCircle size={13} color="#ff4500" />,
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#e1306c",
  facebook:  "#1877f2",
  reddit:    "#ff4500",
};

const STATUS_OPTIONS = ["all", "draft", "approved", "scheduled", "posted"];
const PLATFORM_OPTIONS = ["all", "instagram", "facebook", "reddit"];

// Slots used to spread posts when scheduling them all at once (match the calendar grid).
const SCHED_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SCHED_TIMES = ["8am", "10am", "12pm", "2pm", "4pm", "6pm", "8pm"];

export function PostVault({ drafts: initialDrafts, campaigns, selectedCampaign }: Props) {
  const router = useRouter();
  const [drafts, setDrafts] = useState(initialDrafts);
  const [platformFilter, setPlatformFilter] = useState(selectedCampaign ? "all" : "all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState(selectedCampaign ?? "all");
  const [isPending, startTransition] = useTransition();

  const filtered = drafts.filter((d) => {
    const platform = d.platform ?? d.channel;
    if (platformFilter !== "all" && platform !== platformFilter) return false;
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (campaignFilter !== "all" && d.campaignId !== campaignFilter) return false;
    return ["instagram", "facebook", "reddit"].includes(platform);
  });

  async function handleSave(id: string, body: string, subject?: string) {
    await fetch(`/api/drafts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, subject }),
    });
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, body, subject: subject ?? d.subject } : d));
  }

  // Approve = confirm the proposed schedule → enters the auto-publish queue.
  function scheduleAtFor(d: Draft): string | undefined {
    if (d.scheduledAt) return undefined; // already set at generation
    if (d.scheduledDay && d.scheduledTime) return slotToDate(d.scheduledDay, d.scheduledTime).toISOString();
    return undefined;
  }

  async function handleApprove(id: string) {
    const d = drafts.find((x) => x.id === id);
    const payload: Record<string, unknown> = { status: "scheduled" };
    if (d) { const at = scheduleAtFor(d); if (at) payload.scheduledAt = at; }
    const res = await fetch(`/api/drafts/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (res.ok) {
      setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: "scheduled" } : d));
      toast.success("Approved & scheduled — it'll auto-publish when due.");
    }
  }

  async function handlePublish(id: string) {
    const d = drafts.find((x) => x.id === id);
    const eng = mockEngagement((d?.platform ?? d?.channel) ?? "instagram");
    const res = await fetch(`/api/drafts/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "posted", postedAt: new Date().toISOString(), engagements: eng }),
    });
    if (res.ok) {
      setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: "posted", engagements: eng } : d));
      toast.success("Published! 🎉");
    }
  }

  function handleSchedule(id: string) {
    router.push(`/dashboard/b2c/schedule?scheduleDraftId=${id}`);
  }

  const [bulkBusy, setBulkBusy] = useState(false);

  async function handleApproveAll() {
    const targets = filtered.filter((d) => d.status === "draft");
    if (targets.length === 0) { toast.error("No draft posts to approve."); return; }
    setBulkBusy(true);
    const done = new Set<string>();
    for (const d of targets) {
      const payload: Record<string, unknown> = { status: "scheduled" };
      const at = scheduleAtFor(d); if (at) payload.scheduledAt = at;
      const res = await fetch(`/api/drafts/${d.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) done.add(d.id);
    }
    setDrafts((prev) => prev.map((d) => done.has(d.id) ? { ...d, status: "scheduled" } : d));
    setBulkBusy(false);
    toast.success(`Approved & scheduled ${done.size} post${done.size !== 1 ? "s" : ""}!`);
  }

  async function handleScheduleAll() {
    const targets = filtered.filter((d) => ["draft", "approved"].includes(d.status) && !d.scheduledDay);
    if (targets.length === 0) { toast.error("No posts left to schedule."); return; }
    setBulkBusy(true);
    const updates: Record<string, { day: string; time: string }> = {};
    for (let i = 0; i < targets.length; i++) {
      const d = targets[i];
      const day = SCHED_DAYS[i % SCHED_DAYS.length];
      const time = SCHED_TIMES[Math.floor(i / SCHED_DAYS.length) % SCHED_TIMES.length];
      const res = await fetch(`/api/drafts/${d.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "scheduled", scheduledDay: day, scheduledTime: time, scheduledAt: slotToDate(day, time).toISOString() }),
      });
      if (res.ok) updates[d.id] = { day, time };
    }
    setDrafts((prev) => prev.map((d) => updates[d.id]
      ? { ...d, status: "scheduled", scheduledDay: updates[d.id].day, scheduledTime: updates[d.id].time }
      : d));
    setBulkBusy(false);
    const n = Object.keys(updates).length;
    toast.success(`Scheduled ${n} post${n !== 1 ? "s" : ""} — view them in the calendar.`);
  }

  const approvableCount = filtered.filter((d) => d.status === "draft").length;
  const schedulableCount = filtered.filter((d) => ["draft", "approved"].includes(d.status) && !d.scheduledDay).length;

  // Engagement totals
  const totalReach = filtered.reduce((s, d) => s + (d.engagements?.reach ?? 0), 0);
  const totalLikes = filtered.reduce((s, d) => s + (d.engagements?.likes ?? 0), 0);
  const totalComments = filtered.reduce((s, d) => s + (d.engagements?.comments ?? 0), 0);

  function renderCard(draft: Draft) {
    const platform = (draft.platform ?? draft.channel) as "instagram" | "facebook" | "reddit";
    const props = { draft, onSave: handleSave, onApprove: handleApprove, onSchedule: handleSchedule, onPublish: handlePublish };
    if (platform === "instagram") return <InstagramCard {...props} />;
    if (platform === "facebook") return <FacebookCard {...props} />;
    if (platform === "reddit") return <RedditCard {...props} onSave={(id, body, subj) => handleSave(id, body, subj)} />;
    return null;
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--fg)", marginBottom: "4px" }}>Post Vault</h1>
          <p style={{ fontSize: "13px", color: "var(--fg-muted)" }}>All your generated posts — edit, approve, and schedule from here.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handleApproveAll} disabled={bulkBusy || approvableCount === 0}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", fontSize: "13px", fontWeight: "600", opacity: bulkBusy || approvableCount === 0 ? 0.5 : 1, cursor: bulkBusy || approvableCount === 0 ? "default" : "pointer" }}>
            <CheckCheck size={15} /> Approve all{approvableCount > 0 ? ` (${approvableCount})` : ""}
          </button>
          <button onClick={handleScheduleAll} disabled={bulkBusy || schedulableCount === 0}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", fontSize: "13px", fontWeight: "600", opacity: bulkBusy || schedulableCount === 0 ? 0.5 : 1, cursor: bulkBusy || schedulableCount === 0 ? "default" : "pointer" }}>
            <CalendarClock size={15} /> Schedule all{schedulableCount > 0 ? ` (${schedulableCount})` : ""}
          </button>
        </div>
      </div>

      {/* Engagement KPIs */}
      {(totalReach > 0 || filtered.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "20px" }}>
          {[
            { label: "Total Posts", value: filtered.length, icon: <Filter size={14} />, color: "#6366f1" },
            { label: "Est. Reach", value: totalReach.toLocaleString(), icon: <Eye size={14} />, color: "#2563eb" },
            { label: "Total Likes", value: totalLikes.toLocaleString(), icon: <Heart size={14} />, color: "#e1306c" },
            { label: "Comments", value: totalComments.toLocaleString(), icon: <MessageSquare size={14} />, color: "#ff4500" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="stat-card" style={{ padding: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", color }}>{icon}</div>
              </div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--fg)" }}>{value}</div>
              <div style={{ fontSize: "11px", color: "var(--fg-muted)", marginTop: "2px" }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "22px", alignItems: "center" }}>
        {/* Platform */}
        <div style={{ display: "flex", gap: "4px" }}>
          {PLATFORM_OPTIONS.map((p) => (
            <button key={p} onClick={() => setPlatformFilter(p)}
              style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "20px", border: `1.5px solid ${platformFilter === p ? PLATFORM_COLORS[p] ?? "var(--accent)" : "var(--border)"}`, background: platformFilter === p ? `${PLATFORM_COLORS[p] ?? "var(--accent)"}12` : "var(--bg)", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: platformFilter === p ? PLATFORM_COLORS[p] ?? "var(--accent)" : "var(--fg-muted)", transition: "all 0.15s" }}>
              {PLATFORM_ICONS[p]} {p === "all" ? "All Platforms" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Status */}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: "8px", border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: "12px", fontWeight: "500", cursor: "pointer", outline: "none" }}>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>

        {/* Campaign */}
        {campaigns.length > 0 && (
          <select value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: "8px", border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: "12px", fontWeight: "500", cursor: "pointer", outline: "none" }}>
            <option value="all">All Campaigns</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        <span style={{ fontSize: "12px", color: "var(--fg-muted)", marginLeft: "auto" }}>{filtered.length} post{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Posts grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--fg-muted)" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>📭</div>
          <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "6px" }}>No posts yet</div>
          <div style={{ fontSize: "13px" }}>Create a campaign to start generating posts.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 400px))", justifyContent: "center", gap: "24px" }}>
          {filtered.map((draft) => {
            const platform = draft.platform ?? draft.channel;
            const color = PLATFORM_COLORS[platform];
            const eng = draft.engagements ?? { likes: 0, comments: 0, shares: 0, reach: 0 };
            const isTrending = eng.reach > 1000;
            return (
              <div key={draft.id}>
                {isTrending && (
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "6px" }}>
                    <Flame size={12} color="#f59e0b" />
                    <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: "700" }}>Trending</span>
                  </div>
                )}
                {renderCard(draft)}
                {/* Engagement mini-strip */}
                <div style={{ display: "flex", gap: "12px", padding: "8px 4px", fontSize: "11px", color: "var(--fg-muted)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><Heart size={11} /> {eng.likes.toLocaleString()}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><MessageSquare size={11} /> {eng.comments.toLocaleString()}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><Share2 size={11} /> {eng.shares.toLocaleString()}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><Eye size={11} /> {eng.reach.toLocaleString()} reach</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
