"use client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Always talk to the same origin the app is served from. Relying on a build-time
  // NEXT_PUBLIC_APP_URL is fragile: it must be rebuilt to change and must exactly match
  // the deployed domain (prod vs preview vs custom domain), otherwise the browser fetch
  // hits the wrong origin and fails with "Failed to fetch". window.location.origin is
  // always correct in the browser.
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});

export const { signIn, signUp, signOut, useSession } = authClient;
