// Creates a published demo event with 2 ticket types and a full set of
// sponsorship / exhibition / advertising / vendor packages, plus two confirmed
// demo sponsors so the logo wall and "Supported by" ticket strip show up.
//
//   node scripts/seed-demo-event.js                 → uses the first organizer/admin account
//   node scripts/seed-demo-event.js you@email.com   → creates it under that account
//   add --force to create another copy when one already exists
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const naira = (n) => Math.round(n * 100);

// Simple SVG logos (data URIs) so no uploads are needed for the demo.
const logo = (text, bg, fg = "#ffffff") =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80" viewBox="0 0 240 80"><rect width="240" height="80" rx="16" fill="${bg}"/><text x="120" y="52" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="${fg}" text-anchor="middle">${text}</text></svg>`
  );

async function findOrganizer(email) {
  if (email) {
    const profile = await p.profile.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (!profile) throw new Error(`No account found for ${email}. Sign up first, then rerun.`);
    return profile;
  }
  const profile =
    (await p.profile.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } })) ??
    (await p.profile.findFirst({ where: { role: "ORGANIZER" }, orderBy: { createdAt: "asc" } })) ??
    (await p.profile.findFirst({ orderBy: { createdAt: "asc" } }));
  if (!profile) throw new Error("No accounts exist yet. Sign up in the app first, then rerun.");
  return profile;
}

