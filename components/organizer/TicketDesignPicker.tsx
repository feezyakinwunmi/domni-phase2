"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import TicketRenderer, { LANDSCAPE_TEMPLATES } from "@/components/tickets/TicketRenderer";
import type { TicketTemplate } from "@/components/events/TicketTemplatePicker";
import { cn } from "@/lib/utils";

const SAMPLE_DATA = {
  eventName: "Sample Event",
  attendeeName: "Jane Doe",
  ticketType: "General",
  date: "Sat, Jan 1",
  venue: "Main Hall",
  qr: "",
};

interface Props {
  templates: TicketTemplate[];
  value: string | null;
  plan: string;
  onChange: (id: string | null) => void;
}

export function TicketDesignPicker({ templates, value, plan, onChange }: Props) {
  const [lockedName, setLockedName] = useState<string | null>(null);
  const isPro = plan === "PRO";

  if (templates.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
        No ticket designs found. Run <code className="rounded bg-slate-100 px-1">node scripts/seed-templates.js</code> to add them.
        Tickets will use the default design until then.
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {templates.map((template) => {
          const active = value === template.id;
          const locked = template.isPremium && !isPro;
          const landscape = LANDSCAPE_TEMPLATES.has(template.templateKey);

          return (
            <button
              key={template.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                if (locked) return setLockedName(template.name);
                setLockedName(null);
                onChange(active ? null : template.id);
              }}
              className={cn(
                "relative overflow-hidden rounded-xl border text-left transition",
                active ? "border-violet-600 ring-2 ring-violet-200" : "border-slate-200 hover:border-slate-300"
              )}
            >
              <div className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden bg-slate-100">
                <div className={cn("pointer-events-none origin-center", landscape ? "scale-[0.17]" : "scale-[0.28]")}>
                  <TicketRenderer templateKey={template.templateKey} data={SAMPLE_DATA} />
                </div>
              </div>

              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <span className="truncate text-xs font-medium text-slate-700">{template.name}</span>
                {template.isPremium && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">PRO</span>
                )}
              </div>

              {locked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Lock className="h-5 w-5 text-white" />
                </div>
              )}

              {active && (
                <div className="absolute right-1.5 top-1.5 rounded-full bg-violet-600 px-2 py-0.5 text-[9px] font-semibold text-white">
                  Selected
                </div>
              )}
            </button>
          );
        })}
      </div>

      {lockedName && (
        <p className="mt-2 text-xs text-amber-700">
          {lockedName} is a premium design.{" "}
          <Link href="/organizer/settings" className="font-semibold underline">
            Upgrade to Pro
          </Link>{" "}
          to unlock it.
        </p>
      )}
      {!value && <p className="mt-2 text-xs text-slate-400">No design selected — the default (Aurora Minimal) is used.</p>}
    </div>
  );
}
