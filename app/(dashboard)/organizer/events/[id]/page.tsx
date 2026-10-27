import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Download,
  ExternalLink,
  MapPin,
  Pencil,
  QrCode,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isUuid } from "@/lib/errors";
import { formatDateTime, formatNaira } from "@/lib/format";
import { parseEventDetails } from "@/lib/event-details";
import { Button } from "@/components/ui/button";
import { PublishButton } from "@/components/events/publish-button";
import { DeleteButton } from "@/components/events/delete-button";

interface EventPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string }>;
}

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  DRAFT: "bg-amber-100 text-amber-700",
  ENDED: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-red-100 text-red-700",
};

const TICKET_STATUS_STYLES: Record<string, string> = {
  VALID: "bg-slate-100 text-slate-600",
  CHECKED_IN: "bg-emerald-100 text-emerald-700",
  REFUNDED: "bg-amber-100 text-amber-700",
  VOID: "bg-red-100 text-red-700",
};

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-3 ${tone}`}>{icon}</div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default async function OrganizerEventPage({ params, searchParams }: EventPageProps) {
  const { id } = await params;
  const { created, updated } = await searchParams;
  if (!isUuid(id)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectedFrom=/organizer/events/${id}`);

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { ticketTypes: { orderBy: { createdAt: "asc" } } },
      },
      registrationFields: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!event || event.organizerId !== user.id) notFound();

  const [attendees, attendeeCount, checkedIn] = await Promise.all([
    prisma.ticket.findMany({
      where: { ticketType: { section: { eventId: id } } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { ticketType: { select: { title: true } }, registration_answers: true },
    }),
    prisma.ticket.count({ where: { ticketType: { section: { eventId: id } } } }),
    prisma.ticket.count({ where: { ticketType: { section: { eventId: id } }, status: "CHECKED_IN" } }),
  ]);

  const details = parseEventDetails(event.details);
  const ticketTypes = event.sections.flatMap((s) => s.ticketTypes);
  const totalTickets = ticketTypes.reduce((n, t) => n + t.quantity, 0);
  const totalSold = ticketTypes.reduce((n, t) => n + t.quantitySold, 0);
  const totalRevenue = ticketTypes.reduce((n, t) => n + t.priceKobo * t.quantitySold, 0);
  const shownFields = event.registrationFields.filter((f) => f.type !== "photo").slice(0, 3);

  return (
    <main className="min-h-screen bg-slate-50 py-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <Link
          href="/dashboard"
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="flex flex-wrap items-start gap-3">
          {event.status === "PUBLISHED" && (
            <Link href={`/events/${event.slug}`} target="_blank">
              <Button variant="secondary" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View public page
              </Button>
            </Link>
          )}
          <Link href={`/organizer/events/${event.id}/edit`}>
            <Button variant="secondary" className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </Link>
          <PublishButton eventId={event.id} status={event.status} />
          <DeleteButton eventId={event.id} />
        </div>
      </div>

      {(created === "true" || updated === "true") && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {created === "true"
            ? "🎉 Event created as a draft. Publish it when you're ready for people to register."
            : "✅ Changes saved."}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {event.coverImage && <img src={event.coverImage} alt="" className="h-64 w-full object-cover md:h-80" />}

        <div className="px-4 py-8 md:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[event.status] ?? ""}`}>
              {event.status}
            </span>
            {event.schoolName && (
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                {details.hostLabel}: {event.schoolName}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{event.title}</h1>
          {event.description && <p className="mt-4 whitespace-pre-line text-base leading-7 text-slate-600">{event.description}</p>}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={<Ticket className="h-5 w-5" />} label="Sold / capacity" value={`${totalSold} / ${totalTickets}`} tone="bg-violet-100 text-violet-700" />
            <Stat icon={<Users className="h-5 w-5" />} label="Registrations" value={attendeeCount} tone="bg-sky-100 text-sky-700" />
            <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Checked in" value={checkedIn} tone="bg-emerald-100 text-emerald-700" />
            <Stat icon={<Wallet className="h-5 w-5" />} label="Gross revenue" value={formatNaira(totalRevenue).replace("Free", "₦0")} tone="bg-amber-100 text-amber-700" />
          </div>

          <div className="mt-8 grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="h-4 w-4" />
                <p className="text-xs uppercase tracking-wide">{details.venueLabel}</p>
              </div>
              <p className="mt-2 font-medium text-slate-900">{event.venue || "Not specified"}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="h-4 w-4" />
                <p className="text-xs uppercase tracking-wide">Starts</p>
              </div>
              <p className="mt-2 font-medium text-slate-900">{formatDateTime(event.startsAt)}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="h-4 w-4" />
                <p className="text-xs uppercase tracking-wide">Ends</p>
              </div>
              <p className="mt-2 font-medium text-slate-900">{event.endsAt ? formatDateTime(event.endsAt) : "Not specified"}</p>
            </div>
            {details.extras.map((x) => (
              <div key={x.id}>
                <p className="text-xs uppercase tracking-wide text-slate-400">{x.label}</p>
                <p className="mt-2 font-medium text-slate-900">{x.value}</p>
              </div>
            ))}
          </div>

          {/* Sections */}
          <div className="mt-12 space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Sections & tickets</h2>
                <p className="mt-1 text-sm text-slate-500">Inventory, sales and pricing.</p>
              </div>
              <Link
                href={`/organizer/events/${event.id}/scanner`}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
              >
                <QrCode className="h-5 w-5" />
                Scan tickets
              </Link>
            </div>

            {event.sections.map((section) => (
              <div key={section.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-xl font-semibold text-slate-900">{section.title}</h3>
                {section.description && <p className="mt-1 text-sm text-slate-600">{section.description}</p>}

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {section.ticketTypes.map((ticket) => {
                    const pct = ticket.quantity ? Math.round((ticket.quantitySold / ticket.quantity) * 100) : 0;
                    return (
                      <div key={ticket.id} className="rounded-xl border border-slate-200 bg-white p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-lg font-semibold text-slate-900">{ticket.title}</h4>
                            {ticket.description && <p className="mt-1 text-sm text-slate-500">{ticket.description}</p>}
                          </div>
                          <div className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700">
                            {formatNaira(ticket.priceKobo)}
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>{ticket.quantitySold} sold</span>
                            <span>{ticket.quantity - ticket.quantitySold} left</span>
                          </div>
                          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="mt-2 text-xs text-slate-400">
                            Max per buyer: {ticket.maxPerBuyer || "No limit"}
                          </p>
                        </div>

                        {ticket.perks.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {ticket.perks.map((perk) => (
                              <span key={perk} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                                {perk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Registrations */}
          <div className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Registrations</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {attendeeCount === 0
                    ? "No one has registered yet."
                    : attendeeCount > attendees.length
                    ? `Showing the latest ${attendees.length} of ${attendeeCount}. Export for the full list.`
                    : `${attendeeCount} registration(s).`}
                </p>
              </div>
              {attendeeCount > 0 && (
                <a
                  href={`/api/events/${event.id}/attendees`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </a>
              )}
            </div>

            {attendees.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">{details.nameLabel}</th>
                      <th className="px-4 py-3 font-medium">{details.emailLabel}</th>
                      <th className="px-4 py-3 font-medium">Ticket</th>
                      {shownFields.map((f) => (
                        <th key={f.id} className="px-4 py-3 font-medium">
                          {f.label}
                        </th>
                      ))}
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {attendees.map((t) => {
                      const answers = new Map(t.registration_answers.map((a) => [a.fieldId, a.value]));
                      return (
                        <tr key={t.id}>
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                            <span className="flex items-center gap-2.5">
                              {t.photoUrl ? (
                                <img src={t.photoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                              ) : (
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                                  {(t.holderName || t.guestName || "?").charAt(0).toUpperCase()}
                                </span>
                              )}
                              {t.holderName || t.guestName || "—"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{t.guestEmail || "—"}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                            {t.ticketType.title}
                            {t.ticketNumber && <span className="ml-2 font-mono text-[11px] text-slate-400">{t.ticketNumber}</span>}
                          </td>
                          {shownFields.map((f) => (
                            <td key={f.id} className="max-w-[200px] truncate px-4 py-3 text-slate-600">
                              {answers.get(f.id) || "—"}
                            </td>
                          ))}
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TICKET_STATUS_STYLES[t.status] ?? ""}`}>
                              {t.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(t.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
