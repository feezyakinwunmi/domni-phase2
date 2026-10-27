import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Search } from "lucide-react";
interface EventsPageProps {
  searchParams: Promise<{
    search?: string;
    school?: string;
  }>;
}
import { EventCommentsSheet } from "@/components/events/EventCommentsSheet";
import { Navbar } from "@/components/landing/Navbar";

export default async function EventsPage({
  searchParams,
}: EventsPageProps) {
  const resolvedSearchParams = await searchParams;
  const search = resolvedSearchParams.search || "";
  const school = resolvedSearchParams.school || "";

const events = await prisma.event.findMany({
include: {
  event_comments: {
    where: {
      parentId: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
    include: {
      other_event_comments: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  },

  _count: {
    select: {
      event_comments: true,
    },
  },
},
   where: {
  status: "PUBLISHED",

  OR: [
    {
      endsAt: null,
    },
    {
      endsAt: {
        gte: new Date(),
      },
    },
  ],

  AND: [
    search
      ? {
          OR: [
            {
              title: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {},

    school
      ? {
          schoolName: {
            contains: school,
            mode: "insensitive",
          },
        }
      : {},
  ],
},

    orderBy: {
      startsAt: "asc",
    },
  });

  return (
    
    <main className="min-h-screen bg-slate-50 px-4 py-10">
              <Navbar />

      <div className="mx-auto mt-20 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">
            Discover Events
          </h1>

          <p className="mt-2 text-slate-500">
            Find campus events, shows, conferences, hangouts, and experiences.
          </p>
        </div>

        <form className="mb-8 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search events..."
              className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm outline-none focus:border-violet-400"
            />
          </div>

          <input
            type="text"
            name="school"
            defaultValue={school}
            placeholder="Filter by school..."
            className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-400"
          />
        </form>

        {events.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-14 text-center">
            <p className="text-lg font-semibold text-slate-900">
              No events found
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Try another keyword or school name.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
 <div
  key={event.id}
  className="overflow-hidden rounded-3xl border border-slate-200 bg-white"
>
  <Link href={`/events/${event.slug}`}>
    <>
      {event.coverImage ? (
        <img
          src={event.coverImage}
          alt={typeof event.title === "string" ? event.title : ""}
          className="h-56 w-full object-cover"
        />
      ) : (
        <div className="flex h-56 items-center justify-center bg-slate-100 text-slate-400">
          No image
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
            {event.schoolName || "Campus Event"}
          </span>

          <span className="text-xs text-slate-500">
            {new Date(event.startsAt).toLocaleDateString()}
          </span>
        </div>

        <h2 className="mt-4 text-xl font-bold text-slate-900">
          {event.title}
        </h2>

        <p className="mt-2 line-clamp-2 text-sm text-slate-500">
          {event.description}
        </p>

        <div className="mt-4 text-sm font-medium text-slate-700">
          {event.venue || "Venue TBA"}
        </div>
      </div>
    </>
  </Link>


 <EventCommentsSheet
  eventId={String(event.id)}
  comments={event.event_comments as any}
  count={event._count.event_comments}
 />
</div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}