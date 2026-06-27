"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Briefcase, Calendar, CheckSquare, Sparkles, Filter, 
  ChevronRight, X, Clock, BarChart3, Users
} from "lucide-react";
import { LinkedInCard } from "@/components/posts/LinkedInCard";

interface Draft {
  id: string;
  body: string;
  status: string | null;
  campaignId: string | null;
  engagements?: any;
  scheduledDay?: string | null;
  scheduledTime?: string | null;
}

interface Campaign {
  id: string;
  name: string;
}

interface B2bLinkedinClientProps {
  initialDrafts: Draft[];
  campaigns: Campaign[];
}

export default function B2bLinkedinClient({ initialDrafts, campaigns }: B2bLinkedinClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [drafts, setDrafts] = useState<Draft[]>(initialDrafts);
  const [selectedCampaign, setSelectedCampaign] = useState<string>(searchParams.get("campaign") || "all");
  
  // Scheduling modal state
  const [schedulingDraftId, setSchedulingDraftId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [selectedTime, setSelectedTime] = useState("09:00 AM");

  // Computed KPIs
  const kpis = useMemo(() => {
    let totalDrafts = 0;
    let scheduled = 0;
    let posted = 0;
    let engagementCount = 0;

    drafts.forEach(d => {
      if (d.status === "draft") totalDrafts++;
      else if (d.status === "scheduled") scheduled++;
      else if (d.status === "posted") posted++;

      const eng = d.engagements ?? { likes: 0, comments: 0, shares: 0 };
      engagementCount += (eng.likes || 0) + (eng.comments || 0) + (eng.shares || 0);
    });

    return { totalDrafts, scheduled, posted, engagementCount };
  }, [drafts]);

  // Filtered Drafts
  const filteredDrafts = useMemo(() => {
    if (selectedCampaign === "all") return drafts;
    return drafts.filter(d => d.campaignId === selectedCampaign);
  }, [drafts, selectedCampaign]);

  // Update draft body
  const handleSaveBody = async (id: string, newBody: string) => {
    try {
      const res = await fetch(`/api/drafts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newBody }),
      });
      if (!res.ok) throw new Error("Failed to save body");

      setDrafts(prev => prev.map(d => d.id === id ? { ...d, body: newBody } : d));
      toast.success("Post content saved");
    } catch (err) {
      toast.error("Failed to save changes");
    }
  };

  // Approve draft
  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/drafts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error("Failed to approve");

      setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: "approved" } : d));
      toast.success("LinkedIn post approved!");
    } catch (err) {
      toast.error("Failed to approve draft");
    }
  };

  // Open scheduler
  const handleOpenSchedule = (id: string) => {
    setSchedulingDraftId(id);
  };

  // Save schedule
  const handleSaveSchedule = async () => {
    if (!schedulingDraftId) return;

    try {
      const res = await fetch(`/api/drafts/${schedulingDraftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "scheduled",
          scheduledDay: selectedDay,
          scheduledTime: selectedTime,
        }),
      });
      if (!res.ok) throw new Error("Failed to schedule");

      setDrafts(prev => prev.map(d => 
        d.id === schedulingDraftId 
          ? { ...d, status: "scheduled", scheduledDay: selectedDay, scheduledTime: selectedTime } 
          : d
      ));
      
      toast.success(`LinkedIn post scheduled for ${selectedDay} at ${selectedTime}!`);
      setSchedulingDraftId(null);
    } catch (err) {
      toast.error("Failed to save schedule settings");
    }
  };

  return (
    <div style={{ padding: "28px 32px", background: "var(--bg-subtle)", minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--fg)", marginBottom: "4px" }}>LinkedIn Orchestrator</h1>
          <p style={{ fontSize: "12px", color: "var(--fg-muted)" }}>Approve AI-drafted organic LinkedIn updates and configure your publication schedule.</p>
        </div>
      </div>

      {/* KPI Stats Block */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", padding: "18px", borderRadius: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase" }}>Drafts Review</span>
            <Clock size={16} color="var(--fg-faint)" />
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--fg)" }}>{kpis.totalDrafts}</div>
        </div>

        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", padding: "18px", borderRadius: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase" }}>Scheduled</span>
            <Calendar size={16} color="var(--accent)" />
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--accent)" }}>{kpis.scheduled}</div>
        </div>

        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", padding: "18px", borderRadius: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase" }}>Published</span>
            <CheckSquare size={16} color="var(--green)" />
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--green)" }}>{kpis.posted}</div>
        </div>

        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", padding: "18px", borderRadius: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase" }}>Engagements</span>
            <BarChart3 size={16} color="var(--accent)" />
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--fg)" }}>{kpis.engagementCount}</div>
        </div>
      </div>

      {/* Filter and Content Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "var(--bg)", border: "1px solid var(--border)", padding: "10px 16px", borderRadius: "8px" }}>
          <Filter size={14} color="var(--fg-muted)" />
          <select 
            value={selectedCampaign} 
            onChange={e => setSelectedCampaign(e.target.value)}
            style={{ background: "none", border: "none", outline: "none", fontSize: "13px", fontWeight: "600", color: "var(--fg)", cursor: "pointer" }}
          >
            <option value="all">All Campaigns</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {filteredDrafts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", border: "1px dashed var(--border)", borderRadius: "12px", background: "var(--bg)" }}>
            <p style={{ color: "var(--fg-muted)", fontSize: "13px" }}>No LinkedIn posts found. Create a LinkedIn campaign to generate drafts.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
            {filteredDrafts.map(draft => (
              <LinkedInCard
                key={draft.id}
                draft={draft}
                onSave={handleSaveBody}
                onApprove={handleApprove}
                onSchedule={handleOpenSchedule}
              />
            ))}
          </div>
        )}
      </div>

      {/* Scheduler Modal */}
      {schedulingDraftId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px" }}>
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px", maxWidth: "380px", width: "100%", boxShadow: "0 10px 25px -5px var(--shadow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--fg)" }}>Schedule Publication</h3>
              <button onClick={() => setSchedulingDraftId(null)} style={{ background: "none", border: "none", color: "var(--fg-faint)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Day</label>
                <select 
                  className="input-field" 
                  value={selectedDay} 
                  onChange={e => setSelectedDay(e.target.value)}
                  style={{ width: "100%", fontSize: "13px" }}
                >
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Time</label>
                <select 
                  className="input-field" 
                  value={selectedTime} 
                  onChange={e => setSelectedTime(e.target.value)}
                  style={{ width: "100%", fontSize: "13px" }}
                >
                  {["08:00 AM", "09:00 AM", "10:00 AM", "12:00 PM", "02:00 PM", "04:00 PM", "06:00 PM"].map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button className="btn btn-secondary" style={{ flex: 1, padding: "10px" }} onClick={() => setSchedulingDraftId(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1, padding: "10px" }} onClick={handleSaveSchedule}>
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
