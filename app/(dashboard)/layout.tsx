"use client";

import Link from "next/link";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarPlus,
  Vote,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import { signOut } from "@/app/(auth)/actions";

const navItems = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Create event",
    href: "/organizer/events/new",
    icon: CalendarPlus,
  },
  {
    label: "Voting",
    href: "/organizer/voting",
    icon: Vote,
  },
  {
    label: "Settings",
    href: "/organizer/settings",
    icon: Settings,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <Link
          href="/"
          className="font-display text-xl font-bold text-slate-900"
        >
         <img src="/domni.png" alt="DOMNI" className="h-8 w-8" />
        </Link>

        <button
          onClick={() => setOpen(true)}
          className="rounded-xl p-2 hover:bg-slate-100"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-screen w-64 flex-col
          border-r border-slate-100 bg-white p-5
          transition-transform duration-300

          ${
            open
              ? "translate-x-0"
              : "-translate-x-full"
          }

          lg:translate-x-0
        `}
      >
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-xl font-bold text-slate-900"
          >
            <img src="/domni.png" alt="DOMNI" className="h-14 w-16" />
          </Link>

          <button
            onClick={() => setOpen(false)}
            className="rounded-xl p-2 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-10 flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-500"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </form>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 pt-20 lg:ml-64 lg:p-10 lg:pt-10">
        {children}
      </main>
    </div>
  );
}
