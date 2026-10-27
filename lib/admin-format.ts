/** Client-safe formatting for admin views (no server imports). */
export function compactNaira(kobo: number) {
  const naira = kobo / 100;
  if (Math.abs(naira) >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(naira) >= 1_000) return `₦${(naira / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `₦${naira.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}
