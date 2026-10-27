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
  extraFields?: TicketExtraField[];
}

export type ParticleVariant = "none" | "dots" | "geometric" | "confetti";

export interface TicketCustomization {
  logoUrl?: string;
  accentColor?: string;
  particleOverlay?: ParticleVariant;
}
