import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Building2, MapPin, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatNaira, formatTime } from "@/lib/format";
import { parseEventDetails } from "@/lib/event-details";
import { EventCommentsSheet } from "@/components/events/EventCommentsSheet";
import { Navbar } from "@/components/landing/Navbar";

export const metadata: Metadata = {
  title: "Discover events — DOMNI",
  description: "Find campus events, shows, conferences and experiences, and get your tickets in seconds.",
};

interface EventsPageProps {
  searchParams: Promise<{ search?: string; school?: string }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const { search = "", school = "" } = await searchParams;
  const now = new Date();

  const where: Prisma.EventWhereInput = {
    status: "PUBLISHED",
    OR: [{ endsAt: { gte: now } }, { endsAt: null, startsAt: { gte: new Date(now.getTime() - 86_400_000) } }],
    AND: [
      search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { venue: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
      school ? { schoolName: { contains: school, mode: "insensitive" } } : {},
    ],
  };

  const events = await prisma.event.findMany({
    where,
    orderBy: [{ featured: "desc" }, { startsAt: "asc" }],
    include: {
      sections: { include: { ticketTypes: { select: { priceKobo: true, quantity: true, quantitySold: true } } } },
      _count: { select: { event_comments: true } },
    },
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      <section className="relative overflow-hidden bg-ink-800 px-4 pb-16 pt-32 text-white">
        <div className="pointer-events-none absolute inset-0 bg-domni-radial" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-300">Discover</p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold tracking-tight md:text-5xl">What&apos;s happening next</h1>
          <p className="mt-3 max-w-xl text-white/60">Shows, conferences, parties and campus experiences — get your ticket in seconds.</p>

          <form className="mt-8 grid max-w-3xl gap-3 rounded-2xl bg-white/10 p-2 backdrop-blur md:grid-cols-[1fr_220px_auto]" role="search">
            <label className="relative">
              <span className="sr-only">Search events</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="search"
                defaultValue={search}
                placeholder="Search events, venues…"
                className="h-12 w-full rounded-xl bg-white pl-11 pr-4 text-sm text-ink-800 outline-none placeholder:text-slate-400"
              />
            </label>
            <label>
              <span className="sr-only">School or organization</span>
              <input
                name="school"
                defaultValue={school}
                placeholder="School / organization"
                className="h-12 w-full rounded-xl bg-white px-4 text-sm text-ink-800 outline-none placeholder:text-slate-400"
              />
            </label>
            <button className="h-12 rounded-xl bg-domni-gradient px-6 text-sm font-semibold text-white hover:brightness-110">Search</button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12">
        <p className="mb-6 text-sm text-slate-500">
          {events.length} event{events.length === 1 ? "" : "s"}
          {search || school ? " matching your search" : " coming up"}
          {(search || school) && (
            <Link href="/events" className="ml-2 font-medium text-violet-600 hover:underline">
              Clear
            </Link>
          )}
        </p>

        {events.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center">
            <p className="text-lg font-semibold text-ink-800">No events found</p>
            <p className="mt-2 text-sm text-slate-500">Try another keyword, or check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => {
              const details = parseEventDetails(event.details);
              const tts = event.sections.flatMap((s) => s.ticketTypes);
              const minPrice = tts.length ? Math.min(...tts.map((t) => t.priceKobo)) : null;
              const soldOut = tts.length > 0 && tts.every((t) => t.quantitySold >= t.quantity);
              const start = event.startsAt;

              return (
                <article key={event.id} className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-soft">
                  <Link href={`/events/${event.slug}`} className="flex flex-1 flex-col">
                    <div className="relative aspect-[16/10] overflow-hidden bg-domni-gradient">
                      {event.coverImage ? (
                        <img src={event.coverImage} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full items-center justify-center p-6 text-center font-display text-2xl font-bold text-white/90">{event.title}</div>
                      )}
                      <div className="absolute left-4 top-4 rounded-xl bg-white px-3 py-1.5 text-center leading-tight shadow">
                        <p className="text-[10px] font-bold uppercase text-violet-600">
                          {start.toLocaleDateString("en-NG", { month: "short", timeZone: "Africa/Lagos" })}
                        </p>
                        <p className="text-xl font-bold text-ink-800">{start.toLocaleDateString("en-NG", { day: "numeric", timeZone: "Africa/Lagos" })}</p>
                      </div>
                      {event.featured && (
                        <span className="absolute right-4 top-4 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-ink-900">Featured</span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <h2 className="line-clamp-2 text-lg font-bold text-ink-800 group-hover:text-violet-700">{event.title}</h2>
                      <div className="mt-2 space-y-1 text-sm text-slate-500">
                        <p>
                          {start.toLocaleDateString("en-NG", { weekday: "short", timeZone: "Africa/Lagos" })} · {formatTime(start)}
                        </p>
                        {event.venue && (
                          <p className="flex items-center gap-1.5 truncate">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" /> {event.venue}
                          </p>
                        )}
                        {event.schoolName && (
                          <p className="flex items-center gap-1.5 truncate">
                            <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="sr-only">{details.hostLabel}:</span> {event.schoolName}
                          </p>
                        )}
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-5">
                        <span className="text-sm font-semibold text-ink-800">
                          {soldOut ? (
                            <span className="text-red-600">Sold out</span>
                          ) : minPrice === null ? (
                            ""
                          ) : minPrice === 0 ? (
                            "Free"
                          ) : (
                            <>From {formatNaira(minPrice)}</>
                          )}
                        </span>
                        <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition group-hover:bg-violet-600 group-hover:text-white">
                          Get tickets
                        </span>
                      </div>
                    </div>
                  </Link>

                  <div className="border-t border-slate-100">
                    <EventCommentsSheet eventId={event.id} eventTitle={event.title} count={event._count.event_comments} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
