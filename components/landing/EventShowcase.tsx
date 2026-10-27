"use client";

import { motion } from "framer-motion";
import { MapPin, Calendar } from "lucide-react";
import { TicketCard } from "@/components/ui/ticket-card";

const events = [
  {
    title: "Faculty Dinner",
    venue: "Grand Hall, Epe",
    date: "Aug 14",
    section: "Awards Night · VIP",
    code: "DMN-7F3K21",
    accent: "violet" as const,
  },
  {
    title: "Freshers Night",
    venue: "Amphitheatre",
    date: "Sep 02",
    section: "After Party · Regular",
    code: "DMN-9Q1A88",
    accent: "pulse" as const,
  },
  {
    title: "Tech Week Demo Day",
    venue: "Innovation Hub",
    date: "Sep 20",
    section: "Main Floor · Early Bird",
    code: "DMN-3L8C40",
    accent: "ink" as const,
  },
];

export function EventShowcase() {
  return (
    <section id="events" className="bg-slate-50 py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-end justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-violet-500">
              Live on DOMNI
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-ink-800 sm:text-4xl">
              Events selling right now
            </h2>
          </div>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {events.map((event, i) => (
            <motion.div
              key={event.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex flex-col gap-4"
            >
              <TicketCard
                eventTitle={event.title}
                sectionLabel={event.section}
                code={event.code}
                accent={event.accent}
                className="w-full max-w-none"
              />
              <div className="flex items-center gap-4 px-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> {event.date}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {event.venue}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
