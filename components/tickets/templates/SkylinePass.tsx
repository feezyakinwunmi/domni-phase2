import { CalendarDays, MapPin, Ticket as TicketIcon } from "lucide-react";
import { ParticleOverlay } from "../ParticleOverlay";
import type { TicketCustomization, TicketRenderData } from "../types";

export default function SkylinePass({
  data,
  customization,
}: {
  data: TicketRenderData;
  customization?: TicketCustomization;
}) {
  const accent = customization?.accentColor || "#1d4ed8";
  const overlay = customization?.particleOverlay ?? "geometric";

  return (
    <div className="flex w-[560px] overflow-hidden rounded-[24px] bg-white shadow-2xl">
      <div
        className="relative flex w-[190px] flex-shrink-0 flex-col justify-between p-6 text-white"
        style={{
          backgroundImage: `linear-gradient(160deg, ${accent}, ${accent}cc 60%, #0b1220)`,
        }}
      >
        <ParticleOverlay variant={overlay} color="#ffffff" opacity={0.5} />

        <div className="relative">
          {customization?.logoUrl ? (
            <img
              src={customization.logoUrl}
              alt=""
              className="h-9 w-9 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <TicketIcon className="h-4 w-4" />
            </div>
          )}

          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/70">
            Admission Pass
          </p>
          <h1 className="mt-1 text-base font-bold leading-tight">
            {data.eventName}
          </h1>
        </div>

        <div className="relative">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">
            Class
          </p>
          <p className="mt-1 text-sm font-semibold uppercase tracking-wide">
            {data.ticketType}
          </p>
        </div>
      </div>

      <div className="relative flex flex-1 items-center px-3">
        <div className="flex h-[85%] w-px flex-col items-center justify-between">
          <div className="h-2 w-2 rounded-full bg-slate-100" />
          <div className="flex-1 border-l border-dashed border-slate-200" />
          <div className="h-2 w-2 rounded-full bg-slate-100" />
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Attendee
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            {data.attendeeName}
          </h2>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" style={{ color: accent }} />
              <span>{data.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" style={{ color: accent }} />
              <span>{data.venue}</span>
            </div>
          </div>

          {data.extraFields && data.extraFields.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
              {data.extraFields.map((field) => (
                <div key={field.label}>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                    {field.label}
                  </p>
                  <p className="text-xs font-medium text-slate-800">
                    {field.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div
            className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: `${accent}14`, color: accent }}
          >
            Valid Ticket
          </div>

          {data.qr && (
            <img src={data.qr} alt="Ticket QR code" className="h-20 w-20" />
          )}
        </div>
      </div>
    </div>
  );
}
