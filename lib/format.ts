// Server components render in the server's timezone (UTC on most hosts), which
// shifted every event time by an hour for Lagos. Format in a fixed zone instead.
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || "Africa/Lagos";
const LOCALE = "en-NG";

export function formatDate(date: Date | string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Date(date).toLocaleDateString(LOCALE, {
    timeZone: APP_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  });
}

export function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString(LOCALE, {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateTime(date: Date | string) {
  return `${formatDate(date)} · ${formatTime(date)}`;
}

export function formatNaira(kobo: number) {
  if (kobo === 0) return "Free";
  return `₦${(kobo / 100).toLocaleString(LOCALE, { maximumFractionDigits: 2 })}`;
}

/** Date → "YYYY-MM-DDTHH:mm" in the *browser's* timezone, for <input type="datetime-local">. */
export function toDateTimeLocal(date: Date | string | null | undefined) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