const DEMO_TITLE = "Lagos Tech & Innovation Expo 2026";

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const organizer = await findOrganizer(args.find((a) => !a.startsWith("--")));

  const existing = await p.event.findFirst({ where: { title: DEMO_TITLE, organizerId: organizer.id }, select: { id: true, slug: true } });
  if (existing && !force) {
    const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    console.log("\nℹ️  A demo event already exists — not creating another.");
    console.log("   Public page:", `${site}/events/${existing.slug}`);
    console.log("   (Add --force to create a second copy anyway.)\n");
    return;
  }

  const template = await p.ticketTemplate.findFirst({ where: { templateKey: "aurora-minimal" } });

  const startsAt = new Date(Date.now() + 21 * 86_400_000); // 3 weeks from now
  startsAt.setUTCHours(9, 0, 0, 0); // 10:00 Lagos time
  const endsAt = new Date(startsAt.getTime() + 9 * 3_600_000);
  const suffix = Math.random().toString(36).slice(2, 7);

  const event = await p.event.create({
    data: {
      organizerId: organizer.id,
      title: DEMO_TITLE,
      slug: `lagos-tech-innovation-expo-2026-${suffix}`,
      description:
        "A full day of talks, product demos and networking with founders, students and builders from across Nigeria.\n\nExplore the exhibition floor, catch keynotes on AI and fintech, and connect with the companies hiring right now.",
      venue: "Landmark Event Centre, Victoria Island",
      schoolName: "DOMNI Events",
      status: "PUBLISHED",
      featured: true,
      startsAt,
      endsAt,
      details: {
        hostLabel: "Organization",
        venueLabel: "Venue",
        nameLabel: "Full Name",
        emailLabel: "Email",
        partnerTabLabel: "Exhibit & Sponsor",
        extras: [
          { id: "dress", label: "Dress code", value: "Smart casual" },
          { id: "gates", label: "Gate opens", value: "9:00 AM" },
        ],
      },
      registrationFields: {
        create: [
          { label: "Phone number", type: "phone", fieldType: "phone", required: true, sortOrder: 0 },
          {
            label: "How did you hear about us?",
            type: "select",
            fieldType: "select",
            required: false,
            options: ["Instagram", "X / Twitter", "WhatsApp", "A friend", "Other"],
            sortOrder: 1,
          },
        ],
      },
      sections: {
        create: [
          {
            title: "Admission",
            description: "Access to the exhibition floor and all talks.",
            sortOrder: 0,
            ticketTypes: {
              create: [
                {
                  title: "Regular",
                  description: "Exhibition floor + all keynote sessions.",
                  perks: ["Exhibition access", "All keynotes", "Networking lounge"],
                  priceKobo: 0,
                  quantity: 500,
                  maxPerBuyer: 2,
                  ticketTemplateId: template?.id ?? null,
                },
                {
                  title: "VIP",
                  description: "Front-row seating, VIP lounge and lunch.",
                  perks: ["Front-row seats", "VIP lounge", "Lunch included", "Speaker meet & greet"],
                  priceKobo: naira(15000),
                  quantity: 80,
                  maxPerBuyer: 4,
                  ticketTemplateId: template?.id ?? null,
                },
              ],
            },
          },
        ],
      },
      partnerPackages: {
        create: [
          {
            category: "SPONSORSHIP",
            title: "Headline Sponsor",
            description: "Exclusive top billing — the expo is presented by your brand.",
            benefits: ["“Presented by” naming rights", "Largest logo on all banners & screens", "Logo on every attendee ticket", "5-minute keynote slot", "Premium 36m² stand", "10 VIP passes"],
            pricingModel: "ON_REQUEST",
            priceKobo: 0,
            quantity: 1,
            requiresApproval: true,
            highlight: true,
            logoOnTicket: true,
            sortOrder: 0,
          },
          {
            category: "SPONSORSHIP",
            title: "Gold Sponsor",
            description: "Prominent brand visibility before, during and after the expo.",
            benefits: ["Logo on main stage banner", "Logo on attendee tickets", "Exhibition booth included", "3 social media features", "5 VIP passes"],
            pricingModel: "FIXED",
            priceKobo: naira(500000),
            quantity: 3,
            requiresApproval: true,
            highlight: true,
            logoOnTicket: true,
            sortOrder: 1,
          },
          {
            category: "SPONSORSHIP",
            title: "Silver Sponsor",
            description: "Strong presence with logo placement and shout-outs.",
            benefits: ["Logo on sponsor wall", "MC shout-out", "1 social media feature", "3 regular passes"],
            pricingModel: "FIXED",
            priceKobo: naira(250000),
            quantity: 5,
            requiresApproval: true,
            sortOrder: 2,
          },
          {
            category: "EXHIBITION",
            title: "Standard Booth (3m × 3m)",
            description: "Shell scheme booth with a table, two chairs and power.",
            benefits: ["9m² space", "1 table & 2 chairs", "Power socket", "Listing in event guide", "2 exhibitor passes"],
            pricingModel: "PER_UNIT",
            priceKobo: naira(75000),
            unitLabel: "booth",
            minUnits: 1,
            maxUnits: 4,
            quantity: 20,
            requiresApproval: false,
            sortOrder: 3,
          },
          {
            category: "EXHIBITION",
            title: "Raw Exhibition Space",
            description: "Bring your own setup. Pay only for the floor area you need.",
            benefits: ["Choose your own size", "Bring your own branding & furniture", "Exhibitor passes by size"],
            pricingModel: "PER_SQM",
            priceKobo: naira(10000),
            minUnits: 9,
            maxUnits: 100,
            quantity: 400,
            requiresApproval: true,
            sortOrder: 4,
          },
          {
            category: "ADVERTISING",
            title: "Logo on Tickets",
            description: "Your logo printed on every ticket attendees download and carry.",
            benefits: ["Logo on every attendee ticket", "Logo on event page sponsor wall"],
            pricingModel: "FIXED",
            priceKobo: naira(80000),
            quantity: 4,
            requiresApproval: false,
            logoOnTicket: true,
            sortOrder: 5,
          },
          {
            category: "ADVERTISING",
            title: "Social Media Shout-out",
            description: "Dedicated posts about your brand on our social channels.",
            benefits: ["Feature post with your content", "Tagged in stories"],
            pricingModel: "PER_UNIT",
            priceKobo: naira(15000),
            unitLabel: "post",
            minUnits: 1,
            maxUnits: 10,
            requiresApproval: false,
            sortOrder: 6,
          },
          {
            category: "VENDOR",
            title: "Food & Drinks Stall",
            description: "Sell food and drinks to attendees throughout the day.",
            benefits: ["Stall space in the food court", "Access from setup to close", "2 vendor passes"],
            pricingModel: "FIXED",
            priceKobo: naira(40000),
            quantity: 10,
            requiresApproval: true,
            sortOrder: 7,
          },
        ],
      },
    },
    include: { partnerPackages: true },
  });

  // Two confirmed demo partners so the sponsor wall + ticket logo strip are visible.
  const gold = event.partnerPackages.find((x) => x.title === "Gold Sponsor");
  const ticketLogo = event.partnerPackages.find((x) => x.title === "Logo on Tickets");
  const demoPartners = [
    { pkg: gold, companyName: "PayWave", logoUrl: logo("PayWave", "#4A3FBF"), website: "https://example.com" },
    { pkg: ticketLogo, companyName: "Kora Cloud", logoUrl: logo("Kora Cloud", "#0EA5E9"), website: null },
  ];
  for (const d of demoPartners) {
    if (!d.pkg) continue;
    await p.partnerApplication.create({
      data: {
        packageId: d.pkg.id,
        eventId: event.id,
        companyName: d.companyName,
        contactName: "Demo Contact",
        email: `demo+${d.companyName.toLowerCase().replace(/\s+/g, "")}@example.com`,
        logoUrl: d.logoUrl,
        website: d.website,
        units: 1,
        amountKobo: d.pkg.priceKobo,
        status: "PAID",
        reservedUnits: 1,
        notes: "Demo partner created by the seed script.",
      },
    });
    await p.partnerPackage.update({ where: { id: d.pkg.id }, data: { quantityTaken: { increment: 1 } } });
  }

  // One application waiting for review, so the organizer panel has something to act on.
  const space = event.partnerPackages.find((x) => x.pricingModel === "PER_SQM");
  if (space) {
    await p.partnerApplication.create({
      data: {
        packageId: space.id,
        eventId: event.id,
        companyName: "Greenleaf Solar",
        contactName: "Tolu Adeyemi",
        email: "demo+greenleaf@example.com",
        phone: "08012345678",
        units: 18,
        amountKobo: space.priceKobo * 18,
        status: "PENDING",
        notes: "We'd like 18m² near the entrance to demo our home solar kits.",
      },
    });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  console.log("\n✅ Demo event created under", organizer.email);
  console.log("   Public page:     ", `${site}/events/${event.slug}`);
  console.log("   Partner tab:     ", `${site}/events/${event.slug}#partner`);
  console.log("   Organizer view:  ", `${site}/organizer/events/${event.id}`);
  console.log("   Edit:            ", `${site}/organizer/events/${event.id}/edit\n`);
}

main()
  .catch((e) => {
    console.error("\n❌", e.message || e);
    if (/partner_packages|does not exist/i.test(String(e.message))) {
      console.error("   The partner tables are missing — run `npm run db:sync` first.");
    }
    process.exitCode = 1;
  })
  .finally(() => p.$disconnect());
