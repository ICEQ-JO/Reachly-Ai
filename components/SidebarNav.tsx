"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Settings, Target, Mail,
  Briefcase, Sparkles, Calendar, MessageSquare,
  Archive, Megaphone,
} from "lucide-react";
import { Suspense } from "react";

interface Props { isB2B: boolean }

const B2B_NAV = [
  { href: "/dashboard/b2b",           icon: LayoutDashboard, label: "Overview"   },
  { href: "/dashboard/b2b/campaigns", icon: Megaphone,       label: "Campaigns"  },
  { href: "/dashboard/b2b/vault",     icon: Archive,         label: "Vault"      },
  { href: "/dashboard/b2b/linkedin",  icon: Briefcase,       label: "LinkedIn"   },
  { href: "/dashboard/b2b/chat",      icon: MessageSquare,   label: "AI Chat"    },
];

const B2C_NAV = [
  { href: "/dashboard/b2c",           icon: LayoutDashboard, label: "Overview"   },
  { href: "/dashboard/b2c/campaigns", icon: Megaphone,       label: "Campaigns"  },
  { href: "/dashboard/b2c/vault",     icon: Archive,         label: "Vault"      },
  { href: "/dashboard/b2c/schedule",  icon: Calendar,        label: "Schedule"   },
  { href: "/dashboard/b2c/chat",      icon: MessageSquare,   label: "AI Chat"    },
];

function NavInner({ isB2B }: Props) {
  const pathname = usePathname();
  const items = isB2B ? B2B_NAV : B2C_NAV;

  function isActive(href: string) {
    if (href === "/dashboard/b2b" || href === "/dashboard/b2c") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
      {items.map(({ href, icon: Icon, label }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: "flex", alignItems: "center", gap: "9px",
              padding: "8px 10px", borderRadius: "7px",
              fontSize: "13px", fontWeight: active ? "600" : "500",
              color: active ? "var(--accent)" : "var(--fg-muted)",
              textDecoration: "none", transition: "all 0.15s",
              background: active ? "var(--accent-bg)" : "transparent",
            }}
            onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)"; }}
            onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <Icon size={14} />
            {label}
          </Link>
        );
      })}

      <div style={{ marginTop: "auto", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
        <Link
          href="/dashboard/settings"
          style={{
            display: "flex", alignItems: "center", gap: "9px",
            padding: "8px 10px", borderRadius: "7px",
            fontSize: "13px", fontWeight: "500",
            color: pathname === "/dashboard/settings" ? "var(--accent)" : "var(--fg-muted)",
            textDecoration: "none", transition: "all 0.15s",
            background: pathname === "/dashboard/settings" ? "var(--accent-bg)" : "transparent",
          }}
        >
          <Settings size={14} /> Settings
        </Link>
      </div>
    </nav>
  );
}

export function SidebarNav(props: Props) {
  return (
    <Suspense fallback={<nav style={{ flex: 1, padding: "10px 8px" }} />}>
      <NavInner {...props} />
    </Suspense>
  );
}
