"use client";

import { motion } from "framer-motion";
import { ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TicketCard } from "@/components/ui/ticket-card";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink-800 pb-24 pt-40">
      {/* Ambient gradient glow */}
      <div className="pointer-events-none absolute inset-0 bg-domni-radial" />
      <div className="pointer-events-none absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-violet-500/20 blur-[120px]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-violet-300">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-pulse" />
            Built for campus organizers
          </span>

          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.1] text-white sm:text-5xl lg:text-6xl">
            Powering Campus Experiences
          </h1>

          <p className="mt-6 max-w-lg text-lg text-slate-400">
            Create events, sell tickets, manage nominations, and run
            unforgettable experiences with DOMNI.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button size="lg" className="flex items-center gap-2">
              <a href="/login"> Create Event
</a>
            </Button>
            <Button size="lg" variant="ghost">
              <a href="/events" className="flex items-center gap-2">
                <Compass className="h-4 w-4" /> Explore Events
              </a>
            </Button>
          </div>

          <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
            <div>
              <p className="font-display text-2xl font-semibold text-white">12k+</p>
              <p>Tickets issued</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="font-display text-2xl font-semibold text-white">340+</p>
              <p>Campus events</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="font-display text-2xl font-semibold text-white">98%</p>
              <p>Check-in accuracy</p>
            </div>
          </div>
        </motion.div>

        {/* Floating ticket + dashboard mock */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="relative h-[440px]"
        >
          <div className="absolute right-0 top-0 w-[300px] animate-float">
            <TicketCard
              eventTitle="Faculty Dinner"
              sectionLabel="Awards Night · VIP"
              holderName="Ada Nwosu"
              code="DMN-7F3K21"
            />
          </div>

          <div
            className="absolute left-0 top-24 w-[280px] animate-float"
            style={{ animationDelay: "1.2s" }}
          >
            <TicketCard
              eventTitle="Freshers Night"
              sectionLabel="After Party · Regular"
              code="DMN-9Q1A88"
              accent="pulse"
            />
          </div>

          {/* Mini dashboard preview card */}
          <div className="absolute bottom-0 right-6 w-[320px] rounded-2xl border border-white/10 bg-ink-700/80 p-5 shadow-glow backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Live sales
              </p>
              <span className="flex items-center gap-1.5 text-xs text-pulse">
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-pulse" />
                Live
              </span>
            </div>
            <p className="mt-2 font-display text-3xl font-semibold text-white">
              ₦2,480,000
            </p>
            <div className="mt-4 flex items-end gap-1.5">
              {[40, 65, 50, 80, 60, 95, 70].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-domni-gradient"
                  style={{ height: `${h}px`, opacity: 0.5 + i * 0.07 }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
