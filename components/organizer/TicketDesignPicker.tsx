"use client";

import { Lock } from "lucide-react";
import TicketRenderer from "@/components/tickets/TicketRenderer";
import type { TicketTemplate } from "@/components/events/TicketTemplatePicker";

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
  onChange: (id: string) => void;
}

export function TicketDesignPicker({ templates, value, plan, onChange }: Props) {
  const isPro = plan === "PRO";

  function handleSelect(template: TicketTemplate) {
    if (template.isPremium && !isPro) {
      alert(
        "This is a premium design. Upgrade to Pro from Settings to unlock premium designs and customization."
      );
      return;
    }

    onChange(template.id);
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {templates.map((template) => {
        const active = value === template.id;
        const locked = template.isPremium && !isPro;

        return (
          <button
            key={template.id}
            type="button"
            onClick={() => handleSelect(template)}
            className={`relative overflow-hidden rounded-xl border text-left transition ${
              active ? "border-violet-600 ring-2 ring-violet-200" : "border-slate-200"
            }`}
          >
            <div className="aspect-[3/4] w-full overflow-hidden bg-slate-100">
              <div className="origin-top-left scale-[0.28]">
                <TicketRenderer templateKey={template.templateKey} data={SAMPLE_DATA} />
              </div>
            </div>

            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="truncate text-xs font-medium text-slate-700">
                {template.name}
              </span>

              {template.isPremium && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                  PRO
                </span>
              )}
            </div>

            {locked && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/45">
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
  );
}
