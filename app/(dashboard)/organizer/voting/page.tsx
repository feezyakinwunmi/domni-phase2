import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Plus, Trophy, Vote } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime, formatNaira } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge, StatTile } from "@/components/ui/panel";

export default async function VotingDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const campaigns = await prisma.votingCampaign.findMany({
    where: { organizerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { nominees: { select: { name: true, voteCount: true, imageUrl: true }, orderBy: { voteCount: "desc" } } },
  });

  const now = new Date();
  const votesOf = (c: (typeof campaigns)[number]) => c.nominees.reduce((n, x) => n + x.voteCount, 0);
  const totalVotes = campaigns.reduce((n, c) => n + votesOf(c), 0);
  const gross = campaigns.reduce((n, c) => n + votesOf(c) * c.pricePerVoteKobo, 0);
  const live = campaigns.filter((c) => c.startsAt <= now && c.endsAt >= now).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink-800">Voting</h1>
          <p className="mt-1.5 text-sm text-slate-500">Run paid or free voting campaigns with a live leaderboard.</p>
        </div>
        <Link href="/organizer/voting/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New campaign
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Campaigns" value={campaigns.length} />
        <StatTile label="Live now" value={live} />
        <StatTile label="Total votes" value={totalVotes.toLocaleString()} />
        <StatTile label="Vote revenue (gross)" value={formatNaira(gross).replace("Free", "₦0")} />
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
            <Vote className="h-6 w-6 text-violet-500" />
          </div>
          <p className="mt-4 font-semibold text-ink-800">No campaigns yet</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">Create awards, pageants or polls. Votes can be free (one per email) or paid.</p>
          <Link href="/organizer/voting/new" className="mt-5">
            <Button>Create a campaign</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => {
            const votes = votesOf(c);
            const leader = c.nominees[0];
            const status = now < c.startsAt ? (["Upcoming", "amber"] as const) : now > c.endsAt ? (["Closed", "slate"] as const) : (["Live", "green"] as const);
            return (
              <Link
                key={c.id}
                href={`/organizer/voting/${c.id}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-ink-800 group-hover:text-violet-700">{c.title}</h3>
                  <Badge tone={status[1]}>{status[0]}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {c.nominees.length} nominees · {formatNaira(c.pricePerVoteKobo)} per vote · closes {formatDateTime(c.endsAt)}
                </p>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <Trophy className="h-4 w-4 flex-shrink-0 text-amber-500" />
                    <span className="truncate text-slate-600">
                      {leader && leader.voteCount > 0 ? (
                        <>
                          <span className="font-medium text-ink-800">{leader.name}</span> leads
                        </>
                      ) : (
                        "No votes yet"
                      )}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-sm font-semibold text-ink-800">
                    {votes.toLocaleString()} votes <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
