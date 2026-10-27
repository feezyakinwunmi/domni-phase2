import { Check, Crown, Landmark, UserRound } from "lucide-react";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { UpgradeProButton } from "@/components/organizer/UpgradeProButton";
import { PayoutSettings } from "@/components/organizer/PayoutSettings";
import { ProfileForm } from "@/components/organizer/ProfileForm";

const PRO_PERKS = [
  "Unlimited event creation",
  "Unlimited voting & nominations",
  "Unlimited premium ticket designs",
  "Customize tickets with your logo and branding",
  "Remove DOMNI branding",
  "Advanced analytics & downloadable reports",
  "Priority customer support",
  "Early access to new features",
];

function Section({
  id,
  icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 grid gap-6 border-t border-slate-200 py-8 first:border-t-0 first:pt-0 lg:grid-cols-[260px_1fr]">
      <div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">{icon}</div>
        <h2 className="mt-3 font-display text-lg font-semibold text-ink-800">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">{children}</div>
    </section>
  );
}

export default async function OrganizerSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: {
      email: true,
      fullName: true,
      phone: true,
      plan: true,
      planActivatedAt: true,
      payoutBankName: true,
      payoutAccountNumber: true,
      payoutAccountName: true,
      paystackSubaccountCode: true,
    },
  });

  const isPro = profile?.plan === "PRO";

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink-800">Settings</h1>
        <p className="mt-1.5 text-sm text-slate-500">Your profile, how you get paid, and your plan.</p>
      </div>

      <Section id="profile" icon={<UserRound className="h-5 w-5" />} title="Profile" description="How you appear to attendees.">
        <ProfileForm initial={{ fullName: profile?.fullName ?? "", phone: profile?.phone ?? "", email: profile?.email ?? user.email ?? "" }} />
      </Section>

      <Section
        id="payouts"
        icon={<Landmark className="h-5 w-5" />}
        title="Payout account"
        description="Ticket and vote payments are split at checkout: your share settles straight to this account on Paystack's next-business-day schedule, and DOMNI's fee is deducted automatically. Required before publishing paid events or voting."
      >
        <PayoutSettings
          current={{
            bankName: profile?.payoutBankName ?? null,
            accountNumber: profile?.payoutAccountNumber ?? null,
            accountName: profile?.payoutAccountName ?? null,
            active: !!profile?.paystackSubaccountCode,
          }}
        />
      </Section>

      <Section id="plan" icon={<Crown className="h-5 w-5" />} title="Plan" description="Premium designs and branding for your tickets.">
        {isPro ? (
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-ink-800">DOMNI Pro</p>
              <p className="mt-0.5 text-sm text-slate-500">
                {profile?.planActivatedAt ? `Active since ${formatDate(profile.planActivatedAt)}. ` : ""}
                You have access to every premium feature.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">You're on the</p>
                <p className="text-xl font-semibold text-ink-800">Free plan</p>
              </div>
              <div className="text-right">
                <p className="font-display text-3xl font-bold text-violet-600">₦5,000</p>
                <p className="text-xs text-slate-500">per month</p>
              </div>
            </div>
            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {PRO_PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                  {perk}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <UpgradeProButton />
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
