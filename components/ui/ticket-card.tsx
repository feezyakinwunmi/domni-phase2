import { cn } from "@/lib/utils";

interface TicketCardProps {
  eventTitle: string;
  sectionLabel: string; // e.g. "AWARDS NIGHT · VIP"
  holderName?: string;
  code: string; // short reference shown in mono font
  accent?: "violet" | "ink" | "pulse";
  className?: string;
}

/**
 * A physical-ticket-shaped card: rounded rectangle, two semicircular
 * notches cut into the long edges, a dashed perforation line splitting
 * the stub from the main body, and a QR placeholder in the stub.
 * This is DOMNI's recurring visual signature — grounded in the real
 * object a ticketing platform issues, not a decorative gradient blob.
 */
export function TicketCard({
  eventTitle,
  sectionLabel,
  holderName,
  code,
  accent = "violet",
  className,
}: TicketCardProps) {
  const accentBg =
    accent === "violet"
      ? "bg-domni-gradient"
      : accent === "pulse"
      ? "bg-pulse"
      : "bg-ink-800";

  return (
    <div
      className={cn(
        "ticket-notch flex w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-soft",
        className
      )}
    >
      {/* Main stub */}
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-violet-500">
            {sectionLabel}
          </p>
          <h4 className="mt-1 font-display text-lg font-semibold text-ink-800">
            {eventTitle}
          </h4>
        </div>
        {holderName && (
          <p className="mt-4 text-sm text-slate-500">{holderName}</p>
        )}
      </div>

      {/* Perforation */}
      <div className="perforation my-3 text-slate-100" />

      {/* QR stub */}
      <div className={cn("flex w-24 flex-col items-center justify-center gap-2 p-4", accentBg)}>
        <div className="grid grid-cols-4 gap-[2px]">
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 w-2 rounded-[1px]",
                [0, 1, 3, 4, 6, 9, 11, 12, 14, 15].includes(i)
                  ? "bg-white"
                  : "bg-white/20"
              )}
            />
          ))}
        </div>
        <span className="font-mono text-[9px] tracking-wider text-white/80">
          {code}
        </span>
      </div>
    </div>
  );
}
