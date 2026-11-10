import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Check, Clock, MapPin, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/errors";
import { formatDateTime, formatNaira } from "@/lib/format";
import { CATEGORY_META, hasUnits, STATUS_LABELS, unitNoun, type ApplicationStatus, type PartnerCategory } from "@/lib/partners";
import { PartnerPayButton } from "@/components/partners/PartnerPayButton";
import { Navbar } from "@/components/landing/Navbar";

export const metadata: Metadata = { title: "Your booking — DOMNI", robots: { index: false } };

const STEPS = ["Submitted", "Approved", "Paid"] as const;

/** Booking page for a sponsor/exhibitor. The unguessable id is the access key, like a ticket link. */
export default async function PartnerApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const app = await prisma.partnerApplication.findUnique({
    where: { id },
    include: {
      package: true,
      event: { select: { title: true, slug: true, startsAt: true, venue: true, coverImage: true } },
    },
  });
  if (!app) notFound();

  const status = app.status as ApplicationStatus;
  const closed = status === "REJECTED" || status === "CANCELLED";
  const stepIndex = status === "PAID" ? 2 : status === "APPROVED" ? 1 : status === "AWAITING_PAYMENT" ? 1 : 0;
  const canPay = (status === "APPROVED" || status === "AWAITING_PAYMENT") && app.amountKobo > 0;
  const category = CATEGORY_META[(app.package.category as PartnerCategory) in CATEGORY_META ? (app.package.category as PartnerCategory) : "OTHER"];

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 pt-28">
        <Link href={`/events/${app.event.slug}#partner`} className="text-sm text-slate-500 hover:text-violet-600">
          ← {app.event.title}
        </Link>

        <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="bg-ink-800 p-6 text-white md:p-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-300">{category.label}</p>
            <h1 className="mt-2 font-display text-3xl font-bold">{app.package.title}</h1>
            <p className="mt-2 text-white/70">
              for <strong className="text-white">{app.companyName}</strong>
            </p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> {formatDateTime(app.event.startsAt)}
              </span>
              {app.event.venue && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {app.event.venue}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-8 p-6 md:p-8">
            {/* Status */}
            {closed ? (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                <XCircle className="mt-0.5 h-5 w-5 text-red-500" />
                <div>
                  <p className="font-semibold text-red-800">{STATUS_LABELS[status]}</p>
                  {app.organizerNote && <p className="mt-1 text-sm text-red-700">{app.organizerNote}</p>}
                </div>
              </div>
            ) : (
              <div>
                <ol className="flex items-center">
                  {STEPS.map((label, i) => {
                    const done = i <= stepIndex;
                    return (
                      <li key={label} className="flex flex-1 items-center last:flex-none">
                        <span className="flex flex-col items-center gap-1.5">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                            {done ? <Check className="h-4 w-4" /> : i + 1}
                          </span>
                          <span className={`text-xs font-medium ${done ? "text-ink-800" : "text-slate-400"}`}>{label}</span>
                        </span>
                        {i < STEPS.length - 1 && <span className={`mx-2 mb-5 h-0.5 flex-1 ${i < stepIndex ? "bg-emerald-500" : "bg-slate-200"}`} />}
                      </li>
                    );
                  })}
                </ol>
                <div className="mt-6 flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                  {status === "PAID" ? <Check className="mt-0.5 h-5 w-5 text-emerald-500" /> : <Clock className="mt-0.5 h-5 w-5 text-amber-500" />}
                  <div>
                    <p className="font-semibold text-ink-800">{STATUS_LABELS[status]}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {status === "PENDING" && "The organizer is reviewing your application. Check back here — you'll be able to pay once it's approved."}
                      {status === "APPROVED" && "Great news — you're approved! Complete payment below to confirm your spot."}
                      {status === "AWAITING_PAYMENT" && "Your booking is saved but not paid yet. Pay below to confirm it."}
                      {status === "PAID" && "You're all set. The organizer will contact you with setup details."}
                    </p>
                    {app.organizerNote && <p className="mt-2 rounded-lg bg-white p-3 text-sm text-slate-600">“{app.organizerNote}” — organizer</p>}
                  </div>
                </div>
              </div>
            )}

            {canPay && <PartnerPayButton applicationId={app.id} amountKobo={app.amountKobo} />}

            {/* Summary */}
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              {hasUnits(app.package) && (
                <div>
                  <dt className="text-slate-400">Quantity</dt>
                  <dd className="font-semibold text-ink-800">
                    {app.units} {unitNoun(app.package, app.units)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-slate-400">Amount</dt>
                <dd className="font-semibold text-ink-800">
                  {app.amountKobo > 0 ? formatNaira(app.amountKobo) : status === "PENDING" && app.package.pricingModel === "ON_REQUEST" ? "To be quoted" : "Free"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Contact</dt>
                <dd className="font-semibold text-ink-800">
                  {app.contactName} · {app.email}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Submitted</dt>
                <dd className="font-semibold text-ink-800">{formatDateTime(app.createdAt)}</dd>
              </div>
            </dl>

            {app.package.benefits.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-ink-800">What&apos;s included</h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {app.package.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" /> {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="border-t border-slate-100 pt-6 text-xs text-slate-400">Keep this page link — it&apos;s how you check your status and pay.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
