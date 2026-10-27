"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarPlus,
  Crown,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  ShieldCheck,
  Ticket,
  Vote,
  X,
} from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

export interface ShellUser {
  name: string;
  email: string;
  plan: string;
  isAdmin: boolean;
}

const GROUPS = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/organizer/events/new", label: "Create event", icon: CalendarPlus },
      { href: "/organizer/voting", label: "Voting", icon: Vote },
    ],
  },
  {
    label: "Explore",
    items: [{ href: "/events", label: "Browse events", icon: Ticket }],
  },
  {
    label: "Account",
    items: [{ href: "/organizer/settings", label: "Settings", icon: Settings }],
  },
];

export function DashboardShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard" aria-label="DOMNI home">
          <img src="/domni.png" alt="DOMNI" className="h-9 w-auto" />
        </Link>
        <button onClick={() => setOpen(true)} className="rounded-xl p-2 hover:bg-slate-100" aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-20 items-center justify-between px-6">
          <Link href="/dashboard" aria-label="DOMNI home">
            <img src="/domni.png" alt="DOMNI" className="h-12 w-auto" />
          </Link>
          <button onClick={() => setOpen(false)} className="rounded-xl p-2 hover:bg-slate-100 lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4">
          <Link
            href="/organizer/events/new"
            onClick={() => setOpen(false)}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-domni-gradient text-sm font-semibold text-white shadow-glow transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> New event
          </Link>
        </div>

        <nav className="mt-6 flex-1 space-y-6 overflow-y-auto px-4">
          {GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href, "exact" in item ? item.exact : false);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                        active ? "bg-violet-50 text-violet-700" : "text-slate-500 hover:bg-slate-50 hover:text-ink-800"
                      )}
                    >
                      <item.icon className={cn("h-[18px] w-[18px]", active ? "text-violet-600" : "text-slate-400 group-hover:text-slate-600")} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {user.isAdmin && (
            <div>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Platform</p>
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-ink-800"
              >
                <ShieldCheck className="h-[18px] w-[18px] text-slate-400" />
                Admin panel
              </Link>
            </div>
          )}
        </nav>

        {user.plan !== "PRO" && (
          <Link
            href="/organizer/settings#plan"
            onClick={() => setOpen(false)}
            className="mx-4 mb-4 rounded-2xl bg-ink-800 p-4 text-white transition hover:bg-ink-700"
          >
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Crown className="h-4 w-4 text-amber-300" /> Go Pro
            </p>
            <p className="mt-1 text-xs text-white/60">Premium ticket designs, your branding, and more.</p>
          </Link>
        )}

        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
              {initials || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink-800">
                <span className="truncate">{user.name}</span>
                {user.plan === "PRO" && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">PRO</span>}
              </p>
              <p className="truncate text-xs text-slate-400">{user.email}</p>
            </div>
            <form action={signOut}>
              <button type="submit" className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500" aria-label="Log out" title="Log out">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="px-4 pb-16 pt-24 lg:ml-[17rem] lg:px-10 lg:pt-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
