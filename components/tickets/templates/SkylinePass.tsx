import { CalendarDays, MapPin, Ticket as TicketIcon } from "lucide-react";
import { ParticleOverlay } from "../ParticleOverlay";
import { resolveTicketTheme, TicketFinishLayer, TicketFooter, TicketPhoto, visibleExtras } from "../theme";
import type { TicketTemplateProps } from "../types";

export default function SkylinePass({ data, customization }: TicketTemplateProps) {
  const t = resolveTicketTheme(customization, {
    accent: "#1d4ed8",
    secondary: "#0b1220",
    headline: "Admission Pass",
    overlay: "geometric",
  });
  const extras = visibleExtras(data, t);

  return (
    <div className={`relative flex w-[560px] overflow-hidden rounded-[24px] bg-white shadow-2xl ${t.fontClass}`}>
      <div
        className="relative flex w-[190px] flex-shrink-0 flex-col justify-between p-6 text-white"
        style={{ backgroundImage: `linear-gradient(160deg, ${t.accent}, ${t.accent}cc 60%, ${t.secondary})` }}
      >
        <ParticleOverlay variant={t.overlay} color="#ffffff" opacity={0.5} />

        <div className="relative">
          {t.logoUrl ? (
            <img src={t.logoUrl} crossOrigin="anonymous" alt="" className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <TicketIcon className="h-4 w-4" />
            </div>
          )}

          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/70">{t.headline}</p>
          <h1 className="mt-1 text-base font-bold leading-tight">{data.eventName}</h1>
        </div>

        <div className="relative">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">Class</p>
          <p className="mt-1 text-sm font-semibold uppercase tracking-wide">{data.ticketType}</p>
        </div>
      </div>

      <div className="relative flex items-center px-3">
        <div className="flex h-[85%] w-px flex-col items-center justify-between">
          <div className="h-2 w-2 rounded-full bg-slate-100" />
          <div className="flex-1 border-l border-dashed border-slate-200" />
          <div className="h-2 w-2 rounded-full bg-slate-100" />
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <div className="flex items-center gap-3">
            <TicketPhoto data={data} ring={t.accent} size={72} square />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Attendee</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">{data.attendeeName}</h2>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            {t.show.date && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" style={{ color: t.accent }} />
                <span>{data.date}</span>
              </div>
            )}
            {t.show.venue && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" style={{ color: t.accent }} />
                <span>{data.venue}</span>
              </div>
            )}
          </div>

          {extras.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
              {extras.map((field) => (
                <div key={field.label}>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{field.label}</p>
                  <p className="break-words text-xs font-medium text-slate-800">{field.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div className="space-y-2">
            <div
              className="inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide"
              style={{ backgroundColor: `${t.accent}14`, color: t.accent }}
            >
              Valid Ticket
            </div>
            <TicketFooter data={data} theme={t} className="flex-col !items-start" />
          </div>

          {data.qr ? <img src={data.qr} alt="Ticket QR code" className="h-20 w-20" /> : <div className="h-20 w-20" />}
        </div>
      </div>

      <TicketFinishLayer finish={t.finish} rounded="rounded-[24px]" />
    </div>
  );
}
