"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Users, Mail, Eye, MessageSquare, Search, Filter, 
  Sparkles, Check, CheckSquare, Square, Send, Copy, 
  ChevronDown, ChevronRight, Edit3, X, Loader2, ArrowRight
} from "lucide-react";

interface Lead {
  id: string;
  name: string | null;
  title: string | null;
  company: string | null;
  email: string | null;
  linkedinUrl: string | null;
  status: string | null;
  campaignId: string | null;
  kpiData?: any;
}

interface Campaign {
  id: string;
  name: string;
}

interface Draft {
  id: string;
  leadId: string | null;
  subject: string | null;
  body: string;
  status: string | null;
}

interface LeadsVaultClientProps {
  initialLeads: Lead[];
  campaigns: Campaign[];
  initialDrafts: Draft[];
}

export default function LeadsVaultClient({ initialLeads, campaigns, initialDrafts }: LeadsVaultClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"leads" | "emails">(
    (searchParams.get("tab") as "leads" | "emails") || "leads"
  );

  // Data states
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [drafts, setDrafts] = useState<Draft[]>(initialDrafts);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<string>(searchParams.get("campaign") || "all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  
  // AI Generator Panel states
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEmails, setGeneratedEmails] = useState<any[]>([]); // Temp holder before saving

  // Modal / Editing states
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editingSubject, setEditingSubject] = useState("");
  const [editingBody, setEditingBody] = useState("");
  
  const [sendingDraft, setSendingDraft] = useState<Draft | null>(null);
  const [isSending, setIsSending] = useState(false);

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", activeTab);
    if (selectedCampaign !== "all") {
      params.set("campaign", selectedCampaign);
    } else {
      params.delete("campaign");
    }
    router.replace(`?${params.toString()}`);
  }, [activeTab, selectedCampaign, router]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch = 
        (lead.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.company || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.title || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCampaign = selectedCampaign === "all" || lead.campaignId === selectedCampaign;
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;

      return matchesSearch && matchesCampaign && matchesStatus;
    });
  }, [leads, searchQuery, selectedCampaign, statusFilter]);

  // Bulk Selection Helpers
  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  // Bulk Actions
  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedLeadIds.length === 0) return;
    try {
      const promises = selectedLeadIds.map(async (id) => {
        const res = await fetch(`/api/leads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        return res.json();
      });
      await Promise.all(promises);
      
      // Update local state
      setLeads(prev => prev.map(l => 
        selectedLeadIds.includes(l.id) ? { ...l, status: newStatus } : l
      ));
      setSelectedLeadIds([]);
      toast.success(`Updated ${selectedLeadIds.length} leads to '${newStatus}'`);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  // AI custom email generator
  const handleGenerateCustomEmails = async () => {
    if (selectedLeadIds.length === 0) {
      toast.error("Please select at least one lead first");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Please describe your cold email angle / guidelines");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/agents/drafts/generate-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: selectedLeadIds,
          instruction: prompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setGeneratedEmails(data.emails);
      setActiveTab("emails"); // Switch tab to review generated emails
      toast.success(`Generated custom emails for ${data.emails.length} leads!`);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  // Save generated drafts to database
  const handleSaveAllGenerated = async () => {
    try {
      const res = await fetch("/api/agents/drafts/save-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: generatedEmails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      // Refetch drafts or prepend
      const newDraftsRes = await fetch("/api/drafts?channel=cold-email"); // Fallback check or rebuild state
      const draftsData = await newDraftsRes.json();
      if (draftsData.drafts) {
        setDrafts(draftsData.drafts);
      } else {
        // Just reload page to show fresh db drafts
        window.location.reload();
      }

      setGeneratedEmails([]);
      toast.success("Successfully saved all drafts to the vault!");
    } catch (err) {
      toast.error(String(err));
    }
  };

  // Save a single inline edited draft
  const handleSaveDraftEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/drafts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: editingSubject, body: editingBody }),
      });
      if (!res.ok) throw new Error("Save failed");

      setDrafts(prev => prev.map(d => 
        d.id === id ? { ...d, subject: editingSubject, body: editingBody } : d
      ));
      setEditingDraftId(null);
      toast.success("Draft updated!");
    } catch (err) {
      toast.error("Failed to save changes");
    }
  };

  // Mock send email action
  const handleConfirmSend = async () => {
    if (!sendingDraft) return;
    setIsSending(true);

    try {
      // 1. Mock api call to send email
      // 2. Set draft status to "sent"
      const res = await fetch(`/api/drafts/${sendingDraft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sent" }),
      });
      if (!res.ok) throw new Error("Failed to send");

      // Update lead state to contacted if applicable
      if (sendingDraft.leadId) {
        await fetch(`/api/leads/${sendingDraft.leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "contacted" }),
        });

        setLeads(prev => prev.map(l => 
          l.id === sendingDraft.leadId ? { ...l, status: "contacted" } : l
        ));
      }

      setDrafts(prev => prev.map(d => 
        d.id === sendingDraft.id ? { ...d, status: "sent" } : d
      ));

      toast.success(`Cold email successfully sent to ${leads.find(l => l.id === sendingDraft.leadId)?.email}!`);
      setSendingDraft(null);
    } catch (err) {
      toast.error("Outreach dispatch failed");
    } finally {
      setIsSending(false);
    }
  };

  // Clipboard utility
  const handleCopyToClipboard = (subject: string | null, body: string) => {
    navigator.clipboard.writeText(`Subject: ${subject || ""}\n\n${body}`);
    toast.success("Copied to clipboard!");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-subtle)" }}>
      {/* Top Header & Tabs Navigation */}
      <div style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)", padding: "18px 32px 0 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--fg)", marginBottom: "4px" }}>Prospects & Outreach</h1>
            <p style={{ fontSize: "12px", color: "var(--fg-muted)" }}>Search target accounts, build lead lists, and generate AI-driven campaign sequences.</p>
          </div>
        </div>

        {/* Tab buttons */}
        <div style={{ display: "flex", gap: "24px" }}>
          <button 
            onClick={() => setActiveTab("leads")}
            style={{
              background: "none", border: "none", padding: "12px 0", cursor: "pointer", fontSize: "14px", fontWeight: "600",
              color: activeTab === "leads" ? "var(--accent)" : "var(--fg-muted)",
              borderBottom: activeTab === "leads" ? "2px solid var(--accent)" : "2px solid transparent",
              transition: "all 0.15s", display: "flex", alignItems: "center", gap: "8px"
            }}>
            <Users size={16} /> Leads Vault
            <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "10px", background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--fg-muted)" }}>
              {leads.length}
            </span>
          </button>
          
          <button 
            onClick={() => setActiveTab("emails")}
            style={{
              background: "none", border: "none", padding: "12px 0", cursor: "pointer", fontSize: "14px", fontWeight: "600",
              color: activeTab === "emails" ? "var(--accent)" : "var(--fg-muted)",
              borderBottom: activeTab === "emails" ? "2px solid var(--accent)" : "2px solid transparent",
              transition: "all 0.15s", display: "flex", alignItems: "center", gap: "8px"
            }}>
            <Mail size={16} /> Outreach Emails
            <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "10px", background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--fg-muted)" }}>
              {drafts.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>
        {activeTab === "leads" ? (
          <div>
            {/* Filter Bar */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", background: "var(--bg)", border: "1px solid var(--border)", padding: "12px 16px", borderRadius: "12px", marginBottom: "20px", alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
                <Search size={16} color="var(--fg-faint)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input 
                  className="input-field" 
                  placeholder="Search by name, company, or title..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: "36px", width: "100%", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {/* Campaign Selector */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "8px", padding: "4px 10px" }}>
                  <Filter size={13} color="var(--fg-muted)" />
                  <select 
                    value={selectedCampaign}
                    onChange={e => setSelectedCampaign(e.target.value)}
                    style={{ background: "none", border: "none", outline: "none", fontSize: "12px", fontWeight: "600", color: "var(--fg)", cursor: "pointer" }}>
                    <option value="all">All Campaigns</option>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Status Selector */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "8px", padding: "4px 10px" }}>
                  <Filter size={13} color="var(--fg-muted)" />
                  <select 
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{ background: "none", border: "none", outline: "none", fontSize: "12px", fontWeight: "600", color: "var(--fg)", cursor: "pointer" }}>
                    <option value="all">All Statuses</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="replied">Replied</option>
                    <option value="bounced">Bounced</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Selection floating action strip */}
            {selectedLeadIds.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--accent-bg)", border: "1px solid var(--accent)", borderRadius: "10px", padding: "12px 18px", marginBottom: "20px" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--accent)" }}>
                  {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? "s" : ""} selected
                </span>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button onClick={() => { setActiveTab("emails"); }} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "12px" }}>
                    <Sparkles size={13} /> Generate Outreach for Selected
                  </button>
                  <button onClick={() => handleBulkStatusUpdate("contacted")} className="btn btn-secondary" style={{ padding: "6px 14px", fontSize: "12px" }}>
                    Mark as Contacted
                  </button>
                  <button onClick={() => setSelectedLeadIds([])} style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "12px" }}>
                    Deselect
                  </button>
                </div>
              </div>
            )}

            {/* Leads Grid Card Layout */}
            {filteredLeads.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ color: "var(--fg-muted)", fontSize: "14px" }}>No leads found matching current filters.</p>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", paddingLeft: "8px" }}>
                  <button onClick={toggleSelectAll} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "12px", fontWeight: "600", padding: 0 }}>
                    {selectedLeadIds.length === filteredLeads.length ? <CheckSquare size={15} color="var(--accent)" /> : <Square size={15} />}
                    Select All Visible ({filteredLeads.length})
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                  {filteredLeads.map((lead) => {
                    const hasDraft = drafts.some(d => d.leadId === lead.id);
                    const isSent = drafts.some(d => d.leadId === lead.id && d.status === "sent");
                    const hasReplied = lead.status === "replied";

                    return (
                      <div 
                        key={lead.id}
                        style={{
                          background: "var(--bg)", border: selectedLeadIds.includes(lead.id) ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                          borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between",
                          position: "relative", transition: "all 0.15s", cursor: "pointer", boxShadow: "0 2px 8px -2px var(--shadow)"
                        }}
                        onClick={() => toggleSelectLead(lead.id)}
                      >
                        {/* Checkbox overlay indicator */}
                        <div style={{ position: "absolute", top: "16px", right: "16px" }} onClick={(e) => { e.stopPropagation(); toggleSelectLead(lead.id); }}>
                          {selectedLeadIds.includes(lead.id) ? (
                            <CheckSquare size={17} color="var(--accent)" />
                          ) : (
                            <Square size={17} color="var(--fg-faint)" />
                          )}
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", paddingRight: "20px" }}>
                            <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--fg)" }}>{lead.name || "Unknown Prospect"}</span>
                            {lead.linkedinUrl && (
                              <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: "#0077b5", display: "inline-flex" }}>
                                <span style={{ fontSize: "11px", fontWeight: "bold" }}>in</span>
                              </a>
                            )}
                          </div>
                          
                          <div style={{ fontSize: "12px", color: "var(--fg-muted)", fontWeight: "500", marginBottom: "2px" }}>
                            {lead.title || "Target Persona"}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--fg-muted)" }}>
                            at <strong style={{ color: "var(--fg)" }}>{lead.company || "Company"}</strong>
                          </div>
                          
                          {lead.email && (
                            <div style={{ fontSize: "11px", color: "var(--fg-faint)", marginTop: "8px" }}>
                              {lead.email}
                            </div>
                          )}
                        </div>

                        {/* KPI Strip and status badge */}
                        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {/* Email icon */}
                            <div title={isSent ? "Outreach sent" : hasDraft ? "Email draft ready" : "Unsent"} style={{ display: "flex", alignItems: "center" }}>
                              <Mail size={14} color={isSent ? "var(--green)" : hasDraft ? "var(--accent)" : "var(--fg-faint)"} />
                            </div>
                            {/* Opened icon */}
                            <div title={isSent ? "Mock opened stats" : "Not sent yet"} style={{ display: "flex", alignItems: "center" }}>
                              <Eye size={14} color={isSent ? "var(--green)" : "var(--fg-faint)"} />
                            </div>
                            {/* Replied icon */}
                            <div title={hasReplied ? "Replied!" : "No reply yet"} style={{ display: "flex", alignItems: "center" }}>
                              <MessageSquare size={14} color={hasReplied ? "var(--accent)" : "var(--fg-faint)"} />
                            </div>
                          </div>

                          <span className={`badge badge-${
                            lead.status === "new" ? "blue" : 
                            lead.status === "contacted" ? "purple" : 
                            lead.status === "replied" ? "green" : "gray"
                          }`} style={{ fontSize: "10px" }}>
                            {lead.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Outreach Emails Tab (Generator + Vault) */
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: "28px", height: "100%" }}>
            
            {/* Left Column: AI Outreach Generator */}
            <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column" }}>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--fg)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <Sparkles size={16} color="var(--accent)" /> AI Outreach Generator
                </h3>
                <p style={{ fontSize: "12px", color: "var(--fg-muted)" }}>Generate tailor-made cold messages for your selected leads.</p>
              </div>

              {/* Selected Leads Box */}
              <div style={{ flex: 1, background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", marginBottom: "16px", overflowY: "auto", maxHeight: "200px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase" }}>Recipient Leads</span>
                  <button onClick={() => { setActiveTab("leads"); }} style={{ fontSize: "11px", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: "600" }}>
                    Select More
                  </button>
                </div>

                {selectedLeadIds.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "var(--fg-faint)", fontStyle: "italic", textAlign: "center", marginTop: "16px" }}>
                    No leads selected. Click "Select More" to check target prospects.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {selectedLeadIds.map(id => {
                      const l = leads.find(x => x.id === id);
                      return (
                        <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "6px" }}>
                          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--fg)" }}>{l?.name || "Unknown Lead"}</span>
                          <button onClick={() => setSelectedLeadIds(prev => prev.filter(x => x !== id))} style={{ background: "none", border: "none", color: "var(--fg-faint)", cursor: "pointer", fontSize: "11px" }}>×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* AI prompt inputs */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <textarea
                  className="input-field"
                  placeholder="Tell the AI what to focus on: e.g., 'Emphasize how our real-time dashboard improves conversion rates by 20% and request a 10 min chat...'"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  style={{ width: "100%", minHeight: "90px", fontSize: "13px", resize: "vertical" }}
                />
                
                <button
                  onClick={handleGenerateCustomEmails}
                  disabled={isGenerating || selectedLeadIds.length === 0}
                  className="btn btn-primary"
                  style={{ width: "100%", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> Generate outreach templates
                    </>
                  )}
                </button>
              </div>

              {/* Review Panel of Temporary Generated Templates */}
              {generatedEmails.length > 0 && (
                <div style={{ marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--fg)" }}>Generated Templates ({generatedEmails.length})</span>
                    <button onClick={handleSaveAllGenerated} className="btn btn-primary" style={{ padding: "4px 10px", fontSize: "11px" }}>
                      Save All to Vault
                    </button>
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "250px", overflowY: "auto" }}>
                    {generatedEmails.map((item, idx) => (
                      <div key={idx} style={{ padding: "10px", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--bg-subtle)" }}>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", marginBottom: "4px" }}>To: {item.leadName} ({item.leadCompany})</div>
                        <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--fg)", marginBottom: "4px" }}>Sbj: {item.subject}</div>
                        <div style={{ fontSize: "11px", color: "var(--fg-muted)", whiteSpace: "pre-wrap" }}>{item.body.substring(0, 100)}...</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Emails Draft Vault */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--fg)" }}>Email Drafts Vault</h3>
                <span style={{ fontSize: "12px", color: "var(--fg-muted)" }}>{drafts.length} drafts total</span>
              </div>

              {drafts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", border: "1px dashed var(--border)", borderRadius: "12px", background: "var(--bg)" }}>
                  <p style={{ color: "var(--fg-muted)", fontSize: "13px" }}>No outreach emails in the vault yet. Use the generator to create cold email options.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {drafts.map((draft) => {
                    const lead = leads.find(l => l.id === draft.leadId);
                    const isEditing = editingDraftId === draft.id;

                    return (
                      <div 
                        key={draft.id}
                        style={{
                          background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px",
                          boxShadow: "0 2px 6px -3px var(--shadow)"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                          <div>
                            <span style={{ fontSize: "11px", color: "var(--fg-faint)", fontWeight: "600", textTransform: "uppercase" }}>Cold Outreach Draft</span>
                            <h4 style={{ fontSize: "13px", fontWeight: "700", color: "var(--fg)", marginTop: "2px" }}>
                              To: {lead ? `${lead.name} (${lead.company})` : "Unassigned Recipient"}
                            </h4>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span className={`badge badge-${draft.status === "sent" ? "green" : "gray"}`} style={{ fontSize: "10px" }}>
                              {draft.status}
                            </span>
                            <button onClick={() => handleCopyToClipboard(draft.subject, draft.body)} style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", padding: "4px" }} title="Copy complete email">
                              <Copy size={13} />
                            </button>
                            {draft.status !== "sent" && (
                              <button onClick={() => {
                                setEditingDraftId(draft.id);
                                setEditingSubject(draft.subject || "");
                                setEditingBody(draft.body);
                              }} style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", padding: "4px" }} title="Edit draft">
                                <Edit3 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                            <input 
                              className="input-field" 
                              value={editingSubject} 
                              onChange={e => setEditingSubject(e.target.value)}
                              placeholder="Subject line..."
                              style={{ width: "100%", fontSize: "13px", fontWeight: "600" }}
                            />
                            <textarea 
                              className="input-field" 
                              value={editingBody} 
                              onChange={e => setEditingBody(e.target.value)}
                              placeholder="Email body..."
                              style={{ width: "100%", minHeight: "120px", fontSize: "13px", resize: "vertical" }}
                            />
                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                              <button className="btn btn-secondary" style={{ padding: "5px 12px", fontSize: "12px" }} onClick={() => setEditingDraftId(null)}>Cancel</button>
                              <button className="btn btn-primary" style={{ padding: "5px 12px", fontSize: "12px" }} onClick={() => handleSaveDraftEdit(draft.id)}>Save Changes</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--fg)" }}>
                              <span style={{ color: "var(--fg-muted)" }}>Subject:</span> {draft.subject || "No Subject Line"}
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--fg-muted)", whiteSpace: "pre-wrap", lineHeight: "1.5", background: "var(--bg-subtle)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                              {draft.body}
                            </div>

                            {draft.status !== "sent" && (
                              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                                <button onClick={() => setSendingDraft(draft)} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "12px" }}>
                                  <Send size={12} /> Send Cold Email
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Sending Confirmation Overlay Modal */}
      {sendingDraft && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px" }}>
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px", maxWidth: "480px", width: "100%", boxShadow: "0 10px 25px -5px var(--shadow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--fg)" }}>Send Outreach Confirmation</h3>
              <button onClick={() => setSendingDraft(null)} style={{ background: "none", border: "none", color: "var(--fg-faint)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", color: "var(--fg-muted)" }}>
                <strong>From:</strong> campaign-agent@reachly.net
              </div>
              <div style={{ fontSize: "12px", color: "var(--fg-muted)" }}>
                <strong>To:</strong> {leads.find(l => l.id === sendingDraft.leadId)?.email || "Unknown Lead"}
              </div>
              <div style={{ fontSize: "12px", color: "var(--fg-muted)" }}>
                <strong>Subject:</strong> {sendingDraft.subject}
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", fontSize: "12px", color: "var(--fg-muted)", whiteSpace: "pre-wrap", maxHeight: "150px", overflowY: "auto" }}>
                {sendingDraft.body}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button className="btn btn-secondary" style={{ flex: 1, padding: "10px" }} onClick={() => setSendingDraft(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1, padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }} onClick={handleConfirmSend} disabled={isSending}>
                {isSending ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={13} />}
                Confirm & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
