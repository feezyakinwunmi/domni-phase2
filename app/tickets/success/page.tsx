import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import TicketRenderer from "@/components/tickets/TicketRenderer";
import type { TicketCustomization } from "@/components/tickets/types";
import { TicketActions } from "./TicketActions";

export default async function TicketSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  if (!id) notFound();

  const ticket = await prisma.ticket.findUnique({
    where: {
      id,
    },
    include: {
      ticketType: {
        include: {
          ticketTemplate: true,
          section: {
            include: {
              event: true,
            },
          },
        },
      },
      registration_answers: {
        include: {
          registration_fields: true,
        },
      },
    },
  });

  if (!ticket) notFound();

  const event = ticket.ticketType.section.event;

  const extraFields = ticket.registration_answers
    .filter((answer) => answer.value)
    .map((answer) => ({
      label: answer.registration_fields.label,
      value: answer.value as string,
    }));

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-100 px-2 py-10">
      <TicketRenderer
        templateKey={ticket.ticketType.ticketTemplate?.templateKey}
        customization={ticket.ticketType.templateCustomization as TicketCustomization | null}
        data={{
          eventName: event.title,
          attendeeName: ticket.guestName || ticket.holderName || "Guest",
          ticketType: ticket.ticketType.title,
          date: new Date(event.startsAt).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
          venue: event.venue || "Venue TBA",
          qr: ticket.qrImageUrl || "",
          extraFields,
        }}
      />

      <div className="mt-6 w-full max-w-md">
        <TicketActions />
      </div>
    </main>
  );
}
