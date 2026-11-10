"use client";

import { useState } from "react";
import { Award, ChevronDown, Copy, Megaphone, Plus, Store, Trash2, Warehouse, X, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CreatableSelect } from "@/components/ui/creatable-select";
import { MoveButtons } from "@/components/ui/sortable";
import { cn } from "@/lib/utils";
import {
  CATEGORY_META,
  PACKAGE_PRESETS,
  PARTNER_CATEGORIES,
  PRICING_LABELS,
  PRICING_MODELS,
  type PackagePreset,
  type PartnerCategory,
  type PricingModel,
} from "@/lib/partners";

export interface PartnerPackageDraft {
  id: string;
  category: PartnerCategory;
  title: string;
  description: string;
  benefits: string[];
  pricingModel: PricingModel;
  price: string;
  unitLabel: string;
  minUnits: string;
  maxUnits: string;
  quantity: string;
  requiresApproval: boolean;
  highlight: boolean;
  logoOnTicket: boolean;
  showOnEventPage: boolean;
  quantityTaken: number;
}

export const CATEGORY_ICONS: Record<PartnerCategory, React.ComponentType<{ className?: string }>> = {
  SPONSORSHIP: Award,
  EXHIBITION: Warehouse,
  ADVERTISING: Megaphone,
  VENDOR: Store,
  OTHER: Sparkles,
};

const TAB_LABEL_PRESETS = ["Partner with us", "Exhibit & Sponsor", "Sponsors & Exhibitors", "Get involved", "Become a partner", "Vendors"] as const;

export function draftFromPreset(p: PackagePreset): PartnerPackageDraft {
  return {
    id: crypto.randomUUID(),
    category: p.category,
    title: p.title,
    description: p.description,
    benefits: [...p.benefits],
    pricingModel: p.pricingModel,
    price: p.price ? String(p.price) : "",
    unitLabel: p.unitLabel ?? "",
    minUnits: String(p.minUnits ?? 1),
    maxUnits: p.maxUnits ? String(p.maxUnits) : "",
    quantity: p.quantity ? String(p.quantity) : "",
    requiresApproval: p.requiresApproval ?? true,
    highlight: !!p.highlight,
    logoOnTicket: !!p.logoOnTicket,
    showOnEventPage: true,
    quantityTaken: 0,
  };
}

function blankDraft(category: PartnerCategory): PartnerPackageDraft {
  return {
    ...draftFromPreset({ key: "blank", category, title: "", description: "", pricingModel: "FIXED", price: 0, benefits: [] }),
  };
}

function priceSummary(d: PartnerPackageDraft) {
  if (d.pricingModel === "ON_REQUEST") return "On request";
  const n = Number(d.price || 0);
  const money = n ? `₦${n.toLocaleString("en-NG")}` : "₦0";
  if (d.pricingModel === "PER_SQM") return `${money} / m²`;
  if (d.pricingModel === "PER_UNIT") return `${money} / ${d.unitLabel || "unit"}`;
  return money;
}

