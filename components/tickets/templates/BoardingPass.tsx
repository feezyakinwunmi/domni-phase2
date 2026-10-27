import { Plane } from "lucide-react";
import { ParticleOverlay } from "../ParticleOverlay";
import { resolveTicketTheme, TicketFinishLayer, TicketFooter, TicketPhoto, visibleExtras } from "../theme";
import type { TicketTemplateProps } from "../types";

function Cell({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold uppercase text-slate-900">{value}</p>
    </div>
  );
}

export default function BoardingPass({ data, customization }: TicketTemplateProps) {
  const t = resolveTicketTheme(customization, {
    accent: "#0ea5e9",
    secondary: "#0f172a",
    headline: "Boarding Pass",
    overlay: "none",
    font: "mono",
  });
  const extras = visibleExtras(data, t).slice(0, 4);

  return (
    <div className={`relative flex w-[560px] overflow-hidden rounded-[20px] bg-white shadow-2xl ${t.fontClass}`}>
      <div className="flex flex-1 flex-col">
        <div
          className="relative flex items-center justify-between px-6 py-4 text-white"
          style={{ backgroundImage: `linear-gradient(90deg, ${t.secondary}, ${t.accent})` }}
        >
          <ParticleOverlay variant={t.overlay} color="#ffffff" opacity={0.5} />
          <div className="relative flex items-center gap-3">
            {t.logoUrl ? (
              <img src={t.logoUrl} crossOrigin="anonymous" alt="" className="h-8 w-8 rounded-md bg-white object-cover" />
            ) : (
              <Plane className="h-5 w-5 -rotate-45" />
            )}
            <p className="text-xs font-bold uppercase tracking-[0.3em]">{t.headline}</p>
          </div>
          <p className="relative text-[10px] uppercase tracking-[0.2em] text-white/70">{data.ticketType}</p>
        </div>

        <div className="flex-1 px-6 py-5">
          <div className="flex items-center gap-4">
            <TicketPhoto data={data} ring={t.accent} size={80} square />
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">Event</p>
              <h1 className="mt-0.5 text-xl font-bold leading-tight text-slate-900">{data.eventName}</h1>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-4">
            <Cell label="Passenger" value={data.attendeeName} wide />
            {t.show.date && <Cell label="Date" value={data.date} wide />}
            {t.show.venue && <Cell label="Gate" value={data.venue} wide />}
            <Cell label="Class" value={data.ticketType} wide={!t.show.venue} />
            {extras.map((f) => (
              <Cell key={f.label} label={f.label} value={f.value} />
            ))}
          </div>

          <TicketFooter data={data} theme={t} className="mt-5" />
        </div>
      </div>

      <div className="relative w-6 flex-shrink-0">
        <div className="absolute -top-3 left-0 h-6 w-6 rounded-full bg-slate-100" />
        <div className="absolute inset-y-4 left-1/2 border-l-2 border-dotted border-slate-200" />
        <div className="absolute -bottom-3 left-0 h-6 w-6 rounded-full bg-slate-100" />
      </div>

      <div className="flex w-[160px] flex-shrink-0 flex-col items-center justify-between py-5 pr-5">
        <div className="w-full rounded-lg px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-white" style={{ backgroundColor: t.accent }}>
          Admit
        </div>
        {data.qr ? <img src={data.qr} alt="Ticket QR code" className="h-28 w-28" /> : <div className="h-28 w-28" />}
        <p className="text-center text-[10px] font-bold uppercase leading-tight text-slate-700">{data.attendeeName}</p>
      </div>

      <TicketFinishLayer finish={t.finish} rounded="rounded-[20px]" />
    </div>
  );
}
