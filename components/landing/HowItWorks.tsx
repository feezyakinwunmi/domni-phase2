"use client";

import { motion } from "framer-motion";

const steps = [
  {
    label: "Set up your event",
    description:
      "Name it, add sections like Awards Night or After Party, and set your dates and venue.",
  },
  {
    label: "Add ticket types",
    description:
      "Pick from presets or type your own — Early Bird, VIP, Couples Pass, whatever fits.",
  },
  {
    label: "Open sales",
    description:
      "Publish and share your event link. Watch sales, votes, and check-ins update live.",
  },
  {
    label: "Check people in",
    description:
      "Scan tickets at the door with any phone camera — no extra hardware required.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-500">
            How it works
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-ink-800 sm:text-4xl">
            From idea to sold-out in four steps
          </h2>
        </div>

        <div className="relative mt-16 grid gap-10 md:grid-cols-4">
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-slate-100 md:block" />
          {steps.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative"
            >
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-domni-gradient font-display text-sm font-bold text-white">
                {i + 1}
              </div>
              <h3 className="mt-5 font-display text-base font-semibold text-ink-800">
                {step.label}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
