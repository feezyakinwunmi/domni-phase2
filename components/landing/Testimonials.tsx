"use client";

import { motion } from "framer-motion";

const testimonials = [
  {
    quote:
      "We sold out our faculty dinner in three days and never touched a spreadsheet once. Check-in at the door took seconds per guest.",
    name: "Funmilayo A.",
    role: "Events Lead, Faculty of Engineering",
  },
  {
    quote:
      "The voting campaign for our Most Influential Student award felt like a real product, not a Google Form. Turnout doubled.",
    name: "David O.",
    role: "President, Student Union",
  },
  {
    quote:
      "Setting up custom ticket tiers for our after-party — couples pass, table for five — took minutes, not a back-and-forth with a developer.",
    name: "Zainab M.",
    role: "Organizer, Freshers Week Committee",
  },
];

export function Testimonials() {
  return (
    <section className="bg-slate-50 py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-500">
            From organizers
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-ink-800 sm:text-4xl">
            Trusted at the door and on the books
          </h2>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-2xl border border-slate-100 bg-white p-7 shadow-soft"
            >
              <blockquote className="text-sm leading-relaxed text-slate-600">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-6">
                <p className="font-display text-sm font-semibold text-ink-800">
                  {t.name}
                </p>
                <p className="text-xs text-slate-400">{t.role}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
