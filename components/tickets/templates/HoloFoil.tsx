import { CalendarDays, MapPin, Star } from "lucide-react";
import { ParticleOverlay } from "../ParticleOverlay";
import { resolveTicketTheme, TicketFinishLayer, TicketFooter, TicketPhoto, visibleExtras } from "../theme";
import type { TicketTemplateProps } from "../types";

/** Collector-card look: brushed-metal body, iridescent foil band, embossed name. */
export default function HoloFoil({ data, customization }: TicketTemplateProps) {
  const t = resolveTicketTheme(customization, {
    accent: "#c0c7d6",
    secondary: "#a78bfa",
    headline: "Collector's Pass",
    overlay: "stars",
    font: "display",
  });
  // The foil look *is* this design, so default the finish to foil.
  const finish = customization?.finish ?? "foil";
  const extras = visibleExtras(data, t);

  const metal = `linear-gradient(145deg, #1f2433 0%, #3a4150 22%, #222838 45%, #4a5265 68%, #1b2030 100%)`;
  const foil = `linear-gradient(100deg, ${t.secondary}, #f0abfc 20%, #67e8f9 40%, #fde68a 60%, ${t.secondary} 80%, #f0abfc)`;

  return (
    <div className={`relative w-[340px] overflow-hidden rounded-[22px] p-[2px] shadow-2xl ${t.fontClass}`} style={{ backgroundImage: foil }}>
      <div className="relative overflow-hidden rounded-[20px] p-7 text-white" style={{ backgroundImage: metal }}>
        <ParticleOverlay variant={t.overlay} color={t.accent} opacity={0.45} />

        <div className="relative">
          <div className="flex items-center justify-between">
            {t.logoUrl ? (
              <img src={t.logoUrl} crossOrigin="anonymous" alt="" className="h-9 w-9 rounded-lg object-cover ring-1 ring-white/30" />
            ) : (
              <Star className="h-5 w-5" style={{ color: t.accent }} fill={t.accent} />
            )}
            <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-900" style={{ backgroundImage: foil }}>
              {data.ticketType}
            </span>
          </div>

          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.35em]" style={{ color: t.accent }}>
            {t.headline}
          </p>
          <h1 className="mt-2 text-2xl font-extrabold leading-tight">{data.eventName}</h1>

          <div className="my-6 h-10 rounded-lg opacity-90" style={{ backgroundImage: foil }} aria-hidden="true" />

          <div className="flex items-center gap-4">
            <TicketPhoto data={data} ring={t.secondary} size={60} square />
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/50">Holder</p>
              <h2
                className="mt-1 text-2xl font-bold uppercase tracking-wide"
                style={{ color: t.accent, textShadow: "0 1px 0 rgba(255,255,255,0.35), 0 -1px 0 rgba(0,0,0,0.6)" }}
              >
                {data.attendeeName}
              </h2>
            </div>
          </div>

          <div className="mt-5 space-y-2 text-sm text-white/80">
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
            <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
              {extras.map((field) => (
                <div key={field.label}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{field.label}</p>
                  <p className="mt-0.5 break-words text-sm font-medium text-white/90">{field.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-center rounded-2xl bg-white p-4">
            {data.qr ? <img src={data.qr} alt="Ticket QR code" className="h-32 w-32" /> : <div className="h-32 w-32" />}
          </div>

          <TicketFooter data={data} theme={t} tone="dark" className="mt-4" />
        </div>
      </div>

      <TicketFinishLayer finish={finish} rounded="rounded-[22px]" />
    </div>
  );
}
