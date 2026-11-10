"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Award, Check, Megaphone, Sparkles, Store, Warehouse } from "lucide-react";
import { CATEGORY_META, PARTNER_CATEGORIES, remainingOf, unitNoun, type PartnerCategory } from "@/lib/partners";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PartnerBookingModal, type BookablePackage } from "./PartnerBookingModal";

export interface PublicPackage extends BookablePackage {
  category: string;
  description: string | null;
  benefits: string[];
  highlight: boolean;
  logoOnTicket: boolean;
}

const ICONS: Record<PartnerCategory, React.ComponentType<{ className?: string }>> = {
  SPONSORSHIP: Award,
  EXHIBITION: Warehouse,
  ADVERTISING: Megaphone,
  VENDOR: Store,
  OTHER: Sparkles,
};

function PriceTag({ pkg, dark }: { pkg: PublicPackage; dark?: boolean }) {
  if (pkg.pricingModel === "ON_REQUEST") {
    return <p className={cn("text-2xl font-bold", dark ? "text-white" : "text-ink-800")}>Price on request</p>;
  }
  const per = pkg.pricingModel === "PER_SQM" ? "per m²" : pkg.pricingModel === "PER_UNIT" ? `per ${unitNoun(pkg, 1)}` : null;
  return (
    <p className={cn("font-display text-3xl font-bold tracking-tight", dark ? "text-white" : "text-ink-800")}>
      {formatNaira(pkg.priceKobo)}
      {per && <span className={cn("ml-1 text-sm font-medium", dark ? "text-white/60" : "text-slate-500")}>{per}</span>}
    </p>
  );
}

function Availability({ pkg, dark }: { pkg: PublicPackage; dark?: boolean }) {
  const left = remainingOf(pkg);
  if (left === null) return null;
  const noun = pkg.pricingModel === "PER_SQM" ? "m²" : pkg.pricingModel === "PER_UNIT" ? unitNoun(pkg, left) : left === 1 ? "slot" : "slots";
  return (
    <p className={cn("text-xs font-semibold", left === 0 ? "text-red-500" : left <= 3 ? "text-amber-500" : dark ? "text-white/60" : "text-slate-400")}>
      {left === 0 ? "Fully booked" : `${left.toLocaleString()} ${noun} left`}
    </p>
  );
}

function PackageCard({ pkg, onBook }: { pkg: PublicPackage; onBook: () => void }) {
  const dark = pkg.highlight;
  const soldOut = remainingOf(pkg) === 0;
  const Icon = ICONS[(pkg.category as PartnerCategory) in ICONS ? (pkg.category as PartnerCategory) : "OTHER"];

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-3xl border p-6 transition",
        dark ? "border-transparent bg-ink-800 text-white shadow-glow" : "border-slate-200 bg-white hover:border-violet-200 hover:shadow-soft"
      )}
    >
      {pkg.highlight && (
        <span className="absolute -top-3 left-6 rounded-full bg-domni-gradient px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow">
          Most popular
        </span>
      )}
      <div className="flex items-center gap-3">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", dark ? "bg-white/10 text-violet-200" : "bg-violet-50 text-violet-600")}>
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="text-lg font-bold">{pkg.title}</h3>
      </div>

      <div className="mt-5">
        <PriceTag pkg={pkg} dark={dark} />
        {pkg.pricingModel === "PER_SQM" && (
          <p className={cn("mt-1 text-xs", dark ? "text-white/60" : "text-slate-500")}>
            From {pkg.minUnits} m² ({formatNaira(pkg.priceKobo * pkg.minUnits)})
          </p>
        )}
      </div>

      {pkg.description && <p className={cn("mt-3 text-sm leading-relaxed", dark ? "text-white/70" : "text-slate-500")}>{pkg.description}</p>}

      {pkg.benefits.length > 0 && (
        <ul className="mt-5 space-y-2.5">
          {pkg.benefits.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm">
              <span className={cn("mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full", dark ? "bg-violet-400/30 text-violet-200" : "bg-emerald-100 text-emerald-600")}>
                <Check className="h-3 w-3" />
              </span>
              <span className={dark ? "text-white/85" : "text-slate-700"}>{b}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-6">
        <Availability pkg={pkg} dark={dark} />
        <button
          type="button"
          onClick={onBook}
          disabled={soldOut}
          className={cn(
            "mt-2 h-11 w-full rounded-xl text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
            dark ? "bg-white text-ink-800 hover:bg-violet-50" : "bg-domni-gradient text-white hover:brightness-110"
          )}
        >
          {soldOut ? "Fully booked" : !pkg.requiresApproval && pkg.pricingModel !== "ON_REQUEST" && pkg.priceKobo > 0 ? "Book now" : "Apply"}
        </button>
      </div>
    </article>
  );
}

export function PartnerPackagesSection({ packages }: { packages: PublicPackage[] }) {
  const [active, setActive] = useState<PublicPackage | null>(null);
  const groups = PARTNER_CATEGORIES.map((c) => ({ category: c, items: packages.filter((p) => p.category === c) })).filter((g) => g.items.length);

  return (
    <div className="space-y-12">
      {groups.map((g) => (
        <section key={g.category}>
          <h3 className="font-display text-xl font-bold text-ink-800">{CATEGORY_META[g.category].plural}</h3>
          <p className="mt-1 text-sm text-slate-500">{CATEGORY_META[g.category].blurb}</p>
          <div className={cn("mt-6 grid gap-5", g.items.length >= 3 ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2")}>
            {g.items.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} onBook={() => setActive(pkg)} />
            ))}
          </div>
        </section>
      ))}

      {active && createPortal(<PartnerBookingModal pkg={active} onClose={() => setActive(null)} />, document.body)}
    </div>
  );
}
