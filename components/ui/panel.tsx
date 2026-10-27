import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-800 md:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-slate-500">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "warning";
}) {
  return (
    <div className={cn("rounded-2xl border bg-white p-5", tone === "warning" ? "border-amber-200" : "border-slate-200")}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink-800">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function Card({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white", className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-ink-800">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const BADGE_TONES: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
  slate: "bg-slate-50 text-slate-600 ring-slate-500/20",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
};

export function Badge({ tone = "slate", children }: { tone?: keyof typeof BADGE_TONES; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", BADGE_TONES[tone])}>{children}</span>;
}

export const STATUS_TONE: Record<string, keyof typeof BADGE_TONES> = {
  SUCCESSFUL: "green",
  PENDING: "amber",
  FAILED: "red",
  REVERSED: "slate",
  PUBLISHED: "green",
  DRAFT: "amber",
  CANCELLED: "red",
  ENDED: "slate",
  VALID: "blue",
  CHECKED_IN: "green",
  PRO: "violet",
  FREE: "slate",
  ADMIN: "red",
  ORGANIZER: "violet",
  ATTENDEE: "slate",
};

export function Table({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: string }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-5 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
      {!hasRows && <p className="px-5 py-12 text-center text-sm text-slate-400">{empty ?? "Nothing here yet."}</p>}
    </div>
  );
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("whitespace-nowrap px-5 py-3 text-slate-600", className)}>{children}</td>;
}

/** Plain GET form: filters live in the URL, so views are shareable and server-rendered. */
export function FilterBar({
  q,
  placeholder,
  selects = [],
}: {
  q?: string;
  placeholder: string;
  selects?: { name: string; value?: string; options: { value: string; label: string }[] }[];
}) {
  return (
    <form className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4" role="search">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-violet-400"
        />
      </div>
      {selects.map((s) => (
        <select key={s.name} name={s.name} defaultValue={s.value ?? ""} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
      <button className="h-10 rounded-xl bg-ink-800 px-4 text-sm font-medium text-white hover:bg-ink-700">Apply</button>
    </form>
  );
}

export function Pagination({
  page,
  total,
  pageSize,
  basePath,
  params,
}: {
  page: number;
  total: number;
  pageSize: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    sp.set("page", String(p));
    return `${basePath}?${sp.toString()}`;
  };

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
      <span>
        {total.toLocaleString()} result{total === 1 ? "" : "s"} · page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <Link
          href={href(page - 1)}
          aria-disabled={page <= 1}
          className={cn("flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50", page <= 1 && "pointer-events-none opacity-40")}
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </Link>
        <Link
          href={href(page + 1)}
          aria-disabled={page >= pages}
          className={cn("flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50", page >= pages && "pointer-events-none opacity-40")}
        >
          Next <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
