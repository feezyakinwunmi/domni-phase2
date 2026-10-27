import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Building2, CalendarDays, Clock3, MapPin, Ticket } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { TicketModal } from "@/components/events/TicketModal";
import { Navbar } from "@/components/landing/Navbar";
import { EventCommentsSheet } from "@/components/events/EventCommentsSheet";
import { formatDate, formatNaira, formatTime } from "@/lib/format";
import { normalizeOptions, parseEventDetails } from "@/lib/event-details";

interface EventDetailsPageProps {
  params: Promise<{ slug: string }>;
}

function getEvent(slug: string) {
  return prisma.event.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      registrationFields: { orderBy: { sortOrder: "asc" } },
      _count: { select: { event_comments: true } },
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { ticketTypes: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
}

export async function generateMetadata({ params }: EventDetailsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug).catch(() => null);
  if (!event) return { title: "Event not found — DOMNI" };
  return {
    title: `${event.title} — DOMNI`,
    description: event.description?.slice(0, 160) ?? undefined,
    openGraph: event.coverImage ? { images: [event.coverImage] } : undefined,
  };
}

export default async function EventDetailsPage({ params }: EventDetailsPageProps) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const details = parseEventDetails(event.details);
  const now = new Date();
  const effectiveEnd = event.endsAt ?? new Date(event.startsAt.getTime() + 24 * 60 * 60 * 1000);
  const hasEnded = effectiveEnd < now;
  const hasStarted = event.startsAt <= now;

  const registrationFields = event.registrationFields.map((field) => ({
    id: field.id,
    label: field.label,
    type: field.type,
    placeholder: field.placeholder,
    required: field.required ?? false,
    options: normalizeOptions(field.options),
  }));

  const allTickets = event.sections.flatMap((s) => s.ticketTypes);
  const cheapest = allTickets.length ? Math.min(...allTickets.map((t) => t.priceKobo)) : null;

  const infoRows = [
    { icon: <CalendarDays className="h-5 w-5 text-violet-500" />, label: "Date", value: formatDate(event.startsAt) },
    {
      icon: <Clock3 className="h-5 w-5 text-violet-500" />,
      label: "Time",
      value: event.endsAt ? `${formatTime(event.startsAt)} – ${formatTime(event.endsAt)}` : formatTime(event.startsAt),
    },
    { icon: <MapPin className="h-5 w-5 text-violet-500" />, label: details.venueLabel, value: event.venue || "TBA" },
    ...(event.schoolName
      ? [{ icon: <Building2 className="h-5 w-5 text-violet-500" />, label: details.hostLabel, value: event.schoolName }]
      : []),
  ];

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <Navbar />
      <div className="mx-auto max-w-7xl">
        <div className="p-4 pt-28">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to events
          </Link>
        </div>

        <div className="overflow-hidden border-y border-slate-200 bg-white sm:mx-4 sm:rounded-3xl sm:border">
          {event.coverImage ? (
            <img src={event.coverImage} alt="" className="h-[260px] w-full object-cover md:h-[460px]" />
          ) : (
            <div className="flex h-[200px] items-center justify-center bg-domni-gradient text-3xl font-bold text-white/90 md:h-[320px]">
              {event.title}
            </div>
          )}
        </div>

        <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-10 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              {event.schoolName && (
                <span className="rounded-full bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700">{event.schoolName}</span>
              )}
              <span
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                  hasEnded ? "bg-slate-100 text-slate-600" : hasStarted ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {hasEnded ? "Event ended" : hasStarted ? "Happening now" : "Upcoming"}
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">{event.title}</h1>

            <div className="mt-6 grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
              {infoRows.map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  {row.icon}
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">{row.label}</p>
                    <p className="text-sm font-semibold text-slate-900">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {event.description && (
              <div className="mt-10">
                <h2 className="text-2xl font-bold text-slate-900">About this event</h2>
                <p className="mt-4 whitespace-pre-line leading-8 text-slate-600">{event.description}</p>
              </div>
            )}

            {details.extras.length > 0 && (
              <dl className="mt-8 grid gap-3 sm:grid-cols-2">
                {details.extras.map((x) => (
                  <div key={x.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <dt className="text-xs uppercase tracking-wide text-slate-400">{x.label}</dt>
                    <dd className="mt-1 whitespace-pre-line font-medium text-slate-900">{x.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-10">
              <EventCommentsSheet variant="section" eventId={event.id} eventTitle={event.title} count={event._count.event_comments} />
            </div>

            <div id="tickets" className="mt-14 scroll-mt-6 space-y-8">
              {event.sections.map((section) => (
                <div key={section.id} className="rounded-3xl border border-slate-200 bg-white p-6">
                  <div className="mb-5">
                    <h3 className="text-2xl font-bold text-slate-900">{section.title}</h3>
                    {section.description && <p className="mt-2 text-slate-500">{section.description}</p>}
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    {section.ticketTypes.map((ticket) => {
                      const remaining = Math.max(0, ticket.quantity - ticket.quantitySold);
                      const notYet = ticket.salesStartAt && ticket.salesStartAt > now;
                      const closed = ticket.salesEndAt && ticket.salesEndAt < now;
                      const disabledReason = hasEnded
                        ? "Event ended"
                        : remaining === 0
                        ? "Sold out"
                        : notYet
                        ? `On sale ${formatDate(ticket.salesStartAt!)}`
                        : closed
                        ? "Sales closed"
                        : undefined;

                      return (
                        <div key={ticket.id} className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="text-xl font-bold text-slate-900">{ticket.title}</h4>
                              {ticket.description && <p className="mt-1 text-sm text-slate-500">{ticket.description}</p>}
                            </div>
                            <div className="whitespace-nowrap rounded-full bg-violet-100 px-4 py-1.5 text-sm font-bold text-violet-700">
                              {formatNaira(ticket.priceKobo)}
                            </div>
                          </div>

                          {ticket.perks.length > 0 && (
                            <ul className="mt-4 flex flex-wrap gap-2">
                              {ticket.perks.map((perk) => (
                                <li key={perk} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                                  {perk}
                                </li>
                              ))}
                            </ul>
                          )}

                          <p className={`mt-4 text-xs font-medium ${remaining === 0 ? "text-red-600" : remaining <= 10 ? "text-amber-600" : "text-slate-400"}`}>
                            {remaining === 0 ? "Sold out" : remaining <= 10 ? `Only ${remaining} left` : `${remaining} available`}
                          </p>

                          <div className="mt-auto">
                            <TicketModal
                              ticketTypeId={ticket.id}
                              ticketTitle={ticket.title}
                              priceKobo={ticket.priceKobo}
                              remaining={remaining}
                              maxPerBuyer={ticket.maxPerBuyer}
                              disabled={!!disabledReason}
                              disabledReason={disabledReason}
                              registrationFields={registrationFields}
                              nameLabel={details.nameLabel}
                              emailLabel={details.emailLabel}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside>
            <div className="sticky top-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">Event summary</h3>

              <dl className="mt-6 space-y-4 text-sm">
                {infoRows.map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-4">
                    <dt className="text-slate-500">{row.label}</dt>
                    <dd className="text-right font-semibold text-slate-900">{row.value}</dd>
                  </div>
                ))}
                {cheapest !== null && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-500">Tickets from</dt>
                    <dd className="font-semibold text-slate-900">{formatNaira(cheapest)}</dd>
                  </div>
                )}
              </dl>

              <a
                href="#tickets"
                className={`mt-8 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold ${
                  hasEnded ? "pointer-events-none bg-slate-200 text-slate-500" : "bg-violet-600 text-white hover:bg-violet-700"
                }`}
              >
                <Ticket className="h-4 w-4" />
                {hasEnded ? "Event ended" : "Get tickets"}
              </a>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
