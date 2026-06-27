import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Next image optimization for the Unsplash post images.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // Strip console.* (except errors/warnings) from production bundles.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
};

export default nextConfig;
