"use client";

import TicketRenderer from "@/components/tickets/TicketRenderer";

export interface TicketTemplate {
  id: string;
  name: string;
  templateKey: string;
  isPremium: boolean;
}

const SAMPLE_TICKET_DATA = {
  eventName: "Sample Event",
  attendeeName: "Jane Doe",
  ticketType: "General Admission",
  date: "Sat, Jan 1",
  venue: "Main Hall",
  qr: "",
};

interface Props {
  templates: TicketTemplate[];
  selected: string[];
  onChange: (ids: string[]) => void;
  isPro?: boolean;
}

export function TicketTemplatePicker({
  templates,
  selected,
  onChange,
  isPro = false,
}: Props) {
  function toggle(id: string, premium: boolean) {
    if (premium && !isPro) {
      alert("Upgrade to Pro to use Premium templates.");
      return;
    }

    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
      return;
    }

    if (!isPro && selected.length >= 2) {
      alert(
        "Free organizers can only select 2 ticket templates."
      );
      return;
    }

    onChange([...selected, id]);
  }

  return (
    <div className="rounded-2xl border bg-white p-6">
      <h2 className="text-lg font-bold">
        Ticket Templates
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Choose up to 2 templates for attendees.
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => {
          const active = selected.includes(template.id);

          return (
            <button
              key={template.id}
              type="button"
              onClick={() =>
                toggle(
                  template.id,
                  template.isPremium
                )
              }
              className={`overflow-hidden rounded-2xl border transition ${
                active
                  ? "border-violet-600 ring-2 ring-violet-200"
                  : "border-slate-200"
              }`}
            >
              <div className="aspect-[3/5] w-full overflow-hidden bg-slate-100">
                <div className="origin-top-left scale-[0.35]">
                  <TicketRenderer
                    templateKey={template.templateKey}
                    data={SAMPLE_TICKET_DATA}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4">
                <div className="text-left">
                  <h3 className="font-semibold">
                    {template.name}
                  </h3>

                  <p className="text-xs text-slate-500">
                    {template.isPremium
                      ? "PRO"
                      : "FREE"}
                  </p>
                </div>

                {active && (
                  <div className="rounded-full bg-violet-600 px-3 py-1 text-xs text-white">
                    Selected
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}