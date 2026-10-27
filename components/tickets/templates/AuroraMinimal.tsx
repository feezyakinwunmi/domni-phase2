import { CalendarDays, MapPin, Ticket as TicketIcon } from "lucide-react";
import { ParticleOverlay } from "../ParticleOverlay";
import type { TicketCustomization, TicketRenderData } from "../types";

export default function AuroraMinimal({
  data,
  customization,
}: {
  data: TicketRenderData;
  customization?: TicketCustomization;
}) {
  const accent = customization?.accentColor || "#0f172a";
  const overlay = customization?.particleOverlay ?? "dots";

  return (
    <div className="relative w-[340px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
      <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />

      <ParticleOverlay variant={overlay} color={accent} opacity={0.5} />

      <div className="relative p-7">
        <div className="flex items-center gap-3">
          {customization?.logoUrl ? (
            <img
              src={customization.logoUrl}
              alt=""
              className="h-9 w-9 rounded-lg object-cover"
            />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${accent}14` }}
            >
              <TicketIcon className="h-4 w-4" style={{ color: accent }} />
            </div>
          )}

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Admission
            </p>
            <h1 className="text-lg font-bold leading-tight text-slate-900">
              {data.eventName}
            </h1>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Ticket Holder
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            {data.attendeeName}
          </h2>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
            style={{ backgroundColor: accent }}
          >
            {data.ticketType}
          </span>
        </div>

        <div className="relative my-7 flex items-center">
          <div className="h-px flex-1 border-t border-dashed border-slate-300" />
          <div className="mx-2 h-2 w-2 rounded-full bg-white ring-2 ring-slate-200" />
          <div className="h-px flex-1 border-t border-dashed border-slate-300" />
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3 text-slate-600">
            <CalendarDays className="h-4 w-4 flex-shrink-0" style={{ color: accent }} />
            <span>{data.date}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600">
            <MapPin className="h-4 w-4 flex-shrink-0" style={{ color: accent }} />
            <span>{data.venue}</span>
          </div>
        </div>

        {data.extraFields && data.extraFields.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            {data.extraFields.map((field) => (
              <div key={field.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {field.label}
                </p>
                <p className="mt-0.5 text-sm font-medium text-slate-800">
                  {field.value}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-7 flex justify-center rounded-2xl border border-slate-100 bg-slate-50 p-4">
          {data.qr && (
            <img src={data.qr} alt="Ticket QR code" className="h-32 w-32" />
          )}
        </div>
      </div>
    </div>
  );
}
