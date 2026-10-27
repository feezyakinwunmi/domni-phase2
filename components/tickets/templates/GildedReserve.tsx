import { CalendarDays, MapPin, Gem } from "lucide-react";
import { ParticleOverlay } from "../ParticleOverlay";
import { resolveTicketTheme, TicketFinishLayer, TicketFooter, TicketPhoto, visibleExtras } from "../theme";
import type { TicketTemplateProps } from "../types";

function Corner({ className, accent }: { className: string; accent: string }) {
  return (
    <svg viewBox="0 0 40 40" className={`pointer-events-none absolute h-9 w-9 ${className}`} aria-hidden="true">
      <path d="M2 20 V2 H20" fill="none" stroke={accent} strokeWidth="1.2" strokeOpacity="0.8" />
      <path d="M8 12 V8 H12" fill="none" stroke={accent} strokeWidth="1" strokeOpacity="0.6" />
    </svg>
  );
}

export default function GildedReserve({ data, customization }: TicketTemplateProps) {
  const t = resolveTicketTheme(customization, {
    accent: "#d4af37",
    secondary: "#0b0b0d",
    headline: "Gilded Reserve",
    overlay: "dots",
    font: "serif",
  });
  const extras = visibleExtras(data, t);

  return (
    <div
      className={`relative w-[340px] overflow-hidden rounded-[26px] p-7 text-white shadow-2xl ${t.fontClass}`}
      style={{
        backgroundColor: t.secondary,
        boxShadow: `0 0 0 1px ${t.accent}55, 0 25px 50px -12px rgba(0,0,0,0.6)`,
      }}
    >
      <ParticleOverlay variant={t.overlay} color={t.accent} opacity={0.4} />

      <Corner className="left-3 top-3" accent={t.accent} />
      <Corner className="right-3 top-3 rotate-90" accent={t.accent} />
      <Corner className="bottom-3 right-3 rotate-180" accent={t.accent} />
      <Corner className="bottom-3 left-3 -rotate-90" accent={t.accent} />

      <div
        className="absolute right-6 top-6 rotate-12 rounded px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-black"
        style={{ backgroundColor: t.accent }}
      >
        Reserve
      </div>

      <div className="relative">
        {t.logoUrl ? (
          <img
            src={t.logoUrl}
            crossOrigin="anonymous"
            alt=""
            className="h-9 w-9 rounded-full object-cover"
            style={{ boxShadow: `0 0 0 1px ${t.accent}` }}
          />
        ) : (
          <Gem className="h-5 w-5" style={{ color: t.accent }} />
        )}

        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.35em]" style={{ color: t.accent }}>
          {t.headline}
        </p>

        <h1 className="mt-2 text-xl font-bold leading-snug">{data.eventName}</h1>

        <div className="mt-8 flex items-center gap-4">
          <TicketPhoto data={data} ring={t.accent} size={60} />
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">Reserved For</p>
            <h2 className="mt-1 text-2xl font-semibold">{data.attendeeName}</h2>
          </div>
        </div>

        <div
          className="mt-5 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide"
          style={{ borderColor: t.accent, color: t.accent }}
        >
          {data.ticketType}
        </div>

        <div className="relative my-7 flex items-center">
          <div
            className="h-px flex-1"
            style={{ backgroundImage: `repeating-linear-gradient(90deg, ${t.accent}88 0 6px, transparent 6px 12px)` }}
          />
          <div className="mx-2 h-1.5 w-1.5 rotate-45" style={{ backgroundColor: t.accent }} />
          <div
            className="h-px flex-1"
            style={{ backgroundImage: `repeating-linear-gradient(90deg, ${t.accent}88 0 6px, transparent 6px 12px)` }}
          />
        </div>

        <div className="space-y-3 text-sm text-white/80">
          {t.show.date && (
            <div className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4 flex-shrink-0" style={{ color: t.accent }} />
              <span>{data.date}</span>
            </div>
          )}
          {t.show.venue && (
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 flex-shrink-0" style={{ color: t.accent }} />
              <span>{data.venue}</span>
            </div>
          )}
        </div>

        {extras.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl p-4" style={{ boxShadow: `inset 0 0 0 1px ${t.accent}44` }}>
            {extras.map((field) => (
              <div key={field.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{field.label}</p>
                <p className="mt-0.5 break-words text-sm font-medium text-white/90">{field.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-7 flex justify-center rounded-2xl bg-white p-4" style={{ boxShadow: `0 0 0 1px ${t.accent}` }}>
          {data.qr ? <img src={data.qr} alt="Ticket QR code" className="h-32 w-32" /> : <div className="h-32 w-32" />}
        </div>

        <TicketFooter data={data} theme={t} tone="dark" className="mt-4" />
      </div>

      <TicketFinishLayer finish={t.finish} rounded="rounded-[26px]" />
    </div>
  );
}
