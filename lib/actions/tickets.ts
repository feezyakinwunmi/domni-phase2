"use server";

import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";
import { nanoid } from "nanoid";
import { calculateSaleFees, type SaleFees } from "@/lib/billing/fees";

type RegistrationDataMap = Record<string, string>;

type TicketPurchaseMetadata = {
  ticketTypeId: string;
  quantity: number;
  email: string;
  name: string;
  registrationData: RegistrationDataMap;
  saleFees?: SaleFees;
};

async function createTicketsForPurchase({
  ticketTypeId,
  quantity,
  email,
  name,
  registrationData,
  transactionId,
}: {
  ticketTypeId: string;
  quantity: number;
  email: string;
  name: string;
  registrationData: RegistrationDataMap;
  transactionId?: string;
}) {
  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
    include: {
      section: {
        include: {
          event: {
            include: { registrationFields: true },
          },
        },
      },
    },
  });

  if (!ticketType) {
    throw new Error("Ticket type not found.");
  }

  const profile = await prisma.profile.findUnique({ where: { email } });
  const registrationFields = ticketType.section.event.registrationFields;

  const createdTicketIds: string[] = [];

  for (let i = 0; i < quantity; i++) {
    const qrCode = nanoid(32);
    const qrImage = await QRCode.toDataURL(qrCode);

    const ticket = await prisma.ticket.create({
      data: {
        ticketType: { connect: { id: ticketType.id } },
        guestEmail: email,
        guestName: name,
        holderName: name,
        ...(profile?.id && { owner: { connect: { id: profile.id } } }),
        ...(transactionId && { transaction: { connect: { id: transactionId } } }),
        qrCode,
        qrImageUrl: qrImage,
      },
    });

    for (const field of registrationFields) {
      const value = registrationData[field.label];

      if (value !== undefined && value !== "") {
        await prisma.registration_answers.create({
          data: {
            ticketId: ticket.id,
            fieldId: field.id,
            value: String(value),
          },
        });
      }
    }

    createdTicketIds.push(ticket.id);
  }

  await prisma.ticketType.update({
    where: { id: ticketType.id },
    data: { quantitySold: { increment: quantity } },
  });

  return createdTicketIds;
}

export async function initializeTicketPurchase(formData: FormData) {
  const ticketTypeId = formData.get("ticketTypeId") as string;
  const quantity = Number(formData.get("quantity") ?? 1);

  const registrationData: RegistrationDataMap = JSON.parse(
    (formData.get("registrationData") as string) || "{}"
  );

  const email = registrationData["Email"] ?? registrationData["email"] ?? "";

  const name =
    registrationData["Full Name"] ??
    registrationData["Name"] ??
    registrationData["name"] ??
    "";

  if (!ticketTypeId) {
    throw new Error("Ticket type is required.");
  }

  if (!email) {
    throw new Error("Email is required.");
  }

  if (quantity < 1) {
    throw new Error("Invalid quantity.");
  }

  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
    include: {
      section: {
        include: {
          event: {
            include: {
              organizer: {
                select: { createdAt: true },
              },
            },
          },
        },
      },
    },
  });

  if (!ticketType) {
    throw new Error("Ticket type not found.");
  }

  const remaining = ticketType.quantity - ticketType.quantitySold;

  if (remaining < quantity) {
    throw new Error("Not enough tickets remaining.");
  }

  // FREE TICKETS — issue immediately, no payment step.
  if (ticketType.priceKobo === 0) {
    const createdTickets = await createTicketsForPurchase({
      ticketTypeId,
      quantity,
      email,
      name,
      registrationData,
    });

    return {
      success: true as const,
      redirect: `/tickets/success?id=${createdTickets[0]}`,
    };
  }

  // PAID TICKETS — record a pending transaction and hand the client what it
  // needs to open Paystack's inline popup. Tickets are only created once
  // verifyTicketPurchase() confirms the charge with Paystack directly —
  // never from a client-trusted "payment succeeded" call alone.
  const saleFees = calculateSaleFees({
    subtotalKobo: ticketType.priceKobo * quantity,
    organizerCreatedAt: ticketType.section.event.organizer.createdAt,
  });
  const amountKobo = saleFees.subtotalKobo;
  const reference = `TICKET-${crypto.randomUUID()}`;

  await prisma.transaction.create({
    data: {
      type: "TICKET_PURCHASE",
      status: "PENDING",
      amountKobo,
      reference,
      metadata: {
        ticketTypeId,
        quantity,
        email,
        name,
        registrationData,
        saleFees,
      },
    },
  });

  return {
    success: false as const,
    requiresPayment: true as const,
    reference,
    amountKobo,
    email,
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "",
  };
}

export async function verifyTicketPurchase(reference: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { reference },
  });

  if (!transaction) {
    return { success: false as const, error: "Transaction not found." };
  }

  if (transaction.status === "SUCCESSFUL") {
    const existingTicket = await prisma.ticket.findFirst({
      where: { transactionId: transaction.id },
      orderBy: { createdAt: "asc" },
    });

    return {
      success: true as const,
      redirect: `/tickets/success?id=${existingTicket?.id ?? ""}`,
    };
  }

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );

  const data = await response.json();

  if (!data.status || data.data?.status !== "success") {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "FAILED" },
    });

    return { success: false as const, error: "Payment could not be verified." };
  }

  if (data.data.amount !== transaction.amountKobo) {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "FAILED" },
    });

    return { success: false as const, error: "Payment amount mismatch." };
  }

  // Flip PENDING -> SUCCESSFUL atomically so a second concurrent caller
  // (e.g. the Paystack webhook firing around the same time as the client
  // callback) can't create the tickets twice.
  const claim = await prisma.transaction.updateMany({
    where: { id: transaction.id, status: "PENDING" },
    data: { status: "SUCCESSFUL" },
  });

  if (claim.count === 0) {
    const existingTicket = await prisma.ticket.findFirst({
      where: { transactionId: transaction.id },
      orderBy: { createdAt: "asc" },
    });

    return {
      success: true as const,
      redirect: `/tickets/success?id=${existingTicket?.id ?? ""}`,
    };
  }

  const metadata = transaction.metadata as TicketPurchaseMetadata;

  const actualPaystackFeeKobo =
    typeof data.data?.fees === "number"
      ? data.data.fees
      : metadata.saleFees?.estimatedPaystackFeeKobo;

  if (metadata.saleFees && actualPaystackFeeKobo !== undefined) {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        metadata: {
          ...metadata,
          saleFees: {
            ...metadata.saleFees,
            estimatedPaystackFeeKobo: actualPaystackFeeKobo,
            estimatedOrganizerNetKobo: Math.max(
              0,
              metadata.saleFees.subtotalKobo -
                metadata.saleFees.domniFeeKobo -
                actualPaystackFeeKobo
            ),
          },
        },
      },
    });
  }

  const ticketType = await prisma.ticketType.findUnique({
    where: { id: metadata.ticketTypeId },
  });

  if (!ticketType || ticketType.quantity - ticketType.quantitySold < metadata.quantity) {
    return {
      success: false as const,
      error:
        "Payment succeeded but tickets sold out while it was processing. Contact support for a refund.",
    };
  }

  const createdTickets = await createTicketsForPurchase({
    ticketTypeId: metadata.ticketTypeId,
    quantity: metadata.quantity,
    email: metadata.email,
    name: metadata.name,
    registrationData: metadata.registrationData,
    transactionId: transaction.id,
  });

  return {
    success: true as const,
    redirect: `/tickets/success?id=${createdTickets[0]}`,
  };
}