function BenefitsEditor({ benefits, onChange }: { benefits: string[]; onChange: (b: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const items = draft
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s && !benefits.includes(s));
    if (items.length) onChange([...benefits, ...items].slice(0, 20));
    setDraft("");
  };
  return (
    <div>
      <Label>What partners get</Label>
      <ul className="space-y-1.5">
        {benefits.map((b, i) => (
          <li key={`${b}-${i}`} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
            <span className="text-emerald-500">✓</span>
            <input
              className="min-w-0 flex-1 bg-transparent outline-none"
              value={b}
              aria-label={`Benefit ${i + 1}`}
              onChange={(e) => onChange(benefits.map((x, j) => (j === i ? e.target.value : x)))}
              onBlur={() => onChange(benefits.map((x) => x.trim()).filter(Boolean))}
            />
            <button type="button" onClick={() => onChange(benefits.filter((_, j) => j !== i))} className="rounded p-0.5 text-slate-400 hover:text-red-500" aria-label="Remove benefit">
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <Input
          value={draft}
          placeholder="e.g. Logo on main stage banner — press Enter"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" size="sm" className="h-11" onClick={add} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:border-slate-300">
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-violet-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-medium text-ink-800">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

interface Props {
  packages: PartnerPackageDraft[];
  onChange: (p: PartnerPackageDraft[]) => void;
  tabLabel: string;
  onTabLabelChange: (v: string) => void;
}

export function PartnerPackagesEditor({ packages, onChange, tabLabel, onTabLabelChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<PartnerPackageDraft>) => onChange(packages.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  function add(d: PartnerPackageDraft) {
    onChange([...packages, d]);
    setExpandedId(d.id);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= packages.length) return;
    const next = [...packages];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next);
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h3 className="text-lg font-semibold text-ink-800">Sponsors, exhibitors & vendors</h3>
          <p className="text-sm text-slate-500">
            Sell sponsorship tiers, exhibition stands (per stand or per m²), logo & ad placement, and vendor stalls. They appear in their own
            tab on your event page. Optional — leave empty if you don&apos;t need it.
          </p>
        </div>
        <div className="w-full sm:w-60">
          <Label>Tab name on your event page</Label>
          <CreatableSelect value={tabLabel} onChange={onTabLabelChange} options={TAB_LABEL_PRESETS} placeholder="Partner with us" />
        </div>
      </div>

      {/* Preset library */}
      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        {(["SPONSORSHIP", "EXHIBITION", "ADVERTISING", "VENDOR"] as const).map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          return (
            <div key={cat} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <Icon className="h-3.5 w-3.5" /> {CATEGORY_META[cat].label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PACKAGE_PRESETS.filter((p) => p.category === cat).map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => add(draftFromPreset(p))}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-violet-300 hover:text-violet-700"
                  >
                    <Plus className="h-3 w-3" /> {p.title.replace(/ \(.+\)$/, "")}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => add(blankDraft(cat))}
                  className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-500 hover:border-violet-300 hover:text-violet-700"
                >
                  <Plus className="h-3 w-3" /> Custom
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {packages.length > 0 && (
        <div className="mt-5 space-y-2">
          {packages.map((pkg, index) => {
            const open = expandedId === pkg.id;
            const Icon = CATEGORY_ICONS[pkg.category];
            const perUnit = pkg.pricingModel === "PER_SQM" || pkg.pricingModel === "PER_UNIT";
            return (
              <div key={pkg.id} className={cn("rounded-xl border bg-white", pkg.highlight ? "border-violet-200" : "border-slate-200")}>
                <div className="flex items-center gap-2 px-2 py-2">
                  <MoveButtons index={index} count={packages.length} onMove={move} />
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <input
                    className="min-w-0 flex-1 bg-transparent px-1 text-sm font-semibold text-ink-800 outline-none placeholder:font-normal placeholder:text-red-400"
                    value={pkg.title}
                    placeholder="Name this package"
                    maxLength={80}
                    aria-label="Package name"
                    onChange={(e) => update(pkg.id, { title: e.target.value })}
                  />
                  <span className="hidden whitespace-nowrap text-xs font-medium text-slate-500 sm:inline">{priceSummary(pkg)}</span>
                  {pkg.quantityTaken > 0 && (
                    <span className="hidden rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 sm:inline">{pkg.quantityTaken} booked</span>
                  )}
                  <button
                    type="button"
                    onClick={() => add({ ...pkg, id: crypto.randomUUID(), title: `${pkg.title} (copy)`, quantityTaken: 0 })}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Duplicate package"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(packages.filter((p) => p.id !== pkg.id))}
                    disabled={pkg.quantityTaken > 0}
                    title={pkg.quantityTaken > 0 ? "Has bookings — can't remove" : undefined}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                    aria-label="Remove package"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : pkg.id)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-expanded={open}
                    aria-label={open ? "Collapse package" : "Edit package"}
                  >
                    <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
                  </button>
                </div>

                {open && (
                  <div className="space-y-5 border-t border-slate-100 p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Type</Label>
                        <select
                          className="h-11 w-full rounded-xl border border-slate-100 bg-white px-3 text-sm"
                          value={pkg.category}
                          onChange={(e) => update(pkg.id, { category: e.target.value as PartnerCategory })}
                        >
                          {PARTNER_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {CATEGORY_META[c].label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>How it&apos;s priced</Label>
                        <select
                          className="h-11 w-full rounded-xl border border-slate-100 bg-white px-3 text-sm"
                          value={pkg.pricingModel}
                          onChange={(e) => {
                            const pricingModel = e.target.value as PricingModel;
                            update(pkg.id, { pricingModel, ...(pricingModel === "ON_REQUEST" && { requiresApproval: true }) });
                          }}
                        >
                          {PRICING_MODELS.map((m) => (
                            <option key={m} value={m}>
                              {PRICING_LABELS[m]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-4">
                      {pkg.pricingModel !== "ON_REQUEST" && (
                        <div>
                          <Label>
                            Price (₦){pkg.pricingModel === "PER_SQM" ? " per m²" : pkg.pricingModel === "PER_UNIT" ? ` per ${pkg.unitLabel || "unit"}` : ""}
                          </Label>
                          <Input type="number" inputMode="decimal" min={0} value={pkg.price} placeholder="0" onChange={(e) => update(pkg.id, { price: e.target.value })} />
                        </div>
                      )}
                      {pkg.pricingModel === "PER_UNIT" && (
                        <div>
                          <Label>Unit name</Label>
                          <Input value={pkg.unitLabel} maxLength={20} placeholder="booth, stand, slot…" onChange={(e) => update(pkg.id, { unitLabel: e.target.value })} />
                        </div>
                      )}
                      {perUnit && (
                        <>
                          <div>
                            <Label>Min per booking</Label>
                            <Input type="number" min={1} value={pkg.minUnits} onChange={(e) => update(pkg.id, { minUnits: e.target.value })} />
                          </div>
                          <div>
                            <Label>Max per booking</Label>
                            <Input type="number" min={1} value={pkg.maxUnits} placeholder="No limit" onChange={(e) => update(pkg.id, { maxUnits: e.target.value })} />
                          </div>
                        </>
                      )}
                      <div>
                        <Label>{pkg.pricingModel === "PER_SQM" ? "Total m² available" : perUnit ? `Total ${pkg.unitLabel || "unit"}s` : "Slots available"}</Label>
                        <Input
                          type="number"
                          min={Math.max(1, pkg.quantityTaken)}
                          value={pkg.quantity}
                          placeholder="Unlimited"
                          onChange={(e) => update(pkg.id, { quantity: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <textarea
                        rows={2}
                        maxLength={500}
                        value={pkg.description}
                        onChange={(e) => update(pkg.id, { description: e.target.value })}
                        placeholder="A short pitch for this package"
                        className="w-full rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus:border-violet-400"
                      />
                    </div>

                    <BenefitsEditor benefits={pkg.benefits} onChange={(benefits) => update(pkg.id, { benefits })} />

                    <div>
                      <Label>Booking</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          { v: true, t: "Review applications first", h: "You approve each partner, then they pay. Best for sponsors." },
                          { v: false, t: "Book & pay instantly", h: "Businesses pay right away. Best for stands & stalls." },
                        ].map((o) => {
                          const disabled = !o.v && (pkg.pricingModel === "ON_REQUEST" || !Number(pkg.price));
                          return (
                            <button
                              key={o.t}
                              type="button"
                              disabled={disabled}
                              onClick={() => update(pkg.id, { requiresApproval: o.v })}
                              className={cn(
                                "rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40",
                                pkg.requiresApproval === o.v ? "border-violet-500 bg-violet-50" : "border-slate-200 hover:border-slate-300"
                              )}
                            >
                              <span className="block text-sm font-medium text-ink-800">{o.t}</span>
                              <span className="block text-xs text-slate-500">{o.h}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <Toggle checked={pkg.highlight} onChange={(highlight) => update(pkg.id, { highlight })} label="Highlight" hint={`Shown as "Most popular"`} />
                      <Toggle checked={pkg.logoOnTicket} onChange={(logoOnTicket) => update(pkg.id, { logoOnTicket })} label="Logo on tickets" hint="Printed on every attendee ticket" />
                      <Toggle checked={pkg.showOnEventPage} onChange={(showOnEventPage) => update(pkg.id, { showOnEventPage })} label="Logo on event page" hint="In the sponsors & exhibitors wall" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
