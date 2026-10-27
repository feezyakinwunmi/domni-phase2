import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEventOwner } from "@/lib/auth";
import { toUserMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";

export type CheckinResponse = {
  result: "admitted" | "already" | "invalid" | "wrong_event" | "void" | "error";
  message: string;
  attendee?: string;
  ticketType?: string;
  ticketNumber?: string | null;
  photoUrl?: string | null;
  checkedInAt?: string;
};

function reply(body: CheckinResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const qrCode = typeof body?.qrCode === "string" ? body.qrCode.trim() : "";
    const eventId = typeof body?.eventId === "string" ? body.eventId : "";

    const auth = await requireEventOwner(eventId);
    if (!auth.ok) return reply({ result: "error", message: auth.error }, 403);
    if (!qrCode) return reply({ result: "invalid", message: "Empty code" }, 400);

    // Accept either the QR payload or a typed ticket number (DMN-XXXXXXXX).
    const ticket = await prisma.ticket.findFirst({
      where: { OR: [{ qrCode }, { ticketNumber: qrCode.toUpperCase() }] },
      include: { ticketType: { select: { title: true, section: { select: { eventId: true } } } } },
    });

    if (!ticket) return reply({ result: "invalid", message: "Invalid ticket" });

    const info = {
      attendee: ticket.holderName || ticket.guestName || "Guest",
      ticketType: ticket.ticketType.title,
      ticketNumber: ticket.ticketNumber,
      photoUrl: ticket.photoUrl,
    };

    if (ticket.ticketType.section.eventId !== eventId) {
      return reply({ result: "wrong_event", message: "Ticket is for a different event", ...info });
    }
    if (ticket.status === "VOID" || ticket.status === "REFUNDED") {
      return reply({ result: "void", message: `Ticket ${ticket.status.toLowerCase()}`, ...info });
    }

    // Conditional update: two scanners reading the same ticket at once can't both admit it.
    const claimed = await prisma.ticket.updateMany({
      where: { id: ticket.id, status: "VALID" },
      data: { status: "CHECKED_IN", checkedInAt: new Date(), checkedInBy: auth.user.id },
    });

    if (claimed.count === 0) {
      const current = await prisma.ticket.findUnique({ where: { id: ticket.id }, select: { checkedInAt: true } });
      return reply({
        result: "already",
        message: "Already checked in",
        ...info,
        checkedInAt: current?.checkedInAt ? formatDateTime(current.checkedInAt) : undefined,
      });
    }

    return reply({ result: "admitted", message: `Welcome, ${info.attendee}!`, ...info });
  } catch (err) {
    return reply({ result: "error", message: toUserMessage(err, "Check-in failed. Try again.") }, 500);
  }
}
