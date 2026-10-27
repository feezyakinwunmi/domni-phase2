import { CalendarDays, MapPin } from "lucide-react";
import { ParticleOverlay } from "../ParticleOverlay";
import { resolveTicketTheme, TicketFinishLayer, TicketFooter, TicketPhoto, visibleExtras } from "../theme";
import type { TicketTemplateProps } from "../types";

function BarcodeBars({ color }: { color: string }) {
  const widths = [2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1, 1, 4, 2];

  return (
    <div className="flex h-8 items-stretch gap-[2px]" aria-hidden="true">
      {widths.map((w, i) => (
        <div key={i} style={{ width: `${w * 2}px`, backgroundColor: color }} className="opacity-70" />
      ))}
    </div>
  );
}

export default function Nightpulse({ data, customization }: TicketTemplateProps) {
  const t = resolveTicketTheme(customization, {
    accent: "#ec4899",
    secondary: "#6d28d9",
    headline: "Live Event Pass",
    overlay: "confetti",
    font: "display",
  });
  const extras = visibleExtras(data, t);

  return (
    <div
      className={`relative flex w-[560px] overflow-hidden rounded-[24px] text-white shadow-2xl ${t.fontClass}`}
      style={{ backgroundImage: `linear-gradient(120deg, ${t.accent}, ${t.secondary} 55%, #0e1b3d)` }}
    >
      <ParticleOverlay variant={t.overlay} color="#ffffff" opacity={0.7} />

      <div className="relative flex flex-1 flex-col justify-between p-7">
        <div>
          <div className="flex items-center gap-3">
            {t.logoUrl && (
              <img src={t.logoUrl} crossOrigin="anonymous" alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-white/40" />
            )}
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/70">{t.headline}</p>
          </div>

          <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight">{data.eventName}</h1>

          <div className="mt-6 flex items-center gap-3">
            <TicketPhoto data={data} ring="rgba(255,255,255,0.7)" size={72} square />
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/50">Attendee</p>
              <h2 className="mt-1 text-xl font-bold">{data.attendeeName}</h2>
            </div>
          </div>
        </div>

        <div>
          {(t.show.date || t.show.venue) && (
            <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
              {t.show.date && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <span>{data.date}</span>
                </div>
              )}
              {t.show.venue && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{data.venue}</span>
                </div>
              )}
            </div>
          )}

          {extras.length > 0 && (
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-black/20 p-3">
              {extras.map((field) => (
                <div key={field.label}>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-white/50">{field.label}</p>
                  <p className="break-words text-xs font-medium text-white">{field.value}</p>
                </div>
              ))}
            </div>
          )}

          <TicketFooter data={data} theme={t} tone="dark" className="mt-3" />
        </div>
      </div>

      <div className="relative flex w-[180px] flex-shrink-0 flex-col items-center justify-between border-l border-dashed border-white/30 bg-black/20 p-5 backdrop-blur-sm">
        <span className="rounded-full bg-white px-3 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-black">
          {data.ticketType}
        </span>

        {data.qr ? (
          <img src={data.qr} alt="Ticket QR code" className="h-24 w-24 rounded-lg bg-white p-1.5" />
        ) : (
          <div className="h-24 w-24" />
        )}

        <BarcodeBars color="#ffffff" />
      </div>

      <TicketFinishLayer finish={t.finish} rounded="rounded-[24px]" />
    </div>
  );
}
