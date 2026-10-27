import { notFound } from "next/navigation";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { EventForm } from "../../../../../../components/organizer/EventForm";

interface EditEventPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditEventPage({
  params,
}: EditEventPageProps) {
  const { id } = await params;
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
      registrationFields: true,
    },
  });

  if (!event) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user
    ? await prisma.profile.findUnique({
        where: { id: user.id },
        select: { plan: true },
      })
    : null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-violet-600">
              Edit Event
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              {event.title}
            </h1>
          </div>

          <Link
            href={`/organizer/events/${event.id}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            ← Back
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
<EventForm initialData={event} plan={profile?.plan ?? "FREE"} />
        </div>
      </div>
    </main>
  );
}