import { CalendarDays, MapPin } from "lucide-react";
import { ParticleOverlay } from "../ParticleOverlay";
import type { TicketCustomization, TicketRenderData } from "../types";

export default function VelvetNoir({
  data,
  customization,
}: {
  data: TicketRenderData;
  customization?: TicketCustomization;
}) {
  const accent = customization?.accentColor || "#d4b483";
  const overlay = customization?.particleOverlay ?? "geometric";

  return (
    <div
      className="relative w-[340px] overflow-hidden rounded-[28px] p-[1px] shadow-2xl"
      style={{
        backgroundImage: `linear-gradient(135deg, ${accent}55, transparent 30%, transparent 70%, ${accent}55)`,
      }}
    >
      <div className="relative overflow-hidden rounded-[27px] bg-gradient-to-br from-[#1c1130] via-[#2b1650] to-[#0b0714] p-7 text-white">
        <ParticleOverlay variant={overlay} color={accent} opacity={0.5} />

        <div className="relative">
          {customization?.logoUrl && (
            <img
              src={customization.logoUrl}
              alt=""
              className="mb-4 h-9 w-9 rounded-full object-cover ring-1"
              style={{ boxShadow: `0 0 0 1px ${accent}66` }}
            />
          )}

          <p
            className="text-[10px] font-semibold uppercase tracking-[0.35em]"
            style={{ color: accent }}
          >
            Exclusive Admission
          </p>

          <h1 className="mt-2 text-xl font-bold leading-snug tracking-wide">
            {data.eventName}
          </h1>

          <div className="mt-8">
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
              Guest
            </p>
            <h2 className="mt-1 text-2xl font-semibold">{data.attendeeName}</h2>
          </div>

          <div
            className="mt-5 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide"
            style={{ borderColor: `${accent}88`, color: accent }}
          >
            {data.ticketType}
          </div>

          <div className="relative my-7 flex items-center">
            <div
              className="h-px flex-1 border-t border-dashed"
              style={{ borderColor: `${accent}55` }}
            />
            <div
              className="mx-2 h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: accent }}
            />
            <div
              className="h-px flex-1 border-t border-dashed"
              style={{ borderColor: `${accent}55` }}
            />
          </div>

          <div className="space-y-3 text-sm text-white/80">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4 flex-shrink-0" style={{ color: accent }} />
              <span>{data.date}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 flex-shrink-0" style={{ color: accent }} />
              <span>{data.venue}</span>
            </div>
          </div>

          {data.extraFields && data.extraFields.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              {data.extraFields.map((field) => (
                <div key={field.label}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                    {field.label}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-white/90">
                    {field.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-7 flex justify-center rounded-2xl bg-white p-4">
            {data.qr && (
              <img src={data.qr} alt="Ticket QR code" className="h-32 w-32" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
