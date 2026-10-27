"use client";

import { motion } from "framer-motion";

const nominees = [
  { name: "Chidinma A.", votes: 4820, percent: 82 },
  { name: "Tobi O.", votes: 3010, percent: 51 },
  { name: "Blessing E.", votes: 2140, percent: 36 },
];

export function VotingShowcase() {
  return (
    <section id="voting" className="bg-ink-800 py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-violet-300">
              Voting
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
              A leaderboard that updates the moment a vote lands
            </h2>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-pulse">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-pulse" />
            Most Influential Student · closes in 2d 4h
          </span>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {nominees.map((nominee, i) => (
            <motion.div
              key={nominee.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-white/10 bg-ink-700/60 p-6 backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-domni-gradient font-display text-sm font-semibold text-white">
                  {nominee.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="font-display text-base font-semibold text-white">
                    {nominee.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {nominee.votes.toLocaleString()} votes
                  </p>
                </div>
              </div>

              <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${nominee.percent}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.2 + i * 0.1, ease: "easeOut" }}
                  className="h-full rounded-full bg-domni-gradient"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
