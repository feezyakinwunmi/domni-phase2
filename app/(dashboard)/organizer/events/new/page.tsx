import { redirect } from "next/navigation";
import { EventForm } from "@/components/organizer/EventForm";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getTicketTemplates } from "@/lib/templates";

export default async function NewEventPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectedFrom=/organizer/events/new");

  const [profile, templates] = await Promise.all([
    prisma.profile.findUnique({ where: { id: user.id }, select: { plan: true } }),
    getTicketTemplates(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-ink-800">Create an event</h1>
      <p className="mt-2 text-sm text-slate-500">
        Add sections like Awards Night or After Party, define as many ticket types as you need, and build the
        registration form your attendees fill in.
      </p>

      <div className="mt-8">
        <EventForm plan={profile?.plan ?? "FREE"} templates={templates} />
      </div>
    </div>
  );
}
