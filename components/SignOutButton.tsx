"use client";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await signOut();
        router.push("/login");
      }}
      style={{
        display: "flex", alignItems: "center", gap: "6px",
        fontSize: "12px", color: "var(--fg-muted)", background: "none",
        border: "none", cursor: "pointer", padding: "0",
      }}
    >
      <LogOut size={12} /> Sign out
    </button>
  );
}
