"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Can I create custom ticket types, not just presets?",
    a: "Yes. Every ticket type field is a creatable select — pick a preset like VIP or Early Bird, or type something specific to your event, like \"Medical Students Table\".",
  },
  {
    q: "How does QR check-in work without extra hardware?",
    a: "Each ticket gets a signed QR code. Your check-in staff scan it with any phone camera through the DOMNI check-in page — no scanner hardware needed.",
  },
  {
    q: "How fast do organizers get paid out?",
    a: "Payouts are processed from your dashboard once an event closes, with status visible the whole way — pending, processing, or paid.",
  },
  {
    q: "Can guests vote without creating an account?",
    a: "Yes, voting campaigns support guest checkout by email, so turnout isn't limited to people who already have a DOMNI account.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="bg-white py-28">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-500">
            FAQ
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-ink-800 sm:text-4xl">
            Questions organizers ask
          </h2>
        </div>

        <div className="mt-12 divide-y divide-slate-100 border-y border-slate-100">
          {faqs.map((faq, i) => (
            <div key={faq.q}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left"
              >
                <span className="font-display text-base font-medium text-ink-800">
                  {faq.q}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300",
                    open === i && "rotate-180 text-violet-500"
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid overflow-hidden transition-all duration-300",
                  open === i ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <p className="overflow-hidden text-sm leading-relaxed text-slate-500">
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
