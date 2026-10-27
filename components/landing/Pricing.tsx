"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

const plans = [
  {
    name: "Free",
    badge: "Get Started",
    price: "₦0",
    tagline: "Perfect for getting started",
    features: [
      "Create up to 10 events every month",
      "Run up to 10 voting campaigns every month",
      "3 free professional ticket designs",
      "Unlimited ticket sales",
      "QR code ticket validation",
      "Basic analytics dashboard",
      "Email support",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    badge: "Best Value",
    price: "₦5,000",
    tagline: "per month",
    features: [
      "Unlimited event creation",
      "Unlimited voting & nominations",
      "Unlimited premium ticket designs",
      "Custom ticket branding (logo, colors & backgrounds)",
      "Remove DOMNI branding",
      "Advanced analytics & downloadable reports",
      "Custom registration forms",
      "Priority customer support",
      "Early access to new features",
    ],
    highlighted: true,
  },
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="bg-gradient-to-b from-white via-slate-50 to-white py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-600">
            Pricing
          </p>

          <h2 className="mt-3 font-display text-4xl font-bold text-ink-800 sm:text-5xl">
            Start Free. Upgrade When You're Ready.
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            Whether you're organizing a campus event, award night, conference,
            or online voting, DOMNI has a plan that grows with you.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-2">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.45,
                delay: index * 0.1,
              }}
              className={cn(
                "relative flex flex-col rounded-3xl border p-8 transition-all duration-300 hover:-translate-y-2",
                plan.highlighted
                  ? "border-transparent bg-ink-800 text-white shadow-2xl"
                  : "border-slate-200 bg-white shadow-lg"
              )}
            >
              {/* Badge */}
              <div className="mb-5">
                <span
                  className={cn(
                    "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                    plan.highlighted
                      ? "bg-violet-500 text-white"
                      : "bg-violet-100 text-violet-700"
                  )}
                >
                  {plan.badge}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-display text-2xl font-bold">{plan.name}</h3>

              {/* Price */}
              <div className="mt-5 flex items-end gap-2">
                <span className="font-display text-5xl font-bold">
                  {plan.price}
                </span>

                <span
                  className={cn(
                    "pb-2 text-sm",
                    plan.highlighted
                      ? "text-slate-300"
                      : "text-slate-500"
                  )}
                >
                  {plan.tagline}
                </span>
              </div>

              {/* Divider */}
              <div
                className={cn(
                  "my-8 h-px",
                  plan.highlighted
                    ? "bg-slate-700"
                    : "bg-slate-200"
                )}
              />

              {/* Features */}
              <ul className="flex-1 space-y-4">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3"
                  >
                    <Check
                      className={cn(
                        "mt-1 h-5 w-5 shrink-0",
                        plan.highlighted
                          ? "text-violet-400"
                          : "text-violet-600"
                      )}
                    />

                    <span
                      className={cn(
                        "text-sm leading-6",
                        plan.highlighted
                          ? "text-slate-300"
                          : "text-slate-600"
                      )}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Button */}
            {plan.highlighted ? (
              <Button className="mt-10 h-12 text-base" variant="primary">
                <Link href="/login">Upgrade to Pro</Link>
              </Button>
            ) : (
              <Button className="mt-10 h-12 text-base" variant="secondary">
                <Link href="/organizer/settings">Get Started</Link>
              </Button>
            )}
            </motion.div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-violet-100 bg-violet-50 p-6 text-center">
          <p className="text-sm leading-7 text-slate-700">
            <span className="font-semibold text-violet-700">
              🎉 Promo Offer:
            </span>{" "}
            The new-organizer promo applies to both Free and Pro accounts. For
            the first calendar month, DOMNI charges no platform fee—only
            Paystack&apos;s payment processing charge is deducted from each sale.
            Afterward, DOMNI charges 3% per paid order, with a ₦50 minimum.
          </p>
        </div>
      </div>
    </section>
  );
}
