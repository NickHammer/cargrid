/**
 * Site-wide constants that are not game data.
 */

/**
 * Where "Send feedback" goes.
 *
 * This is read from the environment so the address can be changed in the
 * Netlify build settings without a code change or a commit — `NEXT_PUBLIC_*`
 * values are inlined into the bundle at build time, which is exactly what a
 * static export needs. The fallback keeps `npm run dev` working for anyone who
 * has not set the variable.
 *
 * Whatever is set here is published in the page source of every page and will
 * be scraped, which is why it is a dedicated account rather than a personal
 * mailbox — it can be filtered, handed over, or abandoned without touching
 * anything else.
 */
export const FEEDBACK_EMAIL =
  process.env.NEXT_PUBLIC_FEEDBACK_EMAIL ?? "cargridgame@gmail.com";
