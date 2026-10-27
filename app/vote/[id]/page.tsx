import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Clock3, Crown, Trophy, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/errors";
import { formatDateTime, formatNaira } from "@/lib/format";
import { VoteModal } from "@/components/voting/VoteModal";
import { Navbar } from "@/components/landing/Navbar";

interface VotePageProps {
  params: Promise<{ id: string }>;
}

function getCampaign(id: string) {
  return prisma.votingCampaign.findUnique({
    where: { id },
    include: { nominees: { orderBy: [{ voteCount: "desc" }, { createdAt: "asc" }] } },
  });
}

export async function generateMetadata({ params }: VotePageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return {};
  const campaign = await getCampaign(id).catch(() => null);
  return campaign ? { title: `${campaign.title} — Vote on DOMNI`, description: campaign.description?.slice(0, 160) } : {};
}

export default async function VotePage({ params }: VotePageProps) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const now = new Date();
  const open = now >= campaign.startsAt && now <= campaign.endsAt;
  const upcoming = now < campaign.startsAt;
  const total = campaign.nominees.reduce((n, x) => n + x.voteCount, 0);
  const isFree = campaign.pricePerVoteKobo === 0;

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      <section className="relative overflow-hidden bg-ink-800 px-4 pb-14 pt-32 text-white">
        <div className="pointer-events-none absolute inset-0 bg-domni-radial" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
              open ? "bg-emerald-400/15 text-emerald-300" : upcoming ? "bg-amber-400/15 text-amber-300" : "bg-white/10 text-white/60"
            }`}
          >
            {open && <span className="h-2 w-2 animate-pulse-dot rounded-full bg-emerald-400" />}
            {open ? "Voting is live" : upcoming ? `Opens ${formatDateTime(campaign.startsAt)}` : "Voting has closed"}
          </span>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight md:text-5xl">{campaign.title}</h1>
          {campaign.description && <p className="mt-4 max-w-2xl whitespace-pre-line text-white/70">{campaign.description}</p>}

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-sm">
            <div>
              <dt className="text-white/50">Per vote</dt>
              <dd className="mt-0.5 text-lg font-semibold">{isFree ? "Free · 1 per email" : formatNaira(campaign.pricePerVoteKobo)}</dd>
            </div>
            <div>
              <dt className="text-white/50">Total votes</dt>
              <dd className="mt-0.5 text-lg font-semibold">{total.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-white/50">
                <Clock3 className="h-3.5 w-3.5" /> {open || upcoming ? "Closes" : "Closed"}
              </dt>
              <dd className="mt-0.5 text-lg font-semibold">{formatDateTime(campaign.endsAt)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h2 className="font-display text-2xl font-bold text-ink-800">Leaderboard</h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {campaign.nominees.map((nominee, index) => {
            const share = total ? Math.round((nominee.voteCount / total) * 100) : 0;
            const leading = index === 0 && nominee.voteCount > 0;
            return (
              <article key={nominee.id} className={`overflow-hidden rounded-3xl border bg-white transition hover:shadow-soft ${leading ? "border-amber-300" : "border-slate-200"}`}>
                <div className="relative aspect-square bg-slate-100">
                  {nominee.imageUrl ? (
                    <img src={nominee.imageUrl} alt={nominee.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <UserRound className="h-16 w-16 text-slate-300" />
                    </div>
                  )}
                  <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-sm font-bold text-ink-800 shadow">#{index + 1}</span>
                  {leading && (
                    <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-ink-900">
                      <Crown className="h-3.5 w-3.5" /> Leading
                    </span>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-ink-800">{nominee.name}</h3>
                  {nominee.bio && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{nominee.bio}</p>}

                  <div className="mt-4">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-ink-800">{nominee.voteCount.toLocaleString()} votes</span>
                      <span className="text-slate-400">{share}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-violet-100">
                      <div className="h-full rounded-full bg-violet-500" style={{ width: `${share}%` }} />
                    </div>
                  </div>

                  <div className="mt-5 [&>button]:w-full">
                    <VoteModal nomineeId={nominee.id} nomineeName={nominee.name} pricePerVoteKobo={campaign.pricePerVoteKobo} disabled={!open} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
