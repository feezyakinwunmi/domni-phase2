import { Check, Crown } from "lucide-react";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { UpgradeProButton } from "@/components/organizer/UpgradeProButton";

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

export default async function OrganizerSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await prisma.profile.findUnique({
    where: {
      id: user.id,
    },
    select: {
      email: true,
      plan: true,
    },
  });

  const isPro = profile?.plan === "PRO";

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900">
          Settings
        </h1>

        <p className="mt-2 text-slate-500">
          Manage your account, billing and subscription.
        </p>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Account Information
        </h2>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-sm text-slate-500">Email</p>

            <p className="font-medium text-slate-900">
              {profile?.email ?? user.email}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Current Plan</p>

            <div className="mt-2 flex items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                  isPro
                    ? "bg-amber-100 text-amber-600"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Crown className="h-5 w-5" />
              </div>

              <div>
                <p className="font-semibold text-slate-900">
                  {isPro ? "DOMNI Pro" : "Free Plan"}
                </p>

                <p className="text-sm text-slate-500">
                  {isPro
                    ? "You have access to all premium features."
                    : "Upgrade to unlock premium features."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isPro && (
        <div className="mt-8 rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <Crown className="h-5 w-5 text-amber-500" />
                Upgrade to DOMNI Pro
              </h2>

              <p className="mt-2 text-slate-600">
                Unlock everything you need to run professional events and
                voting campaigns.
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-slate-500">Starting from</p>

              <p className="text-3xl font-bold text-violet-600">₦5,000</p>

              <p className="text-sm text-slate-500">per month</p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {PRO_PERKS.map((perk) => (
              <div
                key={perk}
                className="flex items-start gap-3 rounded-xl bg-white p-4"
              >
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />

                <span className="text-sm text-slate-700">{perk}</span>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <UpgradeProButton />
          </div>
        </div>
      )}

      {isPro && (
        <div className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center gap-3">
            <Check className="h-6 w-6 text-emerald-600" />

            <div>
              <h2 className="font-semibold text-emerald-900">
                You're a DOMNI Pro member
              </h2>

              <p className="mt-1 text-sm text-emerald-700">
                Enjoy unlimited events, premium ticket designs, advanced
                analytics and all future Pro features.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
