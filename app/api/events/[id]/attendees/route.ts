import { prisma } from "@/lib/prisma";
import { requireEventOwner } from "@/lib/auth";
import { toUserMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { parseEventDetails } from "@/lib/event-details";

function csvCell(value: unknown) {
  const s = value == null ? "" : String(value);
  // Prefix formula-looking values so Excel doesn't execute them.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** CSV export of everyone registered for an event, including custom form answers. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireEventOwner(id);
    if (!auth.ok) return new Response(auth.error, { status: 403 });

    const event = await prisma.event.findUniqueOrThrow({
      where: { id },
      select: { slug: true, details: true, registrationFields: { orderBy: { sortOrder: "asc" } } },
    });
    const details = parseEventDetails(event.details);

    const tickets = await prisma.ticket.findMany({
      where: { ticketType: { section: { eventId: id } } },
      orderBy: { createdAt: "asc" },
      include: { ticketType: { select: { title: true, priceKobo: true } }, registration_answers: true },
    });

    const header = [
      "Ticket number",
      details.nameLabel,
      details.emailLabel,
      "Ticket type",
      "Price (₦)",
      "Status",
      "Registered at",
      "Checked in at",
      ...event.registrationFields.map((f) => f.label),
    ];

    const rows = tickets.map((t) => {
      const answers = new Map(t.registration_answers.map((a) => [a.fieldId, a.value]));
      return [
        t.ticketNumber ?? t.id.slice(0, 8),
        t.holderName ?? t.guestName,
        t.guestEmail,
        t.ticketType.title,
        t.ticketType.priceKobo / 100,
        t.status,
        formatDateTime(t.createdAt),
        t.checkedInAt ? formatDateTime(t.checkedInAt) : "",
        ...event.registrationFields.map((f) => answers.get(f.id) ?? ""),
      ];
    });

    const csv = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${event.slug}-attendees.csv"`,
      },
    });
  } catch (err) {
    return new Response(toUserMessage(err, "Export failed."), { status: 500 });
  }
}
