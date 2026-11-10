// Removes extra copies of the demo event made by seed-demo-event.js, keeping
// the oldest one. Only deletes copies with no tickets issued and no real
// payments, so it can never remove anything a real person paid for.
//
//   node scripts/remove-duplicate-demo.js            → shows what would be deleted
//   node scripts/remove-duplicate-demo.js --confirm  → actually deletes
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const DEMO_TITLE = "Lagos Tech & Innovation Expo 2026";
const confirm = process.argv.includes("--confirm");

async function main() {
  const events = await p.event.findMany({
    where: { title: DEMO_TITLE },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      createdAt: true,
      sections: { select: { ticketTypes: { select: { _count: { select: { tickets: true } } } } } },
      partnerApplications: { select: { transactionId: true } },
    },
  });

  if (events.length <= 1) {
    console.log(events.length ? "Only one demo event exists — nothing to remove." : "No demo events found.");
    return;
  }

  const [keep, ...extras] = events;
  console.log(`Keeping:  /events/${keep.slug} (created ${keep.createdAt.toLocaleString()})`);

  for (const e of extras) {
    const tickets = e.sections.flatMap((s) => s.ticketTypes).reduce((n, t) => n + t._count.tickets, 0);
    const payments = e.partnerApplications.filter((a) => a.transactionId).length;
    if (tickets > 0 || payments > 0) {
      console.log(`Skipping: /events/${e.slug} — it has ${tickets} ticket(s) and ${payments} partner payment(s).`);
      continue;
    }
    if (!confirm) {
      console.log(`Would delete: /events/${e.slug} (created ${e.createdAt.toLocaleString()})`);
      continue;
    }
    // Packages, applications, sections, ticket types and form fields cascade with the event.
    await p.event.delete({ where: { id: e.id } });
    console.log(`Deleted:  /events/${e.slug}`);
  }

  if (!confirm) console.log("\nNothing deleted yet. Run again with --confirm to delete the copies listed above.");
}

main()
  .catch((e) => {
    console.error("❌", e.message || e);
    process.exitCode = 1;
  })
  .finally(() => p.$disconnect());
