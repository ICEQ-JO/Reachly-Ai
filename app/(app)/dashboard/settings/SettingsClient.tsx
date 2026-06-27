"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";
import {
  User, Package, Link2, LogOut, Save, Loader2,
  ImageIcon, Users, Briefcase, Globe,
} from "lucide-react";

interface Props {
  user: { name: string; email: string };
  product: {
    id: string;
    name: string;
    description: string | null;
    type: string | null;
    audience: string | null;
    painPoint: string | null;
    differentiator: string | null;
    targetCustomer: string | null;
    niche: string | null;
  };
}

export default function SettingsClient({ user, product }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({
    name:           product.name,
    description:    product.description ?? "",
    painPoint:      product.painPoint ?? "",
    differentiator: product.differentiator ?? "",
    targetCustomer: product.targetCustomer ?? "",
    niche:          product.niche ?? "",
  });

  function update(key: keyof typeof fields, val: string) {
    setFields((f) => ({ ...f, [key]: val }));
  }

  async function saveProduct() {
    setSaving(true);
    try {
      const res = await fetch("/api/product", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: product.id, ...fields }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error("Save failed");
      toast.success("Settings saved");
      router.refresh();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  function connectPlatform(name: string) {
    toast("Coming soon! OAuth setup required for " + name, { description: "Connect in a future release." });
  }

  const isB2B = product.audience === "b2b";

  const SOCIALS = [
    { name: "Instagram", icon: <ImageIcon size={15} />,  color: "#e1306c", available: !isB2B },
    { name: "Reddit",    icon: <Globe size={15} />,      color: "#ff4500", available: !isB2B },
    { name: "Facebook",  icon: <Users size={15} />,      color: "#1877f2", available: !isB2B },
    { name: "LinkedIn",  icon: <Briefcase size={15} />,  color: "#0a66c2", available: true   },
  ].filter((s) => s.available);

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 28px" }}>
      <h1 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "28px" }}>Settings</h1>

      {/* Product Info */}
      <Section icon={<Package size={15} />} title="Product Info">
        <Field label="Product name">
          <input className="input-field" value={fields.name} onChange={(e) => update("name", e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea
            className="input-field"
            value={fields.description}
            onChange={(e) => update("description", e.target.value)}
            style={{ minHeight: "80px", resize: "vertical", fontFamily: "inherit" }}
          />
        </Field>
        {isB2B ? (
          <>
            <Field label="Pain point you solve">
              <textarea
                className="input-field"
                value={fields.painPoint}
                onChange={(e) => update("painPoint", e.target.value)}
                style={{ minHeight: "70px", resize: "vertical", fontFamily: "inherit" }}
              />
            </Field>
            <Field label="What makes you different">
              <textarea
                className="input-field"
                value={fields.differentiator}
                onChange={(e) => update("differentiator", e.target.value)}
                style={{ minHeight: "70px", resize: "vertical", fontFamily: "inherit" }}
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Target customer">
              <input className="input-field" value={fields.targetCustomer} onChange={(e) => update("targetCustomer", e.target.value)} />
            </Field>
            <Field label="Niche">
              <input className="input-field" value={fields.niche} onChange={(e) => update("niche", e.target.value)} />
            </Field>
          </>
        )}
        <div style={{ marginTop: "16px" }}>
          <button className="btn btn-primary" onClick={saveProduct} disabled={saving}>
            {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
            Save Changes
          </button>
        </div>
      </Section>

      {/* Connect Email */}
      <Section icon={<Link2 size={15} />} title="Connect Email">
        <p style={{ fontSize: "13px", color: "#71717a", marginBottom: "16px" }}>
          Connect your email account to send cold emails directly from Reachly.
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            className="input-field"
            placeholder="your@company.com (SMTP or Gmail)"
            style={{ flex: 1 }}
            readOnly
          />
          <button className="btn btn-secondary" onClick={() => connectPlatform("Email")}>
            Connect
          </button>
        </div>
        <p style={{ fontSize: "11px", color: "#52525b", marginTop: "8px" }}>
          OAuth-based email connection coming soon.
        </p>
      </Section>

      {/* Connect Social */}
      <Section icon={<Link2 size={15} />} title="Connect Social Accounts">
        <p style={{ fontSize: "13px", color: "#71717a", marginBottom: "16px" }}>
          Connect your accounts to auto-publish content directly from the dashboard.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {SOCIALS.map(({ name, icon, color }) => (
            <div
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color }}>{icon}</span>
                <span style={{ fontSize: "14px", fontWeight: "500", color: "#fafafa" }}>{name}</span>
              </div>
              <button
                className="btn btn-secondary"
                style={{ fontSize: "12px", padding: "6px 12px" }}
                onClick={() => connectPlatform(name)}
              >
                Connect {name}
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* Account */}
      <Section icon={<User size={15} />} title="Account">
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#18181b", borderRadius: "6px", border: "1px solid #27272a" }}>
            <span style={{ fontSize: "13px", color: "#71717a" }}>Name</span>
            <span style={{ fontSize: "13px", color: "#fafafa" }}>{user.name}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#18181b", borderRadius: "6px", border: "1px solid #27272a" }}>
            <span style={{ fontSize: "13px", color: "#71717a" }}>Email</span>
            <span style={{ fontSize: "13px", color: "#fafafa" }}>{user.email}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#18181b", borderRadius: "6px", border: "1px solid #27272a" }}>
            <span style={{ fontSize: "13px", color: "#71717a" }}>Auth provider</span>
            <span style={{ fontSize: "13px", color: "#fafafa" }}>Better Auth · email/password</span>
          </div>
        </div>
        <div style={{ marginTop: "16px" }}>
          <button className="btn btn-danger" onClick={handleSignOut}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </Section>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid #27272a" }}>
        <span style={{ color: "#71717a" }}>{icon}</span>
        <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#fafafa" }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
