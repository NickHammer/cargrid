/**
 * Thin analytics shim.
 *
 * The site is a static export with no server, so anything beyond raw traffic
 * counts has to be sent from the browser to a third party. This module is the
 * single place that knows which third party — the game calls `track()` and
 * never imports a vendor SDK, so swapping providers is a change to this file
 * and an environment variable, not a change to gameplay code.
 *
 * It is deliberately a no-op when no provider is configured, so local dev and
 * preview builds send nothing and the game works with analytics switched off.
 *
 * Configure at build time (static export inlines these):
 *   NEXT_PUBLIC_ANALYTICS=plausible|umami|ga|none
 *   NEXT_PUBLIC_ANALYTICS_SITE=<domain or site id the provider issues>
 *   NEXT_PUBLIC_ANALYTICS_SRC=<script url, for self-hosted Plausible/Umami>
 *   NEXT_PUBLIC_ANALYTICS_DOMAINS=<comma-separated hostnames to report from>
 */

export type AnalyticsProvider = "plausible" | "umami" | "ga" | "none";

export const provider: AnalyticsProvider =
  (process.env.NEXT_PUBLIC_ANALYTICS as AnalyticsProvider) || "none";

export const siteId = process.env.NEXT_PUBLIC_ANALYTICS_SITE ?? "";
export const scriptSrc = process.env.NEXT_PUBLIC_ANALYTICS_SRC ?? "";

/**
 * Hostnames the tracker is allowed to report from.
 *
 * Netlify applies site environment variables to *every* deploy context, so
 * without this a deploy preview or branch build reports into the same site as
 * production and quietly inflates it. Umami drops events from any host not
 * listed here, which keeps the numbers to the real domain.
 */
export const allowedDomains = process.env.NEXT_PUBLIC_ANALYTICS_DOMAINS ?? "";

export const analyticsEnabled = provider !== "none" && Boolean(siteId);

/** Event names kept in one union so a typo cannot silently create a new metric. */
export type GameEvent =
  | "grid_opened"
  | "guess_correct"
  | "guess_incorrect"
  | "grid_completed"
  | "archive_opened"
  | "rollover_prompted";

type Props = Record<string, string | number | boolean>;

interface PlausibleWindow {
  plausible?: (event: string, opts?: { props?: Props }) => void;
  umami?: { track: (event: string, props?: Props) => void };
  gtag?: (command: string, event: string, props?: Props) => void;
}

/**
 * Record a gameplay event. Never throws and never blocks the UI — analytics
 * must not be able to break a turn, so every failure is swallowed.
 */
export function track(event: GameEvent, props: Props = {}): void {
  if (!analyticsEnabled || typeof window === "undefined") return;
  const w = window as unknown as PlausibleWindow;
  try {
    switch (provider) {
      case "plausible":
        w.plausible?.(event, { props });
        break;
      case "umami":
        w.umami?.track(event, props);
        break;
      case "ga":
        w.gtag?.("event", event, props);
        break;
    }
  } catch {
    // A blocked or failed beacon is not worth surfacing to the player.
  }
}
