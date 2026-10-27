"use client";

import { motion } from "framer-motion";
import { Ticket, QrCode, Vote, BarChart3, Radio } from "lucide-react";

const features = [
  {
    icon: Ticket,
    title: "Event Ticketing",
    description:
      "Build multi-section events with as many ticket types as you need — Early Bird, VIP, Table for 5, or anything you name yourself.",
  },
  {
    icon: QrCode,
    title: "QR Check-in",
    description:
      "Every ticket carries a signed QR code. Scan at the door and get an instant valid, used, or void result — no spreadsheets.",
  },
  {
    icon: Vote,
    title: "Voting & Nominations",
    description:
      "Launch a voting campaign, add nominees with photos, and set a price per vote in minutes.",
  },
  {
    icon: BarChart3,
    title: "Organizer Analytics",
    description:
      "Revenue, tickets sold, and check-in rate on one screen — updated as it happens, not at the end of the night.",
  },
  {
    icon: Radio,
    title: "Real-time Sales Tracking",
    description:
      "Watch sales and votes stream in live across every section and ticket type, powered by Supabase realtime.",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-slate-50 py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-500">
            Features
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-ink-800 sm:text-4xl">
            Everything an event needs, nothing it doesn't
          </h2>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-domni-gradient text-white">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-ink-800">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
