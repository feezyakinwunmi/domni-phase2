"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, WifiOff } from "lucide-react";

const AUTO_RETRY_KEY = "domni:auto-retry";
const AUTO_RETRY_DELAY_MS = 2500;

/**
 * Friendly replacement for raw error pages. Most failures here are a brief
 * database/network blip, so it retries once on its own (per page, per
 * session) before asking the user to.
 */
export function ErrorScreen({
  error,
  reset,
  homeHref = "/",
  compact = false,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [offline, setOffline] = useState(false);

  function retry() {
    setRetrying(true);
    // refresh() re-runs the server components; reset() re-renders the boundary.
    startTransition(() => {
      router.refresh();
      reset();
    });
    setTimeout(() => setRetrying(false), 4000);
  }

  useEffect(() => {
    console.error(error);
    setOffline(typeof navigator !== "undefined" && !navigator.onLine);

    let key = "";
    try {
      key = `${AUTO_RETRY_KEY}:${window.location.pathname}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      return;
    }
    const t = setTimeout(retry, AUTO_RETRY_DELAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // Retry as soon as the device regains connectivity.
  useEffect(() => {
    const onOnline = () => {
      setOffline(false);
      retry();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`flex flex-col items-center justify-center px-6 text-center ${compact ? "py-20" : "min-h-[70vh] py-16"}`}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50">
        {offline ? <WifiOff className="h-7 w-7 text-violet-500" /> : <RefreshCw className={`h-7 w-7 text-violet-500 ${retrying ? "animate-spin" : ""}`} />}
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold text-ink-800">
        {offline ? "You're offline" : retrying ? "Reconnecting…" : "We couldn't load this page"}
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        {offline
          ? "Check your internet connection. We'll try again as soon as you're back online."
          : "This is usually a brief connection hiccup on our side. Your data is safe — please try again."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={retry}
          disabled={retrying}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-domni-gradient px-6 text-sm font-semibold text-white shadow-glow hover:brightness-110 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
          Try again
        </button>
        <Link href={homeHref} className="inline-flex h-11 items-center rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-ink-800 hover:border-violet-300">
          Go home
        </Link>
      </div>
      {error.digest && <p className="mt-6 font-mono text-[11px] text-slate-300">Ref: {error.digest}</p>}
    </div>
  );
}
