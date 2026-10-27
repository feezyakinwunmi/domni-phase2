const orgs = [
  "UNILAG Students' Union",
  "Covenant Ent. Society",
  "OAU Convocation",
  "LASU Faculty of Eng.",
  "Babcock Media Guild",
  "UI Alumni Network",
];

export function TrustedBy() {
  return (
    <section className="border-b border-slate-100 bg-white py-14">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs font-medium uppercase tracking-wide text-slate-400">
          Trusted by organizers across campuses
        </p>
        <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
          {orgs.map((org) => (
            <div
              key={org}
              className="flex items-center justify-center text-center text-sm font-semibold text-slate-300 grayscale transition-all hover:text-slate-500 hover:grayscale-0"
            >
              {org}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
