import { TicketCard } from "@/components/ui/ticket-card";

export function AuthSidePanel() {
  return (
    <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-ink-800 p-12 lg:flex">
      <div className="pointer-events-none absolute inset-0 bg-domni-radial" />
      <div className="pointer-events-none absolute -bottom-40 -left-20 h-[420px] w-[420px] rounded-full bg-violet-500/20 blur-[110px]" />

      <a href="/" className="relative font-display text-xl font-bold text-white">
        DOMNI
      </a>

      <div className="relative flex flex-col gap-6">
        <div className="w-[300px] animate-float">
          <TicketCard
            eventTitle="Faculty Dinner"
            sectionLabel="Awards Night · VIP"
            holderName="Ada Nwosu"
            code="DMN-7F3K21"
          />
        </div>
        <blockquote className="max-w-sm text-lg font-medium leading-snug text-white">
          "We sold out our faculty dinner in three days and never touched a
          spreadsheet once."
        </blockquote>
        <p className="text-sm text-slate-400">
          Funmilayo A. — Events Lead, Faculty of Engineering
        </p>
      </div>

      <p className="relative text-xs text-slate-500">
        © {new Date().getFullYear()} DOMNI. Powering campus experiences.
      </p>
    </div>
  );
}
