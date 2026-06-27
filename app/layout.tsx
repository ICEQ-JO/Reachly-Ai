import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Reachly — Distribute Your Product",
  description: "AI-powered product distribution for SaaS and PaaS founders",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="h-full" style={{ background: "#09090b", color: "#fafafa" }}>
        {children}
        <Toaster
          theme="dark"
          toastOptions={{
            style: { background: "#18181b", border: "1px solid #27272a", color: "#fafafa" },
          }}
        />
      </body>
    </html>
  );
}
