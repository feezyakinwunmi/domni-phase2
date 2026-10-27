import type React from "react";
import AuroraMinimal from "./templates/AuroraMinimal";
import VelvetNoir from "./templates/VelvetNoir";
import SkylinePass from "./templates/SkylinePass";
import GildedReserve from "./templates/GildedReserve";
import Nightpulse from "./templates/Nightpulse";
import PrismEdition from "./templates/PrismEdition";
import BoardingPass from "./templates/BoardingPass";
import Editorial from "./templates/Editorial";
import HoloFoil from "./templates/HoloFoil";
import type { TicketCustomization, TicketRenderData, TicketTemplateProps } from "./types";

const templates: Record<string, (props: TicketTemplateProps) => React.ReactElement> = {
  "aurora-minimal": AuroraMinimal,
  "velvet-noir": VelvetNoir,
  "skyline-pass": SkylinePass,
  "gilded-reserve": GildedReserve,
  nightpulse: Nightpulse,
  "prism-edition": PrismEdition,
  "boarding-pass": BoardingPass,
  editorial: Editorial,
  "holo-foil": HoloFoil,
};

/** Landscape designs are wider; pickers use this to pick a thumbnail scale. */
export const LANDSCAPE_TEMPLATES = new Set(["skyline-pass", "nightpulse", "boarding-pass"]);

export const DEFAULT_TEMPLATE_KEY = "aurora-minimal";

export default function TicketRenderer({
  templateKey,
  data,
  customization,
}: {
  templateKey?: string | null;
  data: TicketRenderData;
  customization?: TicketCustomization | null;
}) {
  const Component = templates[templateKey || DEFAULT_TEMPLATE_KEY] ?? templates[DEFAULT_TEMPLATE_KEY];
  return <Component data={data} customization={customization ?? undefined} />;
}
