"use client";

import { useState } from "react";
import { Globe, MessageCircle, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Instagram } from "@/components/icons/Instagram";
import { toast } from "sonner";

type Draft = {
  id: string;
  body: string;
  platform: string | null;
  channel: string;
  status: string | null;
  mediaUrl?: string | null;
  scheduledDay: string | null;
  scheduledTime: string | null;
};

interface Props {
  drafts: Draft[];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIMES = ["8am", "10am", "12pm", "2pm", "4pm", "6pm", "8pm"];

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#e1306c",
  facebook:  "#1877f2",
  reddit:    "#ff4500",
  linkedin:  "#0a66c2",
};

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram size={10} />,
  facebook:  <Globe size={10} />,
  reddit:    <MessageCircle size={10} />,
};

export function ScheduleCalendar({ drafts: initialDrafts }: Props) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [schedulingDraft, setSchedulingDraft] = useState<Draft | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const draftId = params.get("scheduleDraftId");
      if (draftId) {
        return initialDrafts.find(d => d.id === draftId) ?? null;
      }
    }
    return null;
  });
  const [weekOffset, setWeekOffset] = useState(0);

  // Auto-schedule states
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [selectedDays, setSelectedDays] = useState<string[]>(["Mon", "Wed", "Fri"]);
  const [postingTime, setPostingTime] = useState("12pm");

  // Build a lookup: day+time → drafts array
  const scheduled: Record<string, Draft[]> = {};
  for (const d of drafts) {
    if (d.scheduledDay && d.scheduledTime) {
      const key = `${d.scheduledDay}|${d.scheduledTime}`;
      if (!scheduled[key]) scheduled[key] = [];
      scheduled[key].push(d);
    }
  }

  const unscheduled = drafts.filter((d) => !d.scheduledDay && d.status && ["draft", "approved"].includes(d.status));

  async function handleAutoSchedule() {
    if (unscheduled.length === 0) {
      toast.error("No unscheduled posts in queue.");
      return;
    }
    const daysToUse = selectedDays.length > 0 ? selectedDays : ["Mon", "Wed", "Fri"];
    const timeToUse = postingTime;

    let scheduledCount = 0;
    const updatedDrafts = [...drafts];
    const limit = Math.min(unscheduled.length, postsPerWeek);

    for (let i = 0; i < limit; i++) {
      const draft = unscheduled[i];
      const day = daysToUse[i % daysToUse.length];

      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "scheduled", scheduledDay: day, scheduledTime: timeToUse }),
      });

      if (res.ok) {
        const idx = updatedDrafts.findIndex(d => d.id === draft.id);
        if (idx !== -1) {
          updatedDrafts[idx] = {
            ...updatedDrafts[idx],
            status: "scheduled",
            scheduledDay: day,
            scheduledTime: timeToUse,
          };
        }
        scheduledCount++;
      }
    }

    setDrafts(updatedDrafts);
    toast.success(`Successfully auto-scheduled ${scheduledCount} posts!`);
  }

  async function scheduleToSlot(draftId: string, day: string, time: string) {
    const res = await fetch(`/api/drafts/${draftId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "scheduled", scheduledDay: day, scheduledTime: time }),
    });
    if (res.ok) {
      setDrafts(prev => prev.map(d => d.id === draftId ? { ...d, status: "scheduled", scheduledDay: day, scheduledTime: time } : d));
      setSchedulingDraft(null);
      toast.success(`Scheduled for ${day} at ${time}`);
    }
  }

  async function unschedule(draftId: string) {
    const res = await fetch(`/api/drafts/${draftId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved", scheduledDay: null, scheduledTime: null }),
    });
    if (res.ok) {
      setDrafts(prev => prev.map(d => d.id === draftId ? { ...d, status: "approved", scheduledDay: null, scheduledTime: null } : d));
      toast.success("Unscheduled");
    }
  }

  const platform = (d: Draft) => d.platform ?? d.channel;

  return (
    <div style={{ padding: "28px 32px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--fg)", marginBottom: "4px" }}>Content Schedule</h1>
          <p style={{ fontSize: "13px", color: "var(--fg-muted)" }}>Drag posts to schedule them. {unscheduled.length} post{unscheduled.length !== 1 ? "s" : ""} waiting to be scheduled.</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={() => setWeekOffset(w => w - 1)} style={{ width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "7px", border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer" }}>
            <ChevronLeft size={15} color="var(--fg-muted)" />
          </button>
          <span style={{ fontSize: "13px", color: "var(--fg)", fontWeight: "600" }}>{weekOffset === 0 ? "This Week" : weekOffset > 0 ? `+${weekOffset}w` : `${weekOffset}w`}</span>
          <button onClick={() => setWeekOffset(w => w + 1)} style={{ width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "7px", border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer" }}>
            <ChevronRight size={15} color="var(--fg-muted)" />
          </button>
        </div>
      </div>

      {/* Schedule picker overlay */}
      {schedulingDraft && (() => {
        const p = platform(schedulingDraft);
        const color = PLATFORM_COLORS[p] ?? "var(--accent)";
        return (
          <div onClick={() => setSchedulingDraft(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)", padding: "20px" }}>
            <div onClick={(e) => e.stopPropagation()}
              style={{ background: "var(--bg)", borderRadius: "18px", width: "460px", maxWidth: "100%", border: "1px solid var(--border)", boxShadow: "0 24px 70px rgba(0,0,0,0.45)", overflow: "hidden" }}>
              {/* Header */}
              <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "11px", background: `${color}18`, color, display: "flex", alignItems: "center", justifyContent: "center" }}>{PLATFORM_ICONS[p] ?? <Plus size={15} />}</div>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--fg)" }}>Schedule post</h3>
                    <p style={{ fontSize: "11px", color: "var(--fg-muted)", textTransform: "capitalize" }}>{p} · pick a day &amp; time</p>
                  </div>
                </div>
                <button onClick={() => setSchedulingDraft(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-muted)", display: "flex" }}>
                  <X size={18} />
                </button>
              </div>

              {/* Post preview */}
              <div style={{ padding: "14px 22px", display: "flex", gap: "12px", alignItems: "center", borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
                {schedulingDraft.mediaUrl && (
                  <img src={schedulingDraft.mediaUrl} alt="" loading="lazy" decoding="async"
                    style={{ width: "46px", height: "46px", borderRadius: "9px", objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }} />
                )}
                <div style={{ fontSize: "12.5px", color: "var(--fg)", lineHeight: "1.5", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {schedulingDraft.body}
                </div>
              </div>

              {/* Slot grid */}
              <div style={{ padding: "16px 22px 22px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "42px repeat(7, 1fr)", gap: "5px", marginBottom: "7px" }}>
                  <div />
                  {DAYS.map(d => (
                    <div key={d} style={{ fontSize: "10.5px", textAlign: "center", color: d === "Sat" || d === "Sun" ? "var(--fg-faint)" : "var(--fg-muted)", fontWeight: "700" }}>{d}</div>
                  ))}
                </div>
                {TIMES.map(time => (
                  <div key={time} style={{ display: "grid", gridTemplateColumns: "42px repeat(7, 1fr)", gap: "5px", marginBottom: "5px" }}>
                    <div style={{ fontSize: "10px", color: "var(--fg-faint)", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "2px" }}>{time}</div>
                    {DAYS.map(day => {
                      const key = `${day}|${time}`;
                      const taken = (scheduled[key]?.length ?? 0) > 0;
                      return (
                        <button key={day} disabled={taken} onClick={() => scheduleToSlot(schedulingDraft.id, day, time)} title={`${day} ${time}`}
                          style={{ height: "30px", borderRadius: "8px", border: `1px solid ${taken ? "var(--border)" : `${color}40`}`, background: taken ? "var(--bg-subtle)" : `${color}12`, cursor: taken ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}
                          onMouseEnter={(e) => { if (!taken) e.currentTarget.style.background = color; }}
                          onMouseLeave={(e) => { if (!taken) e.currentTarget.style.background = `${color}12`; }}>
                          {taken && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--fg-faint)" }} />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ display: "flex", gap: "24px" }}>
        {/* Left Sidebar: Queue + Auto-Scheduler */}
        <div style={{ width: "240px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Unscheduled queue */}
          {unscheduled.length > 0 ? (
            <div>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Queue ({unscheduled.length})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {unscheduled.slice(0, 8).map((d) => {
                  const p = platform(d);
                  const color = PLATFORM_COLORS[p] ?? "var(--accent)";
                  return (
                    <div key={d.id}
                      style={{ padding: "8px 10px", background: "var(--bg)", border: `1.5px solid ${color}30`, borderRadius: "8px", cursor: "pointer", transition: "all 0.15s" }}
                      onClick={() => setSchedulingDraft(d)}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = color)}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${color}30`)}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
                        <span style={{ color }}>{PLATFORM_ICONS[p]}</span>
                        <span style={{ fontSize: "10px", fontWeight: "600", color, textTransform: "capitalize" }}>{p}</span>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--fg)", lineHeight: "1.4", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {d.body}
                      </div>
                      <div style={{ marginTop: "5px", fontSize: "10px", color: "var(--accent)", display: "flex", alignItems: "center", gap: "3px" }}>
                        <Plus size={9} /> Schedule
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ padding: "16px", borderRadius: "10px", background: "var(--bg-subtle)", border: "1px solid var(--border)", textAlign: "center" }}>
              <div style={{ fontSize: "20px", marginBottom: "4px" }}>🎉</div>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--fg)" }}>All Caught Up</div>
              <div style={{ fontSize: "10px", color: "var(--fg-muted)", marginTop: "2px" }}>No posts waiting to be scheduled.</div>
            </div>
          )}

          {/* Auto-Scheduler Strategy */}
          <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--bg)", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "14px" }}>⚡</span>
              <h3 style={{ fontSize: "12px", fontWeight: "700", color: "var(--fg)", margin: 0 }}>Auto-Scheduler</h3>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "10px", fontWeight: "600", color: "var(--fg-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Posts / Week</label>
              <select
                value={postsPerWeek}
                onChange={(e) => setPostsPerWeek(Number(e.target.value))}
                style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: "12px", outline: "none", cursor: "pointer" }}
              >
                {[1, 2, 3, 4, 5, 7].map(n => (
                  <option key={n} value={n}>{n} post{n > 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "10px", fontWeight: "600", color: "var(--fg-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Posting Time</label>
              <select
                value={postingTime}
                onChange={(e) => setPostingTime(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: "12px", outline: "none", cursor: "pointer" }}
              >
                {TIMES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "10px", fontWeight: "600", color: "var(--fg-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Target Days</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => {
                  const active = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])}
                      style={{
                        padding: "3px 6px", borderRadius: "5px", fontSize: "10px", fontWeight: "600", cursor: "pointer",
                        border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                        background: active ? "var(--accent-bg)" : "var(--bg)",
                        color: active ? "var(--accent)" : "var(--fg-muted)",
                        transition: "all 0.1s"
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleAutoSchedule}
              disabled={unscheduled.length === 0}
              style={{
                width: "100%", padding: "8px 12px", borderRadius: "6px", background: "var(--accent)", color: "#fff",
                border: "none", cursor: "pointer", fontSize: "11px", fontWeight: "700", transition: "opacity 0.15s",
                opacity: unscheduled.length === 0 ? 0.5 : 1
              }}
            >
              Apply Auto-Schedule
            </button>
          </div>
        </div>

        {/* Horizontal calendar grid */}
        <div style={{ flex: 1, overflowX: "auto" }}>
          <div style={{ minWidth: "720px", border: "1px solid var(--border)", borderRadius: "14px", padding: "12px", background: "var(--bg)" }}>
            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "54px repeat(7, 1fr)", gap: "6px", marginBottom: "8px" }}>
              <div />
              {DAYS.map((day) => {
                const weekend = day === "Sat" || day === "Sun";
                return (
                  <div key={day} style={{ textAlign: "center", padding: "7px 0", borderRadius: "9px", background: weekend ? "transparent" : "var(--bg-subtle)", fontSize: "12px", fontWeight: "700", color: weekend ? "var(--fg-faint)" : "var(--fg)", letterSpacing: "0.02em" }}>
                    {day}
                  </div>
                );
              })}
            </div>

            {/* Time rows */}
            {TIMES.map((time) => (
              <div key={time} style={{ display: "grid", gridTemplateColumns: "54px repeat(7, 1fr)", gap: "6px", marginBottom: "6px" }}>
                <div style={{ fontSize: "10.5px", color: "var(--fg-faint)", fontWeight: "700", display: "flex", alignItems: "center", paddingRight: "8px", justifyContent: "flex-end" }}>{time}</div>
                {DAYS.map((day) => {
                  const key = `${day}|${time}`;
                  const slots = scheduled[key] ?? [];
                  const weekend = day === "Sat" || day === "Sun";
                  const empty = slots.length === 0;
                  return (
                    <div key={day}
                      style={{ minHeight: "62px", background: weekend ? "var(--bg-subtle)" : "var(--bg)", border: "1px solid var(--border)", borderRadius: "10px", padding: "5px", cursor: empty ? "pointer" : "default", transition: "all 0.12s" }}
                      onClick={() => {
                        if (empty) {
                          if (schedulingDraft) scheduleToSlot(schedulingDraft.id, day, time);
                          else if (unscheduled.length > 0) scheduleToSlot(unscheduled[0].id, day, time);
                        }
                      }}
                      onMouseEnter={(e) => { if (empty) { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--accent)"; el.style.background = "var(--accent-bg)"; } }}
                      onMouseLeave={(e) => { if (empty) { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.background = weekend ? "var(--bg-subtle)" : "var(--bg)"; } }}>
                      {slots.map((s) => {
                        const p = platform(s);
                        const color = PLATFORM_COLORS[p] ?? "var(--accent)";
                        return (
                          <div key={s.id} style={{ background: `${color}12`, borderLeft: `3px solid ${color}`, borderRadius: "6px", padding: "4px 5px 4px 7px", fontSize: "10px", color: "var(--fg)", fontWeight: "500", lineHeight: "1.35", marginBottom: "3px", display: "flex", gap: "5px", alignItems: "flex-start" }}>
                            {s.mediaUrl
                              ? <img src={s.mediaUrl} alt="" loading="lazy" decoding="async" style={{ width: "16px", height: "16px", borderRadius: "4px", objectFit: "cover", flexShrink: 0, marginTop: "1px" }} />
                              : <span style={{ flexShrink: 0, marginTop: "1px", color }}>{PLATFORM_ICONS[p]}</span>}
                            <span style={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", flex: 1 }}>
                              {s.body.slice(0, 42)}
                            </span>
                            <button onClick={(e) => { e.stopPropagation(); unschedule(s.id); }} title="Unschedule"
                              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, color: "var(--fg-faint)", display: "flex" }}>
                              <X size={11} />
                            </button>
                          </div>
                        );
                      })}
                      {empty && (
                        <div style={{ height: "100%", minHeight: "52px", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0 }} className="empty-slot-plus">
                          <Plus size={14} color="var(--accent)" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
