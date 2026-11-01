"use client";

import { useRouter } from "next/navigation";

/**
 * A real back control for the Archive and Credits pages.
 *
 * It uses browser history when there is any to go back to, so returning from
 * /archive/2026-10-24 lands you back on the archive list rather than dumping
 * you on today's grid. When there is no history — someone opened the link
 * directly, or arrived from outside — `back()` would leave the site entirely,
 * so it falls through to the home page instead.
 */
export default function BackLink({ fallback = "/", label = "Back" }: { fallback?: string; label?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold"
      aria-label={label}
    >
      <span aria-hidden="true">←</span>
      {label}
    </button>
  );
}
