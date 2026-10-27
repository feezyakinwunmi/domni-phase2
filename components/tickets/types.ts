export interface TicketExtraField {
  label: string;
  value: string;
}

export interface TicketRenderData {
  eventName: string;
  attendeeName: string;
  ticketType: string;
  date: string;
  venue: string;
  qr: string;
  ticketNumber?: string | null;
  photoUrl?: string | null;
  extraFields?: TicketExtraField[];
}

export type ParticleVariant = "none" | "dots" | "geometric" | "confetti" | "waves" | "stars";
export type TicketFont = "default" | "serif" | "mono" | "display";
export type TicketFinish = "none" | "gloss" | "foil" | "grain";

export interface TicketCustomization {
  logoUrl?: string;
  accentColor?: string;
  secondaryColor?: string;
  particleOverlay?: ParticleVariant;
  fontStyle?: TicketFont;
  finish?: TicketFinish;
  /** Replaces the small eyebrow text, e.g. "Admit One", "Backstage", "Founders Circle". */
  headline?: string;
  footerNote?: string;
  showDate?: boolean;
  showVenue?: boolean;
  showExtraFields?: boolean;
  showTicketNumber?: boolean;
}

export type TicketTemplateProps = {
  data: TicketRenderData;
  customization?: TicketCustomization;
};
