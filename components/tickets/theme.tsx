import type { CSSProperties } from "react";
import type { ParticleVariant, TicketCustomization, TicketFinish, TicketFont, TicketRenderData } from "./types";

export interface TemplateDefaults {
  accent: string;
  secondary: string;
  headline: string;
  overlay: ParticleVariant;
  font?: TicketFont;
}

export interface TicketTheme {
  accent: string;
  secondary: string;
  headline: string;
  overlay: ParticleVariant;
  finish: TicketFinish;
  fontClass: string;
  logoUrl?: string;
  footerNote?: string;
  show: { date: boolean; venue: boolean; extra: boolean; number: boolean };
}

const FONT_CLASSES: Record<TicketFont, string> = {
  default: "font-body",
  serif: "font-serif",
  mono: "font-mono",
  display: "font-display tracking-tight",
};

/** Merges a template's built-in look with the organizer's customization. */
export function resolveTicketTheme(c: TicketCustomization | undefined, d: TemplateDefaults): TicketTheme {
  return {
    accent: c?.accentColor || d.accent,
    secondary: c?.secondaryColor || d.secondary,
    headline: c?.headline?.trim() || d.headline,
    overlay: c?.particleOverlay ?? d.overlay,
    finish: c?.finish ?? "none",
    fontClass: FONT_CLASSES[c?.fontStyle ?? d.font ?? "default"],
    logoUrl: c?.logoUrl,
    footerNote: c?.footerNote?.trim() || undefined,
    show: {
      date: c?.showDate ?? true,
      venue: c?.showVenue ?? true,
      extra: c?.showExtraFields ?? true,
      number: c?.showTicketNumber ?? true,
    },
  };
}

export function visibleExtras(data: TicketRenderData, theme: TicketTheme) {
  return theme.show.extra ? data.extraFields?.filter((f) => f.value) ?? [] : [];
}

/**
 * Surface finish laid over the whole ticket. Pure CSS so it prints and
 * screenshots identically; `rounded` must match the ticket's corner radius.
 */
export function TicketFinishLayer({ finish, rounded = "rounded-[28px]" }: { finish: TicketFinish; rounded?: string }) {
  if (finish === "none") return null;

  const styles: Record<Exclude<TicketFinish, "none">, CSSProperties> = {
    gloss: {
      backgroundImage:
        "linear-gradient(115deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.28) 42%, rgba(255,255,255,0) 55%), linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0) 40%)",
    },
    foil: {
      backgroundImage:
        "linear-gradient(125deg, rgba(255,0,128,0.18), rgba(255,200,0,0.16) 20%, rgba(0,255,170,0.16) 40%, rgba(0,160,255,0.18) 60%, rgba(170,0,255,0.16) 80%, rgba(255,0,128,0.18))",
      mixBlendMode: "color-dodge",
    },
    grain: {
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")",
      mixBlendMode: "overlay",
      opacity: 0.55,
    },
  };

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-20 ${rounded}`}
      style={styles[finish]}
    />
  );
}

/** Ticket number + organizer's footer note, shared by every template. */
export function TicketFooter({
  data,
  theme,
  tone = "light",
  className = "",
}: {
  data: TicketRenderData;
  theme: TicketTheme;
  tone?: "light" | "dark";
  className?: string;
}) {
  const showNumber = theme.show.number && data.ticketNumber;
  if (!showNumber && !theme.footerNote) return null;

  const muted = tone === "dark" ? "text-white/50" : "text-slate-400";

  return (
    <div className={`relative flex items-end justify-between gap-3 ${className}`}>
      {theme.footerNote ? (
        <p className={`max-w-[70%] text-[10px] leading-snug ${muted}`}>{theme.footerNote}</p>
      ) : (
        <span />
      )}
      {showNumber && (
        <p className={`font-mono text-[10px] font-semibold tracking-[0.15em] ${muted}`}>{data.ticketNumber}</p>
      )}
    </div>
  );
}

/** Attendee's registration photo (when the organizer collects one). */
export function TicketPhoto({
  data,
  ring,
  size = 56,
  className = "",
  square = false,
}: {
  data: TicketRenderData;
  ring: string;
  size?: number;
  className?: string;
  square?: boolean;
}) {
  if (!data.photoUrl) return null;
  return (
    <img
      src={data.photoUrl}
      alt=""
      crossOrigin="anonymous"
      style={{ width: size, height: size, boxShadow: `0 0 0 2px ${ring}` }}
      className={`flex-shrink-0 object-cover ${square ? "rounded-2xl" : "rounded-full"} ${className}`}
    />
  );
}
