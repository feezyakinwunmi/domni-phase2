"use client";

import { useEffect, useState } from "react";
import { Handshake, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "tickets" | "partner";

/**
 * "Get tickets" vs "Partner with us". The #partner / #tickets hash selects a
 * tab, so organizers can share a link straight to their sponsorship packages.
 */
export function EventTabs({
  partnerLabel,
  tickets,
  partners,
}: {
  partnerLabel: string;
  tickets: React.ReactNode;
  partners: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("tickets");

  useEffect(() => {
    const sync = () => {
      const h = window.location.hash.replace("#", "");
      if (h === "partner" || h === "tickets") {
        setTab(h);
        document.getElementById("event-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function select(t: Tab) {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
  }

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "tickets", label: "Get tickets", icon: Ticket },
    { id: "partner", label: partnerLabel, icon: Handshake },
  ];

  return (
    <div id="event-tabs" className="scroll-mt-24">
      <div role="tablist" aria-label="Ways to take part" className="inline-flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => select(t.id)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:px-5",
              tab === t.id ? "bg-ink-800 text-white shadow" : "text-slate-500 hover:text-ink-800"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        <div role="tabpanel" id="panel-tickets" aria-labelledby="tab-tickets" hidden={tab !== "tickets"}>
          {tickets}
        </div>
        <div role="tabpanel" id="panel-partner" aria-labelledby="tab-partner" hidden={tab !== "partner"}>
          {partners}
        </div>
      </div>
    </div>
  );
}
