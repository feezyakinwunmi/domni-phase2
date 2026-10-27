import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Ticket,
  ArrowLeft,
} from "lucide-react";
import { TicketModal } from "@/components/events/TicketModal";
interface EventDetailsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function EventDetailsPage({
  params,
}: EventDetailsPageProps) {
const { slug } = await params;
const event = await prisma.event.findFirst({
  where: {
    slug,
    status: "PUBLISHED",
  },

  include: {
    registrationFields: {
      orderBy: {
        sortOrder: "asc",
      },
    },

    sections: {
      orderBy: {
        sortOrder: "asc",
      },

      include: {
        ticketTypes: true,
      },
    },
  },
});

  if (!event) {
    return notFound();
  }

  const now = new Date();

  const hasEnded =
    event.endsAt &&
    new Date(event.endsAt) < now;

  const hasStarted =
    new Date(event.startsAt) <= now;

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <div className="mx-auto max-w-7xl">
        <div className="p-4 pt-6">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to events
          </Link>
        </div>

        <div className="overflow-hidden border-y border-slate-200 bg-white">
          {event.coverImage ? (
            <img
              src={event.coverImage}
              alt={event.title}
              className="h-[320px] w-full object-cover md:h-[500px]"
            />
          ) : (
            <div className="flex h-[320px] items-center justify-center bg-slate-100 text-slate-400 md:h-[500px]">
              No cover image
            </div>
          )}
        </div>

        <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-10 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700">
                {event.schoolName || "Campus Event"}
              </span>

              <span
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                  hasEnded
                    ? "bg-slate-100 text-slate-600"
                    : hasStarted
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {hasEnded
                  ? "Event Ended"
                  : hasStarted
                  ? "Event Live"
                  : "Upcoming"}
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
              {event.title}
            </h1>

            <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 md:flex-row md:flex-wrap md:items-center">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-violet-500" />

                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Date
                  </p>

                  <p className="text-sm font-semibold text-slate-900">
                    {new Date(
                      event.startsAt
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-violet-500" />

                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Time
                  </p>

                  <p className="text-sm font-semibold text-slate-900">
                    {new Date(
                      event.startsAt
                    ).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-violet-500" />

                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Venue
                  </p>

                  <p className="text-sm font-semibold text-slate-900">
                    {event.venue || "Venue TBA"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <h2 className="text-2xl font-bold text-slate-900">
                About this event
              </h2>

              <p className="mt-4 whitespace-pre-line leading-8 text-slate-600">
                {event.description}
              </p>
            </div>

            <div className="mt-14 space-y-8">
              {event.sections.map((section) => (
                <div
                  key={section.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6"
                >
                  <div className="mb-5">
                    <h3 className="text-2xl font-bold text-slate-900">
                      {section.title}
                    </h3>

                    {section.description && (
                      <p className="mt-2 text-slate-500">
                        {section.description}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    {section.ticketTypes.map((ticket) => {
                      const remaining =
                        ticket.quantity -
                        ticket.quantitySold;

                      const soldOut =
                        remaining <= 0;

                      return (
                        <div
                          key={ticket.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="text-xl font-bold text-slate-900">
                                {ticket.title}
                              </h4>

                              {ticket.description && (
                                <p className="mt-1 text-sm text-slate-500">
                                  {ticket.description}
                                </p>
                              )}
                            </div>

                            <div className="rounded-full bg-violet-100 px-4 py-1.5 text-sm font-bold text-violet-700">
                              ₦
                              {(
                                ticket.priceKobo / 100
                              ).toLocaleString()}
                            </div>
                          </div>

                          <div className="mt-5 flex items-center justify-between rounded-xl bg-white px-4 py-3">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-400">
                                Remaining Tickets
                              </p>

                              <p className="mt-1 text-lg font-bold text-slate-900">
                                {remaining}
                              </p>
                            </div>

                            <div
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                soldOut
                                  ? "bg-red-50 text-red-600"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {soldOut
                                ? "Sold Out"
                                : "Available"}
                            </div>
                          </div>

                          {ticket.perks?.length > 0 && (
                            <div className="mt-5">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Includes
                              </p>

                              <div className="flex flex-wrap gap-2">
                                {ticket.perks.map(
                                  (perk: string) => (
                                    <span
                                      key={perk}
                                      className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700"
                                    >
                                      {perk}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          )}

<TicketModal
  ticketTypeId={String(ticket.id)}
  ticketTitle={String(ticket.title)}
  priceKobo={ticket.priceKobo}
  disabled={soldOut || !!hasEnded}
  registrationFields={event.registrationFields.map((field) => ({
    id: field.id,
    label: field.label,
    type: field.type,
    placeholder: field.placeholder ?? undefined,
    required: field.required ?? false,
    options: Array.isArray(field.options)
      ? (field.options as unknown[]).map((x) => String(x))
      : [],
  }))}
/>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="sticky top-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">
                Event Summary
              </h3>

              <div className="mt-6 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">
                    School
                  </span>

                  <span className="font-semibold text-slate-900">
                    {event.schoolName || "N/A"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">
                    Venue
                  </span>

                  <span className="font-semibold text-slate-900">
                    {event.venue || "TBA"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">
                    Starts
                  </span>

                  <span className="font-semibold text-slate-900">
                    {new Date(
                      event.startsAt
                    ).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">
                    Ticket Types
                  </span>

                  <span className="font-semibold text-slate-900">
                    {event.sections.reduce(
                      (sum, section) => sum + section.ticketTypes.length,
                      0
                    )}
                  </span>
                </div>
              </div>

              <button className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-semibold text-white hover:bg-violet-700">
                <Ticket className="h-4 w-4" />
                Buy Tickets
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}