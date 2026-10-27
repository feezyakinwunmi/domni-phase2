"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * OAuth-ready: wired to Supabase's signInWithOAuth. To activate a provider,
 * enable it in Supabase Dashboard → Authentication → Providers and add the
 * redirect URL there — no code changes needed here.
 */
export function OAuthButtons() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  async function signInWith(provider: "google" | "github") {
    setLoadingProvider(provider);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        type="button"
        variant="secondary"
        onClick={() => signInWith("google")}
        disabled={loadingProvider !== null}
      >
        {loadingProvider === "google" ? "Redirecting…" : "Google"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => signInWith("github")}
        disabled={loadingProvider !== null}
      >
        {loadingProvider === "github" ? "Redirecting…" : "GitHub"}
      </Button>
    </div>
  );
}
