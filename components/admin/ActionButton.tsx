"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/errors";

/**
 * Runs an admin server action with an optional confirm step, then refreshes.
 * The action is passed pre-bound from a server component.
 */
export function ActionButton({
  action,
  children,
  confirm,
  tone = "default",
  className,
}: {
  action: () => Promise<ActionResult>;
  children: React.ReactNode;
  confirm?: string;
  tone?: "default" | "danger" | "primary";
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setError(null);
          start(async () => {
            const res = await action();
            if (!res.ok) setError(res.error);
            else router.refresh();
          });
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50",
          tone === "danger" && "border border-red-200 text-red-600 hover:bg-red-50",
          tone === "primary" && "bg-ink-800 text-white hover:bg-ink-700",
          tone === "default" && "border border-slate-200 text-slate-700 hover:bg-slate-50",
          className
        )}
      >
        {pending && <Loader2 className="h-3 w-3 animate-spin" />}
        {children}
      </button>
      {error && <span className="mt-1 max-w-[220px] whitespace-normal text-[11px] text-red-500">{error}</span>}
    </span>
  );
}
