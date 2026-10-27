import { EventForm } from "@/components/organizer/EventForm";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export default async function NewEventPage() {
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
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-ink-800">Create an event</h1>
      <p className="mt-2 text-sm text-slate-500">
        Add sections like Awards Night or After Party, then define as many
        ticket types as you need — pick a preset or type your own.
      </p>

      <div className="mt-8">
        <EventForm plan={profile?.plan ?? "FREE"} />
      </div>
    </div>
  );
}
