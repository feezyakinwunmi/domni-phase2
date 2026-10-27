import AuroraMinimal from "./templates/AuroraMinimal";
import VelvetNoir from "./templates/VelvetNoir";
import SkylinePass from "./templates/SkylinePass";
import GildedReserve from "./templates/GildedReserve";
import Nightpulse from "./templates/Nightpulse";
import PrismEdition from "./templates/PrismEdition";
import type { TicketCustomization, TicketRenderData } from "./types";

const templates = {
  "aurora-minimal": AuroraMinimal,
  "velvet-noir": VelvetNoir,
  "skyline-pass": SkylinePass,
  "gilded-reserve": GildedReserve,
  nightpulse: Nightpulse,
  "prism-edition": PrismEdition,
};

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
  const Component =
    templates[(templateKey as keyof typeof templates) || DEFAULT_TEMPLATE_KEY] ??
    templates[DEFAULT_TEMPLATE_KEY];

  return <Component data={data} customization={customization ?? undefined} />;
}
