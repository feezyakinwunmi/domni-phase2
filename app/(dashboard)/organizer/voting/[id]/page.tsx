import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isUuid } from "@/lib/errors";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { DeleteCampaignButton } from "@/components/voting/DeleteCampaignButton";
import {
  ArrowLeft,
  Users,
  Vote,
  Clock3,
  Trophy,
  Pencil,
} from "lucide-react";
interface VotingCampaignPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    created?: string;
    updated?: string;
  }>;
}

export default async function VotingCampaignPage({
  params,
  searchParams,
}: VotingCampaignPageProps) {
  const { id } = await params;
  const { created, updated } = await searchParams;
  if (!isUuid(id)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectedFrom=/organizer/voting/${id}`);

  const campaign = await prisma.votingCampaign.findUnique({
    where: {
      id,
    },
    include: {
      nominees: {
        orderBy: {
          voteCount: "desc",
        },
      },
      event: true,
    },
  });

  if (!campaign || campaign.organizerId !== user.id) {
    notFound();
  }

  const now = new Date();

  const isUpcoming = now < new Date(campaign.startsAt);
  const isLive =
    now >= new Date(campaign.startsAt) &&
    now <= new Date(campaign.endsAt);

  const isEnded = now > new Date(campaign.endsAt);

  const totalVotes = campaign.nominees.reduce(
    (sum, nominee) => sum + nominee.voteCount,
    0
  );

  return (
    <main>
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/organizer/voting"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to campaigns
          </Link>

          <div className="flex items-center gap-3">
            <Link href={`/vote/${campaign.id}`} target="_blank">
              <Button variant="secondary">
                Open Public Voting Page
              </Button>
            </Link>

            <Link href={`/organizer/voting/${campaign.id}/edit`}>
              <Button className="gap-2">
                <Pencil className="h-4 w-4" />
                Edit Campaign
              </Button>
            </Link>

            <DeleteCampaignButton campaignId={campaign.id} />
          </div>
        </div>

        {updated === "true" && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            ✅ Changes saved.
          </div>
        )}

        {created === "true" && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            🎉 Campaign created successfully.
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-violet-500">
                  Voting Campaign
                </p>

                <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
                  {campaign.title}
                </h1>

                {campaign.description && (
                  <p className="mt-4 max-w-3xl text-slate-600">
                    {campaign.description}
                  </p>
                )}

                {campaign.event && (
                  <div className="mt-4 inline-flex items-center rounded-full bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700">
                    Linked Event: {campaign.event.title}
                  </div>
                )}
              </div>

              <div
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  isLive
                    ? "bg-emerald-50 text-emerald-700"
                    : isUpcoming
                    ? "bg-amber-50 text-amber-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {isLive
                  ? "Voting Live"
                  : isUpcoming
                  ? "Upcoming"
                  : "Voting Ended"}
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-b border-slate-100 p-6 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Nominees</p>
                <Users className="h-5 w-5 text-slate-400" />
              </div>

              <p className="mt-3 text-3xl font-bold text-slate-900">
                {campaign.nominees.length}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Total Votes</p>
                <Vote className="h-5 w-5 text-slate-400" />
              </div>

              <p className="mt-3 text-3xl font-bold text-slate-900">
                {totalVotes.toLocaleString()}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Price Per Vote</p>
                <Trophy className="h-5 w-5 text-slate-400" />
              </div>

              <p className="mt-3 text-3xl font-bold text-slate-900">
                ₦{(campaign.pricePerVoteKobo / 100).toLocaleString()}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Ends</p>
                <Clock3 className="h-5 w-5 text-slate-400" />
              </div>

              <p className="mt-3 text-sm font-semibold text-slate-900">
                {new Date(campaign.endsAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Nominee Leaderboard
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Live ranking based on total votes received.
              </p>
            </div>

            <div className="space-y-4">
              {campaign.nominees.map((nominee, index) => {
                const percentage =
                  totalVotes > 0
                    ? (nominee.voteCount / totalVotes) * 100
                    : 0;

                const nomineeAlt =
                  typeof nominee.name === "string" ? nominee.name : "";

                return (
                  <div
                    key={nominee.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                          #{index + 1}
                        </div>

                        {nominee.imageUrl ? (
                          <img
                            src={nominee.imageUrl}
                            alt={nomineeAlt}
                            className="h-16 w-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <Users className="h-6 w-6" />
                          </div>
                        )}

                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            {nominee.name}
                          </h3>

                          {nominee.bio && (
                            <p className="mt-1 text-sm text-slate-500">
                              {nominee.bio}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="min-w-[180px]">
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-600">
                            Votes
                          </span>

                          <span className="font-bold text-slate-900">
                            {nominee.voteCount.toLocaleString()}
                          </span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-violet-600"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>

                        <p className="mt-2 text-right text-xs text-slate-500">
                          {percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}