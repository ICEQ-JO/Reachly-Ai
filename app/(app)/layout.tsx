import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { Zap } from "lucide-react";
import { SignOutButton } from "@/components/SignOutButton";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { SidebarNav } from "@/components/SidebarNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Parallel fetch: session + headers don't depend on each other
  const [session] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
  ]);

  if (!session) redirect("/login");

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
    columns: { id: true, name: true, audience: true, type: true },
    orderBy: (p) => [desc(p.createdAt)],
  });

  if (!product) redirect("/onboarding");

  const isB2B = product.audience === "b2b";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      {/* Sidebar */}
      <aside style={{
        width: "220px", minWidth: "220px",
        background: "var(--bg-subtle)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Logo */}
        <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "26px", height: "26px", background: "var(--gold-1)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Zap size={13} color="#fff" fill="#fff" />
            </div>
            <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--fg)" }}>Reachly</span>
          </div>
          <DarkModeToggle />
        </div>

        {/* Product badge */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: "10px", color: "var(--fg-faint)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: "600" }}>Product</div>
          <div style={{ fontSize: "13px", color: "var(--fg)", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</div>
          <div style={{ marginTop: "5px" }}>
            <span className={`badge badge-${isB2B ? "blue" : "purple"}`}>
              {isB2B ? "B2B" : "B2C"} · {product.type?.toUpperCase() ?? "SaaS"}
            </span>
          </div>
        </div>

        {/* Nav */}
        <SidebarNav isB2B={isB2B} />

        {/* User */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: "11px", color: "var(--fg-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "8px" }}>
            {session.user.email}
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto", background: "var(--bg)" }}>
        {children}
      </main>
    </div>
  );
}
