import Link from "next/link";
import { Vote, Plus, ArrowRight } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function VotingDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

const campaigns = await prisma.votingCampaign.findMany({
  where: {
    organizerId: user.id,
  },

  include: {
    nominees: {
      include: {
        votes: true,
      },
    },
  },

  orderBy: {
    createdAt: "desc",
  },
});

  const now = new Date();

  const totalCampaigns = campaigns.length;

  const activeCampaigns = campaigns.filter(
    (campaign) =>
      new Date(campaign.startsAt) <= now &&
      new Date(campaign.endsAt) >= now
  ).length;

 const totalVotes = campaigns.reduce(
  (sum, campaign) =>
    sum +
    campaign.nominees.reduce(
      (nomineeSum, nominee) =>
        nomineeSum + nominee.voteCount,
      0
    ),
  0
);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Voting Dashboard
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage your campaigns and monitor activity.
            </p>
          </div>

          <Link href="/organizer/voting/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4"/>
              New
            </Button>
          </Link>
        </div>

        {/* Stats */}

        <div className="grid gap-5 md:grid-cols-3">

          <div className="rounded-2xl border bg-white p-6">
            <p className="text-sm text-slate-500">
              Total Campaigns
            </p>

            <p className="mt-2 text-3xl font-bold">
              {totalCampaigns}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6">
            <p className="text-sm text-slate-500">
              Active Campaigns
            </p>

            <p className="mt-2 text-3xl font-bold">
              {activeCampaigns}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6">
            <p className="text-sm text-slate-500">
              Total Votes
            </p>

            <p className="mt-2 text-3xl font-bold">
              {totalVotes}
            </p>
          </div>

        </div>

        {/* Campaign list */}

        <div className="mt-10 rounded-3xl border bg-white overflow-hidden">

          <div className="border-b p-5">
            <h2 className="font-semibold text-slate-900">
              Recent Campaigns
            </h2>
          </div>

          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center p-14 text-center">

              <Vote className="h-8 w-8 text-violet-400"/>

              <p className="mt-4 text-lg font-semibold">
                No campaigns yet
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Create your first campaign.
              </p>

              <Link
                href="/organizer/voting/new"
                className="mt-5"
              >
                <Button>Create Campaign</Button>
              </Link>

            </div>
          ) : (
            <div className="divide-y">

              {campaigns.map((campaign) => {

                const ended = new Date(campaign.endsAt) < now;

                const active =
                  new Date(campaign.startsAt) <= now &&
                  new Date(campaign.endsAt) >= now;

                return (
                  <div
                    key={campaign.id}
                    className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
                  >
                    <div>

                      <h3 className="font-semibold text-slate-900">
                        {campaign.title}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {campaign.nominees.length} nominees
                      </p>

                      <div className="mt-2 flex gap-2">

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {active
                            ? "Voting Open"
                            : ended
                            ? "Ended"
                            : "Upcoming"}
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">

                          {new Date(
                            campaign.endsAt
                          ).toLocaleDateString()}

                        </span>

                      </div>

                    </div>

                    <Link
                      href={`/organizer/voting/${String(campaign.id)}`}
                    >
                      <Button
                        variant="secondary"
                        className="gap-2"
                      >
                        View
                        <ArrowRight className="h-4 w-4"/>
                      </Button>
                    </Link>

                  </div>
                );
              })}

            </div>
          )}

        </div>
      </div>
    </main>
  );
}