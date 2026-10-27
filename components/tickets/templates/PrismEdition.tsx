import { CalendarDays, MapPin, Sparkles } from "lucide-react";
import { ParticleOverlay } from "../ParticleOverlay";
import { resolveTicketTheme, TicketFinishLayer, TicketFooter, TicketPhoto, visibleExtras } from "../theme";
import type { TicketTemplateProps } from "../types";

export default function PrismEdition({ data, customization }: TicketTemplateProps) {
  const t = resolveTicketTheme(customization, {
    accent: "#8b5cf6",
    secondary: "#22d3ee",
    headline: "Prism Edition",
    overlay: "geometric",
  });
  const extras = visibleExtras(data, t);

  return (
    <div className={`relative w-[340px] overflow-hidden rounded-[28px] bg-[#0a0a12] shadow-2xl ${t.fontClass}`}>
      {/* soft blurred gradient mesh */}
      <div className="pointer-events-none absolute -inset-10" aria-hidden="true">
        <div className="absolute -left-8 -top-8 h-40 w-40 rounded-full blur-3xl" style={{ backgroundColor: t.accent, opacity: 0.55 }} />
        <div className="absolute right-0 top-16 h-36 w-36 rounded-full blur-3xl" style={{ backgroundColor: t.secondary, opacity: 0.35 }} />
        <div className="absolute bottom-0 left-10 h-44 w-44 rounded-full blur-3xl" style={{ backgroundColor: "#f472b6", opacity: 0.3 }} />
      </div>

      {/* holographic border ring */}
      <div
        className="absolute inset-0 rounded-[28px] p-[1.5px]"
        style={{ backgroundImage: `conic-gradient(from 180deg, ${t.accent}, ${t.secondary}, #f472b6, ${t.accent})` }}
      >
        <div className="h-full w-full rounded-[27px] bg-[#0a0a12]/60" />
      </div>

      <div className="relative m-[1.5px] rounded-[27px] border border-white/10 bg-white/5 p-7 text-white backdrop-blur-xl">
        <ParticleOverlay variant={t.overlay} color="#ffffff" opacity={0.35} />

        <div className="relative">
          {t.logoUrl ? (
            <img src={t.logoUrl} crossOrigin="anonymous" alt="" className="h-9 w-9 rounded-xl object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
              <Sparkles className="h-4 w-4" style={{ color: t.accent }} />
            </div>
          )}

          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.35em]" style={{ color: t.accent }}>
            {t.headline}
          </p>

          <h1 className="mt-2 text-xl font-bold leading-snug">{data.eventName}</h1>

          <div className="mt-8 flex items-center gap-4">
            <TicketPhoto data={data} ring={t.accent} size={60} />
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">Attendee</p>
              <h2 className="mt-1 text-2xl font-semibold">{data.attendeeName}</h2>
            </div>
          </div>

          <div
            className="mt-5 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
            style={{ backgroundColor: `${t.accent}55` }}
          >
            {data.ticketType}
          </div>

          <div className="relative my-7 flex items-center">
            <div className="h-px flex-1 border-t border-dashed border-white/20" />
            <div className="mx-2 h-1.5 w-1.5 rounded-full bg-white/50" />
            <div className="h-px flex-1 border-t border-dashed border-white/20" />
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
            <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              {extras.map((field) => (
                <div key={field.label}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{field.label}</p>
                  <p className="mt-0.5 break-words text-sm font-medium text-white/90">{field.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-7 flex justify-center rounded-2xl border border-white/10 bg-white p-4">
            {data.qr ? <img src={data.qr} alt="Ticket QR code" className="h-32 w-32" /> : <div className="h-32 w-32" />}
          </div>

          <TicketFooter data={data} theme={t} tone="dark" className="mt-4" />
        </div>
      </div>

      <TicketFinishLayer finish={t.finish} />
    </div>
  );
}
