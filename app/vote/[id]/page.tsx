
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VoteModal } from "@/components/voting/VoteModal";
import { Navbar } from "@/components/landing/Navbar";
interface VotePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function VotePage({ params }: VotePageProps) {
  const { id } = await params;
  const campaign = await prisma.votingCampaign.findUnique({
    where: {
      id,
    },
    include: {
      nominees: true,
    },
  });

  if (!campaign) {
    notFound();
  }
  const nominees = [...campaign.nominees].sort(
    (a, b) => b.voteCount - a.voteCount
  );

  const now = new Date();

  const votingOpen =
    now >= new Date(campaign.startsAt) &&
    now <= new Date(campaign.endsAt);

  return (
    <main className="min-h-screen bg-slate-50  py-10">
                      <Navbar />
        
      <div className="mx-auto max-w-6xl mt-14 px-4">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-violet-500">
                  Voting Campaign
                </p>

                <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
                  {campaign.title}
                </h1>

                <p className="mt-4 max-w-3xl text-slate-600">
                  {campaign.description}
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl bg-violet-50 px-5 py-4 text-center">
                  <p className="text-xs uppercase tracking-wide text-violet-500">
                    Price Per Vote
                  </p>

                  <p className="mt-1 text-2xl font-bold text-violet-700">
                    ₦{(campaign.pricePerVoteKobo / 100).toLocaleString()}
                  </p>
                </div>

                <div
                  className={`rounded-2xl px-5 py-3 text-center text-sm font-semibold ${
                    votingOpen
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {votingOpen ? "Voting Open" : "Voting Closed"}
                </div>
              </div>
            </div>

            <div className="mt-10">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">
                    Nominees
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Vote for your favorite nominee.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {nominees.map(
                  (nominee, index) => (
                    <div
                      key={nominee.id}
                      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition  hover:shadow-lg"
                    >
                      <div className="relative">
                        {nominee.imageUrl ? (
                          <img
                            src={String(nominee.imageUrl)}
                            alt={String(nominee.name ?? "")}
                            className="h-72 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-72 items-center justify-center bg-slate-100 text-slate-400">
                            No Image
                          </div>
                        )}

                        {index === 0 && nominee.voteCount > 0 && (
                          <div className="absolute left-4 top-4 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-white">
                            👑 Leading
                          </div>
                        )}
                      </div>

                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">
                              {nominee.name}
                            </h3>

                            {nominee.bio && (
                              <p className="mt-2 text-sm text-slate-500">
                                {nominee.bio}
                              </p>
                            )}
                          </div>

                          <div className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700">
                            #{index + 1}
                          </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Votes
                            </p>

                            <p className="mt-1 text-2xl font-bold text-slate-900">
                              {nominee.voteCount.toLocaleString()}
                            </p>
                          </div>

              <VoteModal
  nomineeId={String(nominee.id)}
  nomineeName={String(nominee.name)}
  pricePerVoteKobo={campaign.pricePerVoteKobo}
  disabled={!votingOpen}
/>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}