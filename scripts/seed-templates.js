// Wipes and reseeds the ticket_templates table with the canonical 6 designs.
// Safe to rerun only while no ticket_types/events/tickets reference these rows
// (the FK constraint will fail loudly otherwise, rather than silently orphan data).
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const templates = [
  {
    name: "Aurora Minimal",
    templateKey: "aurora-minimal",
    isPremium: false,
    orientation: "portrait",
    config: { style: "minimal", primaryColor: "#0f172a", particleOverlay: "dots" },
  },
  {
    name: "Velvet Noir",
    templateKey: "velvet-noir",
    isPremium: false,
    orientation: "portrait",
    config: { style: "elegant-dark", primaryColor: "#d4b483", particleOverlay: "geometric" },
  },
  {
    name: "Skyline Pass",
    templateKey: "skyline-pass",
    isPremium: false,
    orientation: "landscape",
    config: { style: "corporate", primaryColor: "#1d4ed8", particleOverlay: "geometric" },
  },
  {
    name: "Gilded Reserve",
    templateKey: "gilded-reserve",
    isPremium: true,
    orientation: "portrait",
    config: { style: "premium-gold", primaryColor: "#d4af37", particleOverlay: "dots" },
  },
  {
    name: "Nightpulse",
    templateKey: "nightpulse",
    isPremium: true,
    orientation: "landscape",
    config: { style: "concert", primaryColor: "#ec4899", particleOverlay: "confetti" },
  },
  {
    name: "Prism Edition",
    templateKey: "prism-edition",
    isPremium: true,
    orientation: "portrait",
    config: { style: "glass", primaryColor: "#8b5cf6", particleOverlay: "geometric" },
  },
];

async function main() {
  await p.ticketTemplate.deleteMany({});
  for (const t of templates) {
    await p.ticketTemplate.create({ data: t });
  }
  const rows = await p.ticketTemplate.findMany({
    select: { name: true, templateKey: true, isPremium: true },
  });
  console.log(JSON.stringify(rows, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
