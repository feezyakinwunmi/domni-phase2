import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isUuid } from "@/lib/errors";
import { getTicketTemplates } from "@/lib/templates";
import { EventForm } from "@/components/organizer/EventForm";

interface EditEventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectedFrom=/organizer/events/${id}/edit`);

  const [event, profile, templates] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { sortOrder: "asc" },
          include: { ticketTypes: { orderBy: { createdAt: "asc" } } },
        },
        registrationFields: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.profile.findUnique({ where: { id: user.id }, select: { plan: true } }),
    getTicketTemplates(),
  ]);

  // Same 404 for "doesn't exist" and "not yours" so ids can't be probed.
  if (!event || event.organizerId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-600">Edit event</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{event.title}</h1>
        </div>

        <Link
          href={`/organizer/events/${event.id}`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          ← Back
        </Link>
      </div>

      <EventForm initialData={event} plan={profile?.plan ?? "FREE"} templates={templates} />
    </div>
  );
}
