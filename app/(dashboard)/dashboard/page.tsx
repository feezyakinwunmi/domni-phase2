import Link from "next/link";
import {
  CalendarPlus,
  ArrowRight,
  Activity,
  FileText,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardOverviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const events = await prisma.event.findMany({
    where: {
      organizerId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      sections: {
        include: {
          ticketTypes: true,
        },
      },
    },
  });

  const totalEvents = events.length;

  const now = new Date();

 const activeRegistrations = events.filter(
  (event: {
    startsAt: string | number | Date;
    endsAt: string | number | Date | null;
    status: string;
  }) => {
    const now = new Date();

    const eventEnd = event.endsAt
      ? new Date(event.endsAt)
      : new Date(event.startsAt);

    return (
      event.status !== "CANCELLED" &&
      event.status !== "DRAFT" &&
      eventEnd > now
    );
  }
).length;

  const draftEvents = events.filter(
    (event: { status: string; }) => event.status === "DRAFT"
  ).length;

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage your events, registrations, and attendee experiences.
          </p>
        </div>

        <Link href="/organizer/events/new">
          <Button className="gap-2">
            <CalendarPlus className="h-4 w-4" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Total Events
              </p>

              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {totalEvents}
              </h2>
            </div>

            <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
              <CalendarPlus className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Active Registrations
              </p>

              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {activeRegistrations}
              </h2>
            </div>

            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Draft Events
              </p>

              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {draftEvents}
              </h2>
            </div>

            <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
              <FileText className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="mt-10 rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Recent Events
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your latest created and active events.
            </p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-14 text-center">
            <CalendarPlus className="h-8 w-8 text-violet-400" />

            <p className="mt-4 text-lg font-semibold text-slate-900">
              No events yet
            </p>

            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Create your first event to begin selling tickets and managing registrations.
            </p>

            <Link href="/organizer/events/new" className="mt-6">
              <Button>Create your first event</Button>
            </Link>
          </div>
        ) : (
       <div className="divide-y divide-slate-100">
 {events.map((event) => {
  const startDate = new Date(event.startsAt);
  const endDate = event.endsAt ? new Date(event.endsAt) : startDate;
  const now = new Date();

  const isUpcoming = now < startDate;
  const isActive = now >= startDate && now <= endDate;
  const isEnded = now > endDate;

  return (
    <div
      key={event.id}
      className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between"
    >
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {event.coverImage ? (
          <img
            src={event.coverImage}
            alt={String(event.title)}
            className="h-20 w-24 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-20 w-24 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <CalendarPlus className="h-5 w-5" />
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {event.title}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {event.venue || "No venue specified"}
          </p>

          {/* Status + Date */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : isUpcoming
                  ? "bg-blue-50 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {isActive
                ? "Registration Open"
                : isUpcoming
                ? "Not Started"
                : "Event Ended"}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {startDate.toLocaleDateString()} -{" "}
              {endDate.toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        <Link href={`/organizer/events/${String(event.id)}`}>
          <Button variant="secondary" className="gap-2">
            View Event
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
})}
</div>
        )}
      </div>
    </div>
  );
}