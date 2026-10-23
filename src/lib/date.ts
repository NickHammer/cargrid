/**
 * Date helpers for the daily rotation.
 *
 * The grid must roll over at the player's local midnight. `toISOString()`
 * returns the UTC date, which would flip the grid at 8pm ET — so build the
 * date string from local calendar fields instead.
 */

export function localDateString(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Milliseconds until the next local midnight. */
export function msUntilNextLocalDay(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

/** "2026-10-22" -> "October 22, 2026", parsed as a local date, not UTC. */
export function formatDisplayDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
