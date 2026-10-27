const columns = [
  {
    title: "Product",
    links: ["Ticketing", "QR Check-in", "Voting", "Analytics", "Pricing"],
  },
  {
    title: "Organizers",
    links: ["Create an event", "Organizer guide", "Payouts", "API"],
  },
  {
    title: "Company",
    links: ["About", "Contact", "Terms", "Privacy"],
  },
];

export function Footer() {
  return (
    <footer className="bg-ink-800 pt-20 text-slate-400">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 border-b border-white/10 pb-14 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
<img src="/domni.png" alt="DOMNI" className="h-20 w-20" />
            <p className="mt-4 max-w-xs text-sm">
              Event infrastructure for campuses — ticketing, check-in, and
              voting, built to feel like one product.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {col.title}
              </p>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm hover:text-white">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 py-8 text-xs sm:flex-row">
          <p>© {new Date().getFullYear()} DOMNI. All rights reserved.</p>
          <p>Made for campuses everywhere.</p>
        </div>
      </div>
    </footer>
  );
}
