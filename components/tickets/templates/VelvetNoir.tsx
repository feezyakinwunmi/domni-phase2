import { CalendarDays, MapPin } from "lucide-react";
import { ParticleOverlay } from "../ParticleOverlay";
import { resolveTicketTheme, TicketFinishLayer, TicketFooter, TicketPhoto, visibleExtras } from "../theme";
import type { TicketTemplateProps } from "../types";

export default function VelvetNoir({ data, customization }: TicketTemplateProps) {
  const t = resolveTicketTheme(customization, {
    accent: "#d4b483",
    secondary: "#2b1650",
    headline: "Exclusive Admission",
    overlay: "geometric",
  });
  const extras = visibleExtras(data, t);

  return (
    <div
      className={`relative w-[340px] overflow-hidden rounded-[28px] p-[1px] shadow-2xl ${t.fontClass}`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${t.accent}55, transparent 30%, transparent 70%, ${t.accent}55)`,
      }}
    >
      <div
        className="relative overflow-hidden rounded-[27px] p-7 text-white"
        style={{ backgroundImage: `linear-gradient(135deg, #1c1130, ${t.secondary} 50%, #0b0714)` }}
      >
        <ParticleOverlay variant={t.overlay} color={t.accent} opacity={0.5} />

        <div className="relative">
          {t.logoUrl && (
            <img
              src={t.logoUrl}
              crossOrigin="anonymous"
              alt=""
              className="mb-4 h-9 w-9 rounded-full object-cover"
              style={{ boxShadow: `0 0 0 1px ${t.accent}66` }}
            />
          )}

          <p className="text-[10px] font-semibold uppercase tracking-[0.35em]" style={{ color: t.accent }}>
            {t.headline}
          </p>

          <h1 className="mt-2 text-xl font-bold leading-snug tracking-wide">{data.eventName}</h1>

          <div className="mt-8 flex items-center gap-4">
            <TicketPhoto data={data} ring={t.accent} size={60} />
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">Guest</p>
              <h2 className="mt-1 text-2xl font-semibold">{data.attendeeName}</h2>
            </div>
          </div>

          <div
            className="mt-5 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide"
            style={{ borderColor: `${t.accent}88`, color: t.accent }}
          >
            {data.ticketType}
          </div>

          <div className="relative my-7 flex items-center">
            <div className="h-px flex-1 border-t border-dashed" style={{ borderColor: `${t.accent}55` }} />
            <div className="mx-2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.accent }} />
            <div className="h-px flex-1 border-t border-dashed" style={{ borderColor: `${t.accent}55` }} />
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

          <div className="mt-7 flex justify-center rounded-2xl bg-white p-4">
            {data.qr ? <img src={data.qr} alt="Ticket QR code" className="h-32 w-32" /> : <div className="h-32 w-32" />}
          </div>

          <TicketFooter data={data} theme={t} tone="dark" className="mt-4" />
        </div>
      </div>

      <TicketFinishLayer finish={t.finish} />
    </div>
  );
}
