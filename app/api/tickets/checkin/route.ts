import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { qrCode } = await req.json();

  const ticket = await prisma.ticket.findFirst({
    where: {
      qrCode,
    },
    include: {
      ticketType: {
        include: {
          section: {
            include: {
              event: true,
            },
          },
        },
      },
    },
  });

  if (!ticket) {
    return NextResponse.json({
      success: false,
      message: "❌ Invalid Ticket",
    });
  }

  if (ticket.status === "CHECKED_IN") {
    return NextResponse.json({
      success: false,
      message: "⚠ Ticket Already Used",
    });
  }

  await prisma.ticket.update({
    where: {
      id: ticket.id,
    },
    data: {
      status: "CHECKED_IN",
      checkedInAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    message: `✅ Welcome ${ticket.guestName || "Guest"}`,
  });
}