import { ParticleOverlay } from "../ParticleOverlay";
import { resolveTicketTheme, TicketFinishLayer, TicketFooter, TicketPhoto, visibleExtras } from "../theme";
import type { TicketTemplateProps } from "../types";

/** Magazine-cover look: ivory stock, oversized serif, hairline rules, wax-seal stamp. */
export default function Editorial({ data, customization }: TicketTemplateProps) {
  const t = resolveTicketTheme(customization, {
    accent: "#9f1239",
    secondary: "#f7f1e3",
    headline: "Admit One",
    overlay: "none",
    font: "serif",
  });
  const extras = visibleExtras(data, t);

  return (
    <div
      className={`relative w-[340px] overflow-hidden rounded-[6px] p-7 text-stone-900 shadow-2xl ${t.fontClass}`}
      style={{ backgroundColor: t.secondary, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35), inset 0 0 0 8px rgba(255,255,255,0.35)" }}
    >
      <ParticleOverlay variant={t.overlay} color={t.accent} opacity={0.35} />

      <div className="relative">
        <div className="flex items-center justify-between border-b border-stone-900 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em]">{t.headline}</p>
          {t.logoUrl ? (
            <img src={t.logoUrl} crossOrigin="anonymous" alt="" className="h-7 w-7 rounded-full object-cover grayscale" />
          ) : (
            <p className="text-[10px] italic">No. {data.ticketNumber?.replace(/^DMN-/, "") ?? "001"}</p>
          )}
        </div>

        <h1 className="mt-6 text-[34px] font-bold leading-[1.05] tracking-tight">{data.eventName}</h1>

        <div className="mt-6 h-[3px] w-14" style={{ backgroundColor: t.accent }} />

        <div className="mt-6 flex items-center gap-4">
          <TicketPhoto data={data} ring="#1c1917" size={58} square className="grayscale-[30%]" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">In honour of</p>
            <h2 className="mt-1 text-2xl italic">{data.attendeeName}</h2>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-stone-300 py-4 text-sm">
          <div>
            <p className="text-[9px] uppercase tracking-[0.25em] text-stone-500">Entry</p>
            <p className="font-semibold">{data.ticketType}</p>
          </div>
          {t.show.date && (
            <div>
              <p className="text-[9px] uppercase tracking-[0.25em] text-stone-500">When</p>
              <p className="font-semibold">{data.date}</p>
            </div>
          )}
          {t.show.venue && (
            <div className="col-span-2">
              <p className="text-[9px] uppercase tracking-[0.25em] text-stone-500">Where</p>
              <p className="font-semibold">{data.venue}</p>
            </div>
          )}
          {extras.map((f) => (
            <div key={f.label}>
              <p className="text-[9px] uppercase tracking-[0.25em] text-stone-500">{f.label}</p>
              <p className="break-words font-semibold">{f.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-end justify-between">
          {data.qr ? (
            <img src={data.qr} alt="Ticket QR code" className="h-28 w-28 mix-blend-multiply" />
          ) : (
            <div className="h-28 w-28" />
          )}

          <div
            className="flex h-20 w-20 rotate-[-12deg] items-center justify-center rounded-full text-center text-[9px] font-bold uppercase leading-tight tracking-widest text-white shadow-md"
            style={{ backgroundColor: t.accent, boxShadow: `inset 0 0 0 3px ${t.secondary}55` }}
          >
            Official
            <br />
            Entry
          </div>
        </div>

        <TicketFooter data={data} theme={t} className="mt-4 [&_p]:!text-stone-500" />
      </div>

      <TicketFinishLayer finish={t.finish} rounded="rounded-[6px]" />
    </div>
  );
}
