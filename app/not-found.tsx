import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <p className="font-display text-7xl font-bold text-violet-200">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink-800">We couldn&apos;t find that page</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">The link may be incomplete, or the event may have been unpublished or removed.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/events" className="inline-flex h-11 items-center rounded-full bg-domni-gradient px-6 text-sm font-semibold text-white">
          Browse events
        </Link>
        <Link href="/" className="inline-flex h-11 items-center rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-ink-800">
          Home
        </Link>
      </div>
    </main>
  );
}
