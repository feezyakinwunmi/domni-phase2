import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Clock } from "lucide-react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/errors";
import { formatDate, formatTime } from "@/lib/format";
import TicketRenderer from "@/components/tickets/TicketRenderer";
import type { TicketCustomization } from "@/components/tickets/types";
import { TicketActions } from "./TicketActions";
import { DownloadableTicket } from "@/components/tickets/DownloadableTicket";

export const metadata = { title: "Your tickets — DOMNI", robots: { index: false } };

const ticketInclude = {
  ticketType: { include: { ticketTemplate: true, section: { include: { event: true } } } },
  registration_answers: { include: { registration_fields: true } },
} satisfies Prisma.TicketInclude;

type TicketWithRelations = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;

async function loadTickets(params: { id?: string; order?: string }) {
  if (params.order) {
    const transaction = await prisma.transaction.findUnique({
      where: { reference: params.order },
      select: { id: true, status: true, type: true },
    });
    if (!transaction || transaction.type !== "TICKET_PURCHASE") return null;

    const tickets = await prisma.ticket.findMany({
      where: { transactionId: transaction.id },
      include: ticketInclude,
      orderBy: { createdAt: "asc" },
    });
    return { tickets, pending: transaction.status === "PENDING" || (transaction.status === "SUCCESSFUL" && tickets.length === 0) };
  }

  // Legacy single-ticket links; malformed ids would otherwise crash Prisma (P2023).
  if (!isUuid(params.id)) return null;
  const ticket = await prisma.ticket.findUnique({ where: { id: params.id }, include: ticketInclude });
  return ticket ? { tickets: [ticket], pending: false } : null;
}

async function toRenderData(ticket: TicketWithRelations) {
  const event = ticket.ticketType.section.event;
  const qr = await QRCode.toDataURL(ticket.qrCode, { margin: 1, width: 320, errorCorrectionLevel: "M" });

  return {
    id: ticket.id,
    status: ticket.status,
    templateKey: ticket.ticketType.ticketTemplate?.templateKey ?? null,
    customization: ticket.ticketType.templateCustomization as TicketCustomization | null,
    data: {
      eventName: event.title,
      attendeeName: ticket.holderName || ticket.guestName || "Guest",
      ticketType: ticket.ticketType.title,
      date: `${formatDate(event.startsAt, { year: undefined })} · ${formatTime(event.startsAt)}`,
      venue: event.venue || "Venue TBA",
      qr,
      ticketNumber: ticket.ticketNumber,
      photoUrl: ticket.photoUrl,
      extraFields: [...ticket.registration_answers]
        .sort((a, b) => (a.registration_fields.sortOrder ?? 0) - (b.registration_fields.sortOrder ?? 0))
        // The photo is shown as the holder picture, not as a text row.
        .filter((a) => a.value && a.registration_fields.type !== "photo")
        .map((a) => ({ label: a.registration_fields.label, value: a.value as string })),
    },
  };
}

export default async function TicketSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; order?: string }>;
}) {
  const params = await searchParams;
  const result = await loadTickets(params);
  if (!result) notFound();

  if (result.pending) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 text-center">
        {/* Re-check every few seconds while Paystack's webhook settles the payment. */}
        <meta httpEquiv="refresh" content="5" />
        <Clock className="h-10 w-10 animate-pulse text-violet-500" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Confirming your payment…</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          This usually takes a few seconds. This page refreshes automatically — please don't pay again.
        </p>
        <p className="mt-4 font-mono text-xs text-slate-400">Ref: {params.order}</p>
      </main>
    );
  }

  const tickets = await Promise.all(result.tickets.map(toRenderData));
  const event = result.tickets[0].ticketType.section.event;

  return (
    <main className="min-h-screen bg-slate-100 px-2 py-10 print:bg-white print:p-0">
      <div className="mx-auto mb-8 max-w-xl text-center print:hidden">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">You're in 🎉</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          {tickets.length > 1 ? `Your ${tickets.length} tickets` : "Your ticket"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Show the QR code at the entrance. Bookmark this page or save it as a PDF — it's your proof of entry.
        </p>
      </div>

      <div className="flex flex-col items-center gap-10">
        {tickets.map((t, i) => (
          <section key={t.id} className="flex flex-col items-center print:break-after-page" aria-label={`Ticket ${i + 1}`}>
            {tickets.length > 1 && (
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400 print:hidden">
                Ticket {i + 1} of {tickets.length}
              </p>
            )}
            {t.status !== "VALID" && (
              <p className="mb-3 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                {t.status === "CHECKED_IN" ? "Already checked in" : `This ticket is ${t.status.toLowerCase()}`}
              </p>
            )}
            <div className="max-w-full overflow-x-auto">
              <DownloadableTicket index={i} filename={`${event.title}-${t.data.ticketNumber ?? i + 1}`}>
                <TicketRenderer templateKey={t.templateKey} customization={t.customization} data={t.data} />
              </DownloadableTicket>
            </div>
          </section>
        ))}
      </div>

      <div className="mx-auto mt-8 w-full max-w-md print:hidden">
        <TicketActions eventTitle={event.title} count={tickets.length} />
        <Link href={`/events/${event.slug}`} className="mt-4 block text-center text-sm text-slate-500 hover:text-violet-600">
          Back to event page
        </Link>
      </div>
    </main>
  );
}
