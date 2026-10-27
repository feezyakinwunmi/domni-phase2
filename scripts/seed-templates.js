// Upserts the canonical ticket designs by templateKey. Safe to rerun at any
// time: existing rows (and every ticket type/ticket pointing at them) are kept.
//   node scripts/seed-templates.js
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const templates = [
  { name: "Aurora Minimal", templateKey: "aurora-minimal", isPremium: false, orientation: "portrait", config: { style: "minimal", primaryColor: "#0f172a", particleOverlay: "dots" } },
  { name: "Velvet Noir", templateKey: "velvet-noir", isPremium: false, orientation: "portrait", config: { style: "elegant-dark", primaryColor: "#d4b483", particleOverlay: "geometric" } },
  { name: "Skyline Pass", templateKey: "skyline-pass", isPremium: false, orientation: "landscape", config: { style: "corporate", primaryColor: "#1d4ed8", particleOverlay: "geometric" } },
  { name: "Boarding Pass", templateKey: "boarding-pass", isPremium: false, orientation: "landscape", config: { style: "travel", primaryColor: "#0ea5e9", particleOverlay: "none" } },
  { name: "Gilded Reserve", templateKey: "gilded-reserve", isPremium: true, orientation: "portrait", config: { style: "premium-gold", primaryColor: "#d4af37", particleOverlay: "dots" } },
  { name: "Nightpulse", templateKey: "nightpulse", isPremium: true, orientation: "landscape", config: { style: "concert", primaryColor: "#ec4899", particleOverlay: "confetti" } },
  { name: "Prism Edition", templateKey: "prism-edition", isPremium: true, orientation: "portrait", config: { style: "glass", primaryColor: "#8b5cf6", particleOverlay: "geometric" } },
  { name: "Editorial", templateKey: "editorial", isPremium: true, orientation: "portrait", config: { style: "editorial-serif", primaryColor: "#9f1239", particleOverlay: "none" } },
  { name: "Holo Foil", templateKey: "holo-foil", isPremium: true, orientation: "portrait", config: { style: "holographic", primaryColor: "#c0c7d6", particleOverlay: "stars" } },
];

async function main() {
  for (const t of templates) {
    await p.ticketTemplate.upsert({
      where: { templateKey: t.templateKey },
      update: { name: t.name, isPremium: t.isPremium, orientation: t.orientation, config: t.config },
      create: t,
    });
  }
  const rows = await p.ticketTemplate.findMany({
    select: { name: true, templateKey: true, isPremium: true },
    orderBy: { createdAt: "asc" },
  });
  console.table(rows);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => p.$disconnect());
