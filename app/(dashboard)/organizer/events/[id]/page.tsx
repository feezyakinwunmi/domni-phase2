import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Eye,
  Calendar,
  MapPin,
  Ticket,
  Users,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PublishButton } from "@/components/events/publish-button";
import { DeleteButton } from "@/components/events/delete-button";
import { QrCode } from "lucide-react";


interface EventPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    created?: string;
  }>;
}

export default async function OrganizerEventPage({
  params,
  searchParams,
}: EventPageProps) {
  const { id } = await params;
  const { created } = await searchParams;
  const event = await prisma.event.findUnique({
    where: {
      id,
    },
    include: {
      sections: {
        include: {
          ticketTypes: true,
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const totalTickets = event.sections.reduce((acc, section) => {
    return (
      acc +
      section.ticketTypes.reduce((ticketAcc, ticket) => {
        return ticketAcc + ticket.quantity;
      }, 0)
    );
  }, 0);

  const totalSold = event.sections.reduce((acc, section) => {
    return (
      acc +
      section.ticketTypes.reduce((ticketAcc, ticket) => {
        return ticketAcc + ticket.quantitySold;
      }, 0)
    );
  }, 0);

  const remainingTickets = totalTickets - totalSold;

  const totalRevenue = event.sections.reduce((acc, section) => {
    return (
      acc +
      section.ticketTypes.reduce((ticketAcc, ticket) => {
        return ticketAcc + ticket.priceKobo * ticket.quantitySold;
      }, 0)
    );
  }, 0);

  return (
    <main className="min-h-screen bg-slate-50  py-10">
      <div className="">
        {/* Top Navigation */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="flex flex-wrap gap-3">
            <Link href={`/organizer/events/${event.id}/edit`}>
              <Button variant="secondary" className="gap-2">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>

           <PublishButton
  eventId={event.id}
  status={event.status}
/>

         <DeleteButton eventId={event.id} />
          </div>
        </div>

        {/* Success Banner */}
        {created === "true" && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            🎉 Event created successfully.
          </div>
        )}

        {/* Main Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {/* Cover */}
          {event.coverImage && (
            <img
              src={event.coverImage}
              alt={event.title}
              className="h-80 w-full object-cover"
            />
          )}

          <div className="px-4 py-8 md:px-8">
            {/* Header */}
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
                    {event.status}
                  </span>

                  {remainingTickets > 0 ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Registration Open
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                      Sold Out
                    </span>
                  )}
                </div>

                <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
                  {event.title}
                </h1>

                <p className="mt-4 text-base leading-7 text-slate-600">
                  {event.description}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
                    <Ticket className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm text-slate-500">
                      Total Tickets
                    </p>

                    <h2 className="mt-1 text-2xl font-bold text-slate-900">
                      {totalTickets}
                    </h2>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                    <Users className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm text-slate-500">
                      Tickets Sold
                    </p>

                    <h2 className="mt-1 text-2xl font-bold text-slate-900">
                      {totalSold}
                    </h2>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
                    <Ticket className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm text-slate-500">
                      Remaining
                    </p>

                    <h2 className="mt-1 text-2xl font-bold text-slate-900">
                      {remainingTickets}
                    </h2>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div>
                  <p className="text-sm text-slate-500">
                    Revenue
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    ₦{(totalRevenue / 100).toLocaleString()}
                  </h2>
                </div>
              </div>
            </div>

            {/* Event Info */}
            <div className="mt-8 grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-3">
              <div>
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-wide">
                    Venue
                  </p>
                </div>

                <p className="mt-2 font-medium text-slate-900">
                  {event.venue || "Not specified"}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-wide">
                    Starts
                  </p>
                </div>

                <p className="mt-2 font-medium text-slate-900">
                  {new Date(event.startsAt).toLocaleString()}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-wide">
                    Ends
                  </p>
                </div>

                <p className="mt-2 font-medium text-slate-900">
                  {event.endsAt
                    ? new Date(event.endsAt).toLocaleString()
                    : "Not specified"}
                </p>
              </div>
            </div>

            {/* Sections */}
            <div className="mt-12 space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  Sections & Tickets
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Ticket inventory, sales, and pricing breakdown.
                </p>
              </div>

              {event.sections.map((section) => (
                <div
                  key={section.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="mb-5">
                    <h3 className="text-xl font-semibold text-slate-900">
                      {section.title}
                    </h3>

                    {section.description && (
                      <p className="mt-1 text-sm text-slate-600">
                        {section.description}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {section.ticketTypes.map((ticket) => {
                      const remaining =
                        ticket.quantity - ticket.quantitySold;

                      return (
                        <div
                          key={ticket.id}
                          className="rounded-xl border border-slate-200 bg-white p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="text-lg font-semibold text-slate-900">
                                {ticket.title}
                              </h4>

                              {ticket.description && (
                                <p className="mt-1 text-sm text-slate-500">
                                  {ticket.description}
                                </p>
                              )}
                            </div>

                            <div className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700">
                              ₦
                              {(ticket.priceKobo / 100).toLocaleString()}
                            </div>
                          </div>

                          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-slate-400">
                                Quantity
                              </p>

                              <p className="mt-1 font-semibold text-slate-900">
                                {ticket.quantity}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-slate-400">
                                Sold
                              </p>

                              <p className="mt-1 font-semibold text-slate-900">
                                {ticket.quantitySold}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-slate-400">
                                Remaining
                              </p>

                              <p className="mt-1 font-semibold text-slate-900">
                                {remaining}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-slate-400">
                                Max Per Buyer
                              </p>

                              <p className="mt-1 font-semibold text-slate-900">
                                {ticket.maxPerBuyer || "Unlimited"}
                              </p>
                            </div>
                          </div>

                          {ticket.perks?.length > 0 && (
                            <div className="mt-5">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Perks
                              </p>

                              <div className="flex flex-wrap gap-2">
                                {ticket.perks.map((perk: string) => (
                                  <span
                                    key={perk}
                                    className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700"
                                  >
                                    {perk}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}   
              <Link
  href={`/organizer/events/${event.id}/scanner`}
  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
>
  <QrCode className="h-5 w-5" />
  Scan Tickets
</Link>
            </div>
         
          </div>

        </div>

        
      </div>
    </main>
  );
}